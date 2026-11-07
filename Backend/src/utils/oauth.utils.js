import crypto from "node:crypto";

export const generateOAuthState = () => {
  return crypto.randomBytes(32).toString("hex");
};