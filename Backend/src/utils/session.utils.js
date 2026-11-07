
export const SESSION_COOKIE_NAME = "synqra_session";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sameSite = process.env.SESSION_COOKIE_SAME_SITE || "lax";

const secure =
  process.env.SESSION_COOKIE_SECURE === "true" ||
  process.env.NODE_ENV === "production";

// SameSite=None requires Secure.
if (sameSite === "none" && !secure) {
  throw new Error(
    "SESSION_COOKIE_SECURE must be true when SameSite is none"
  );
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure,
  sameSite,
  path: "/",
  maxAge: SESSION_TTL_MS,
};

export const clearSessionCookieOptions = {
  httpOnly: true,
  secure,
  sameSite,
  path: "/",
};
