const LOCAL_BACKEND_URL = 'http://localhost:3001'
const PRODUCTION_BACKEND_URL = 'https://synqra-rai9.onrender.com'

const requestedMode = (
  import.meta.env.VITE_APP_ENV ||
  (import.meta.env.PROD ? 'production' : 'local')
).toLowerCase()

if (!['local', 'production'].includes(requestedMode)) {
  throw new Error(`Invalid VITE_APP_ENV: ${requestedMode}. Use "local" or "production".`)
}

const isProduction = requestedMode === 'production'
const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL
const backendUrl = (
  configuredBackendUrl ||
  (isProduction ? PRODUCTION_BACKEND_URL : LOCAL_BACKEND_URL)
).replace(/\/$/, '')

export const appConfig = {
  mode: requestedMode,
  isProduction,
  backendUrl,
  apiBaseUrl: `${backendUrl}/api/v1`,
  uploadsBaseUrl: `${backendUrl}/uploads`,
}

export default appConfig
