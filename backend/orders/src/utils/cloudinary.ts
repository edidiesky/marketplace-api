import { v2 as cloudinary } from "cloudinary";
import { Buffer } from "buffer";
import logger from "./logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  publicId: string
): Promise<string> {
  if (!buffer || buffer.length === 0) throw new Error("Empty PDF buffer");
  if (!(buffer instanceof Buffer)) throw new Error("Invalid buffer type");

  const sanitizedPublicId = publicId.replace(/[^a-zA-Z0-9-_]/g, "_");

  logger.info("Uploading receipt buffer", { size: buffer.length, publicId: sanitizedPublicId });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: sanitizedPublicId,
        folder: "selleasi/receipts",
        format: "pdf",
        type: "upload",
        access_mode: "public",
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload failed", {
            error: error.message,
            code: error.http_code,
            publicId: sanitizedPublicId,
          });
          return reject(error);
        }
        if (!result?.secure_url) {
          return reject(new Error("No secure_url in Cloudinary response"));
        }
        logger.info("Receipt uploaded to Cloudinary", {
          publicId: sanitizedPublicId,
          url: result.secure_url,
        });
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
      invalidate: true,
    });
    return result.result === "ok" || result.result === "not found";
  } catch (error: any) {
    logger.error("Cloudinary delete failed", { error: error.message, publicId });
    return false;
  }
}