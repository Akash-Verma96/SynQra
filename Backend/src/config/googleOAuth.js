import { serverConfig } from "./index.js";
import { OAuth2Client } from "google-auth-library";


const googleClient = new OAuth2Client(
  serverConfig.postgres.GOOGLE_CLIENT_ID,
  serverConfig.postgres.GOOGLE_CLIENT_SECRET,
  serverConfig.postgres.GOOGLE_CALLBACK_URL
);

export default googleClient;