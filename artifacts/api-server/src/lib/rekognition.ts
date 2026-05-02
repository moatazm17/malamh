/**
 * AWS Rekognition service wrapper.
 * Handles image compression, face indexing, face search, and liveness detection.
 */

import {
  RekognitionClient,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DetectFacesCommand,
  DeleteFacesCommand,
  CreateCollectionCommand,
} from "@aws-sdk/client-rekognition";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB AWS limit

function getClient(): RekognitionClient {
  return new RekognitionClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export function getCollectionId(): string {
  return process.env.AWS_REKOGNITION_COLLECTION || "malamh-faces";
}

/**
 * Compress image to JPEG, max 5MB, max 1920x1080.
 * Falls back to lower quality if still too large.
 */
export async function compressImage(imageBytes: Buffer): Promise<Buffer> {
  const metadata = await sharp(imageBytes).metadata();
  const needsResize =
    (metadata.width ?? 0) > 1920 || (metadata.height ?? 0) > 1080;

  let compressed = await sharp(imageBytes)
    .resize(needsResize ? 1920 : undefined, needsResize ? 1080 : undefined, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  if (compressed.length > MAX_IMAGE_BYTES) {
    compressed = await sharp(imageBytes)
      .resize(1280, 720, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();
  }

  return compressed;
}

export interface DetectFacesResult {
  faceCount: number;
  hasOneFace: boolean;
  confidence: number;
}

/**
 * Run liveness/presence detection on an image.
 * Returns how many faces were detected and the top confidence score.
 */
export async function detectFaces(
  imageBytes: Buffer,
): Promise<DetectFacesResult> {
  const client = getClient();
  const compressed = await compressImage(imageBytes);

  const result = await client.send(
    new DetectFacesCommand({
      Image: { Bytes: compressed },
      Attributes: ["DEFAULT"],
    }),
  );

  const faces = result.FaceDetails ?? [];
  return {
    faceCount: faces.length,
    hasOneFace: faces.length === 1,
    confidence: faces[0]?.Confidence ?? 0,
  };
}

export interface IndexFaceResult {
  awsFaceId: string;
  confidence: number;
}

/**
 * Index a face into the Rekognition collection.
 * Returns the AWS FaceId for later lookup.
 * externalImageId should be the Malamh face record ID.
 */
export async function indexFace(
  imageBytes: Buffer,
  externalImageId: string,
): Promise<IndexFaceResult> {
  const client = getClient();
  const compressed = await compressImage(imageBytes);

  const result = await client.send(
    new IndexFacesCommand({
      CollectionId: getCollectionId(),
      Image: { Bytes: compressed },
      ExternalImageId: externalImageId,
      MaxFaces: 1,
      QualityFilter: "AUTO",
      DetectionAttributes: ["DEFAULT"],
    }),
  );

  const faceRecord = result.FaceRecords?.[0]?.Face;
  if (!faceRecord?.FaceId) {
    throw new Error(
      "No face detected or face quality too low. Please use a clear, front-facing photo.",
    );
  }

  return {
    awsFaceId: faceRecord.FaceId,
    confidence: faceRecord.Confidence ?? 0,
  };
}

export interface SearchResult {
  awsFaceId: string;
  similarity: number;
}

/**
 * Search the collection for a face matching the query image.
 * Returns the best match above 80% similarity, or null.
 */
export async function searchFacesByImage(
  imageBytes: Buffer,
): Promise<SearchResult | null> {
  const client = getClient();
  const compressed = await compressImage(imageBytes);

  try {
    const result = await client.send(
      new SearchFacesByImageCommand({
        CollectionId: getCollectionId(),
        Image: { Bytes: compressed },
        MaxFaces: 1,
        FaceMatchThreshold: 80,
      }),
    );

    const match = result.FaceMatches?.[0];
    if (!match?.Face?.FaceId || !match.Similarity) return null;

    return {
      awsFaceId: match.Face.FaceId,
      similarity: match.Similarity / 100, // normalize 0–100 → 0–1
    };
  } catch (err: any) {
    // Thrown when no face is detected in the query image
    if (err.name === "InvalidParameterException") return null;
    throw err;
  }
}

/**
 * Remove a face from the Rekognition collection when the face record is deleted.
 */
export async function deleteFaceFromCollection(
  awsFaceId: string,
): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteFacesCommand({
      CollectionId: getCollectionId(),
      FaceIds: [awsFaceId],
    }),
  );
}

/**
 * Idempotently ensure the Rekognition collection exists.
 * Call once on server startup.
 */
export async function ensureCollectionExists(): Promise<void> {
  const client = getClient();
  try {
    await client.send(
      new CreateCollectionCommand({ CollectionId: getCollectionId() }),
    );
  } catch (err: any) {
    if (err.name === "ResourceAlreadyExistsException") return;
    throw err;
  }
}
