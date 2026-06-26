export interface CloudinaryUploadResponse {
  asset_id:          string;
  public_id:         string;
  secure_url:        string;
  url:               string;
  original_filename: string;
  bytes:             number;
  format:            string;
  resource_type:     string;
  created_at:        string;
}

export interface UploadProgress {
  loaded:  number;
  total:   number;
  percent: number;
}

const CLOUD_NAME     = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET  = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

export async function uploadImageToCloudinary(
  file:        File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<CloudinaryUploadResponse> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET in .env"
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append("file",          file);
  formData.append("upload_preset", UPLOAD_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded:  e.loaded,
          total:   e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
        if (!data.secure_url) {
          reject(new Error("Cloudinary response missing secure_url"));
          return;
        }
        resolve(data);
      } else {
        try {
          const err = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          reject(new Error(err?.error?.message ?? `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.send(formData);
  });
}