import crypto from "crypto";

export function cuid(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString("hex");
  return `c${timestamp}${random}`;
}

export function generateApiKey(): string {
  const hex = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  return `mlm_${hex}`;
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
