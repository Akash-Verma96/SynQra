import express from 'express'
import { googleCallback, googleLogin } from '../controllers/auth.controller.js'

const authRouter = express.Router()

authRouter.get("/google", googleLogin);
authRouter.get("/google/callback", googleCallback);

export default authRouter;