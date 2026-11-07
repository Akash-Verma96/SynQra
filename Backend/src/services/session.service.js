
import { createHash, randomBytes } from "node:crypto";
import prisma from "../lib/prisma.js";
import { SESSION_TTL_MS } from "../utils/session.utils.js";

// Generate SHA-256 hash
const hashSessionToken = (token) => {
  return createHash("sha256")
    .update(token)
    .digest("hex");
};

// Create persistent session
export const createSession = async (userId) => {
  const sessionToken = randomBytes(32).toString("base64url");

  const tokenHash = hashSessionToken(sessionToken);

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  // Return original token only to the caller.
  return {
    sessionToken,
    expiresAt,
  };
};

// Validate session
export const validateSession = async (sessionToken) => {
  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  // Reject expired sessions
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return {
    sessionId: session.id,
    user: session.user,
    expiresAt: session.expiresAt,
  };
};

// Revoke session
export const revokeSession = async (sessionToken) => {
  if (!sessionToken) {
    return false;
  }

  const tokenHash = hashSessionToken(sessionToken);

  const result = await prisma.session.deleteMany({
    where: {
      tokenHash,
    },
  });

  return result.count > 0;
};

// Clean up expired sessions
export const cleanupExpiredSessions = async () => {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  return result.count;
};
