import app from "./app";
import { logger } from "./lib/logger";
import { isAwsEnabled } from "./lib/face-service";
import { ensureCollectionExists, getCollectionId } from "./lib/rekognition";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  // Ensure the Rekognition collection exists before accepting traffic
  if (isAwsEnabled()) {
    try {
      await ensureCollectionExists();
      logger.info(
        { collection: getCollectionId() },
        "AWS Rekognition collection ready",
      );
    } catch (err) {
      logger.error({ err }, "Failed to initialize AWS Rekognition collection — check credentials and region");
      // Don't exit; fall back to mock mode gracefully
    }
  } else {
    logger.warn("AWS credentials not set — running in mock face-matching mode");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port, awsEnabled: isAwsEnabled() }, "Server listening");
  });
}

start();
