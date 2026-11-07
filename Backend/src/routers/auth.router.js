import express from 'express'
import { googleCallback, googleLogin, getMe, logout } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js';

const authRouter = express.Router()

authRouter.get("/google", googleLogin);
authRouter.get("/google/callback", googleCallback);

authRouter.get("/protected", requireAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated successfully",
    user: req.user,
  });
});

// Get current authenticated user
authRouter.get("/me", requireAuth, getMe);

// Logout current session
authRouter.post("/logout", logout);

export default authRouter;