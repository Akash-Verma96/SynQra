import {SESSION_COOKIE_NAME,} from "../utils/session.utils.js";

import {validateSession,} from "../services/session.service.js";

export const requireAuth = async (req, res, next) => {
  try {
    // 1. Extract session token from cookie
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 2. Validate session against PostgreSQL
    const session = await validateSession(sessionToken);

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session",
      });
    }

    // 3. Attach authenticated user to request
    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      avatarUrl: session.user.avatarUrl,
    };

    req.session = {
      id: session.sessionId,
      expiresAt: session.expiresAt,
    };

    // 4. Continue to controller
    next();

  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal authentication error",
    });
  }
};
