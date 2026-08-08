import crypto from "node:crypto";

export function generateSessionToken(secret: string): {
  rawToken: string;
  hashedToken: string;
} {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const hashedToken = hashToken(rawToken, secret);
  return {
    rawToken,
    hashedToken,
  };
}

export function hashToken(token: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}
