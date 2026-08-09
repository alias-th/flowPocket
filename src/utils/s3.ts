import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { fileTypeFromBuffer, FileTypeResult } from "file-type";
import { DeleteImageFileError, InvalidImageFileError } from "./app-error";

interface UploadFile {
  filename: string;
  buffer: Buffer;
  size: number;
}
interface UploadFileWithMime extends UploadFile {
  detectedType: FileTypeResult;
}
export interface UploadedImage {
  key: string;
  filename: string;
  mimeType: string;
  size: number;
}
type Options = {
  files: UploadFile[];
  bucketName: string;
};

const deleteFromS3 = async (
  s3Client: S3Client,
  bucketName: string,
  keys: string[],
): Promise<void> => {
  if (keys.length === 0) return;

  const result = await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
        Quiet: true,
      },
    }),
  );

  if (result.Errors && result.Errors.length > 0) {
    throw new DeleteImageFileError();
  }
};

const uploadToS3 = async (
  s3Client: S3Client,
  opt: Options,
): Promise<UploadedImage[]> => {
  const uploadedImage: UploadedImage[] = [];

  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  const correctFiles: UploadFileWithMime[] = [];

  // Validate all files
  for (const file of opt.files) {
    const detectedType = await fileTypeFromBuffer(file.buffer);
    if (!detectedType || !allowedMimeTypes.has(detectedType.mime)) {
      throw new InvalidImageFileError();
    }

    correctFiles.push({ ...file, detectedType });
  }

  // Upload all files
  for (const file of correctFiles) {
    const fileKey = `${randomUUID()}.${file.detectedType.ext}`;

    const uploadParams = {
      Bucket: opt.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.detectedType.mime,
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      uploadedImage.push({
        key: fileKey,
        filename: file.filename,
        mimeType: file.detectedType.mime,
        size: file.size,
      });
    } catch (error) {
      console.error("Error uploading to S3:", error);

      if (uploadedImage.length > 0) {
        await deleteFromS3(
          s3Client,
          opt.bucketName,
          uploadedImage.map((image) => image.key),
        );
      }

      throw error;
    }
  }

  return uploadedImage;
};

export { deleteFromS3, uploadToS3 };
