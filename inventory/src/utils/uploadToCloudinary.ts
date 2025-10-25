import { v2 as cloudinary } from "cloudinary";
import { Buffer } from "buffer";
import logger from "./logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export async function uploadToCloudinary(
  photoUrl: string,
  publicId: string
): Promise<string> {
  if (!photoUrl || !photoUrl.startsWith("data:image/jpeg;base64,")) {
    logger.warn("Skipping Cloudinary upload: Invalid or missing photo URL", {
      publicId,
    });
    return "";
  }
  const base64Data = photoUrl.replace(/^data:image\/jpeg;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  if (!buffer || buffer.length === 0) {
    logger.warn("Skipping Cloudinary upload: Empty image buffer", { publicId });
    return "";
  }

  const sanitizedPublicId = publicId.replace(/[^a-zA-Z0-9-_]/g, "_");
  logger.info("Uploading image with size:", { size: buffer.length, publicId });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: sanitizedPublicId,
        folder: "tcc",
        format: "jpg",
        type: "upload",
        access_mode: "public",
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload failed", {
            error: error.message,
            code: error.http_code,
            details: error,
            publicId: sanitizedPublicId,
          });
          return reject(error);
        }
        if (!result?.secure_url) {
          logger.error("No secure_url in Cloudinary response", { result });
          return reject(new Error("Failed to upload image to Cloudinary"));
        }
        logger.info("Image uploaded to Cloudinary", {
          publicId: sanitizedPublicId,
          url: result.secure_url,
        });
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
