import googleClient from "../config/googleOauth.js";
import { serverConfig } from "../config/index.js";
import { generateOAuthState } from "../utils/oauth.utils.js";
import { findOrCreateGoogleUser } from "../services/auth.service.js";

export const googleLogin = (req, res) => {
  const state = generateOAuthState();

  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
      secure: process.env.NODE_ENV === "production",
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

    return res.status(200).json({
    success: true,
    message: "User authenticated successfully",
    user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
    },
    });

  } catch (error) {
    console.error("Google OAuth callback error:", error);

    return res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};