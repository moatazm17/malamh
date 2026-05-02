/**
 * Face embedding and matching service.
 * Primary: AWS Rekognition (when AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION are set)
 * Fallback: Deterministic mock embeddings for demo / local dev
 */

export function isAwsEnabled(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
}

export function isMockMode(): boolean {
  return process.env.USE_MOCK_FACES === "true" || !isAwsEnabled();
}

const EMBEDDING_DIM = 512;
const MATCH_THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD || "0.55");

/**
 * Generate a deterministic mock embedding from image bytes.
 * Uses a simple hash to produce consistent results for the same image.
 * Only used when AWS is not configured.
 */
export function mockEmbedding(imageBytes: Buffer): number[] {
  const embedding = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < imageBytes.length && i < EMBEDDING_DIM * 4; i++) {
    embedding[i % EMBEDDING_DIM] += imageBytes[i] / 255.0;
  }
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
  return embedding.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface MatchCandidate {
  id: string;
  embedding: string;
  awsFaceId: string | null;
  consentLevel: string;
  userId: string;
}

export interface MatchResult {
  matched: boolean;
  faceId: string | null;
  userId: string | null;
  consentLevel: string | null;
  score: number;
}

/**
 * Mock-mode matching: cosine similarity across all stored embeddings.
 * Only called when AWS is not configured.
 */
export function matchAgainstRegistry(
  queryEmbedding: number[],
  candidates: MatchCandidate[],
  threshold = MATCH_THRESHOLD,
): MatchResult {
  let bestScore = 0;
  let bestCandidate: MatchCandidate | null = null;

  for (const candidate of candidates) {
    try {
      const emb = JSON.parse(candidate.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, emb);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    } catch {
      // skip malformed embeddings
    }
  }

  if (bestCandidate && bestScore >= threshold) {
    return {
      matched: true,
      faceId: bestCandidate.id,
      userId: bestCandidate.userId,
      consentLevel: bestCandidate.consentLevel,
      score: bestScore,
    };
  }

  return { matched: false, faceId: null, userId: null, consentLevel: null, score: bestScore };
}

export { MATCH_THRESHOLD };
