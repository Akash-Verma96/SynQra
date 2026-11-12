import googleClient from "../config/googleOAuth.js";
import { serverConfig } from "../config/index.js";
import { generateOAuthState } from "../utils/oauth.utils.js";
import { findOrCreateGoogleUser } from "../services/auth.service.js";
import { createSession } from "../services/session.service.js";
import {SESSION_COOKIE_NAME,sessionCookieOptions,clearSessionCookieOptions} from "../utils/session.utils.js";
import {revokeSession,} from "../services/session.service.js";

const isProduction = serverConfig.APP_ENV === "production";

export const googleLogin = (req, res) => {
  const state = generateOAuthState();

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
    path: "/",
  });

  const authorizationUrl = googleClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
  });

  return res.redirect(authorizationUrl);
};

const FRONTEND_URL = serverConfig.frontendUrl;

export const googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies.oauth_state;

    // Validate OAuth state
    if (!state || !storedState || state !== storedState) {
      return res.status(403).json({
        success: false,
        message: "Invalid OAuth state",
      });
    }

    // Clear OAuth state cookie
    res.clearCookie("oauth_state", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    });

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing",
      });
    }

    // Exchange authorization code
    const { tokens } = await googleClient.getToken(code);

    if (!tokens.id_token) {
      throw new Error("Google ID token not received");
    }

    // Verify Google identity
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: serverConfig.postgres.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        success: false,
        message: "Google account verification failed",
      });
    }

    const user = await findOrCreateGoogleUser(payload);

    const { sessionToken } = await createSession(user.id);

    // Set authentication cookie
    res.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      sessionCookieOptions
    );

    return res.redirect(`${FRONTEND_URL}/?auth=success`);
  } catch (error) {
    console.error("Google OAuth callback error:", error);

    return res.redirect(`${FRONTEND_URL}/?auth=failed`);
  }
};

// Return authenticated user
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};


export const logout = async (req, res) => {
  try {
    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (sessionToken) {
      await revokeSession(sessionToken);
    }

    // Clear authentication cookie
    res.clearCookie(
      SESSION_COOKIE_NAME,
      clearSessionCookieOptions
    );

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete logout",
    });
  }
};
