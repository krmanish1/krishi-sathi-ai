import { useState } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { postQueryImage } from "@/shared/api";
import type { ImagePurpose } from "./guessImagePurpose";

export type ImageAttachment = {
  pickedUri: string | null;
  isUploading: boolean;
  uploadError: string | null;
  pickImage: (source: "camera" | "gallery") => Promise<void>;
  clearImage: () => void;
  upload: (farmerId: string, purpose: ImagePurpose) => Promise<string>;
};

export function useImageAttachment(): ImageAttachment {
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const pickImage = async (source: "camera" | "gallery") => {
    const fn =
      source === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;
    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri);
      setUploadError(null);
    }
  };

  const clearImage = () => {
    setPickedUri(null);
    setUploadError(null);
  };

  const upload = async (farmerId: string, purpose: ImagePurpose): Promise<string> => {
    if (!pickedUri) throw new Error("No image selected");
    setIsUploading(true);
    setUploadError(null);
    try {
      // On native, re-encode to JPEG so HEIC/PNG/etc from iOS gallery are accepted by the server
      let uploadUri = pickedUri;
      if (Platform.OS !== "web") {
        const manipulated = await ImageManipulator.manipulateAsync(
          pickedUri,
          [],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
        );
        uploadUri = manipulated.uri;
      }
      const result = await postQueryImage({ uri: uploadUri, farmerId, purpose });
      return result.image_ref;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setUploadError(msg);
      throw e;
    } finally {
      setIsUploading(false);
    }
  };

  return { pickedUri, isUploading, uploadError, pickImage, clearImage, upload };
}
