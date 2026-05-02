/**
 * POST /internal/liveness-frame
 *
 * Accept a single JPEG frame (base64), call DetectFaces with ALL attributes,
 * return face analysis data for the liveness challenge UI.
 */
import { Router } from "express";
import { requireSession } from "../lib/auth";
import { isMockMode } from "../lib/face-service";
import { compressImage } from "../lib/rekognition";
import {
  RekognitionClient,
  DetectFacesCommand,
} from "@aws-sdk/client-rekognition";
import { logger } from "../lib/logger";

const router = Router();

function getClient(): RekognitionClient {
  return new RekognitionClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

router.post("/internal/liveness-frame", requireSession, async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: "BadRequest", message: "imageBase64 required" });
    return;
  }

  const imageBytes = Buffer.from(
    imageBase64.replace(/^data:[^,]+,/, ""),
    "base64",
  );

  if (isMockMode()) {
    // Return random mock values for development without AWS
    res.json({
      faceDetected: true,
      smile: Math.random() > 0.5,
      smileConfidence: Math.random() * 100,
      yaw: (Math.random() - 0.5) * 60,
      pitch: (Math.random() - 0.5) * 30,
      roll: (Math.random() - 0.5) * 20,
      eyesOpen: true,
      eyesOpenConfidence: 95,
      brightness: 60 + Math.random() * 30,
      sharpness: 60 + Math.random() * 30,
      confidence: 95 + Math.random() * 5,
    });
    return;
  }

  try {
    const compressed = await compressImage(imageBytes);
    const client = getClient();
    const result = await client.send(
      new DetectFacesCommand({
        Image: { Bytes: compressed },
        Attributes: ["ALL"],
      }),
    );

    const face = result.FaceDetails?.[0];
    if (!face) {
      res.json({ faceDetected: false });
      return;
    }

    res.json({
      faceDetected: true,
      smile: face.Smile?.Value ?? false,
      smileConfidence: face.Smile?.Confidence ?? 0,
      yaw: face.Pose?.Yaw ?? 0,
      pitch: face.Pose?.Pitch ?? 0,
      roll: face.Pose?.Roll ?? 0,
      eyesOpen: face.EyesOpen?.Value ?? false,
      eyesOpenConfidence: face.EyesOpen?.Confidence ?? 0,
      brightness: face.Quality?.Brightness ?? 0,
      sharpness: face.Quality?.Sharpness ?? 0,
      confidence: face.Confidence ?? 0,
    });
  } catch (err: any) {
    logger.warn({ err }, "Liveness frame analysis failed");
    res.json({ faceDetected: false, error: err.message });
  }
});

export default router;
