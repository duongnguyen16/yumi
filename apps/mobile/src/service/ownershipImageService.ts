import api from "./aixos";

export type PendingOwnershipImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

const uploadImage = async (
  endpoint: string,
  image: PendingOwnershipImage,
) => {
  const formData = new FormData();
  formData.append("file", {
    uri: image.uri,
    name: image.fileName,
    type: image.mimeType,
  } as unknown as Blob);

  const response = await api.post(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.url as string;
};

export const uploadOwnershipImage = (image: PendingOwnershipImage) => {
  return uploadImage("/ownership-images/upload", image);
};

export const uploadAppealOwnershipImage = (
  image: PendingOwnershipImage,
) => {
  return uploadImage("/ownership-images/appeal/upload", image);
};
