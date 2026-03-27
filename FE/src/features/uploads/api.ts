import { apiClient } from "@/lib/api/client";

type UploadAssetResponse = {
  fileName: string;
  mimeType: string;
  url: string;
};

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient.postForm<UploadAssetResponse>("/uploads/images", formData);
}
