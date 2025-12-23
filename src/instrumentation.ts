export async function register() {
  // Allow self-signed certificates for DigitalOcean managed database
  if (process.env.NODE_ENV === 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  // Initialize Unity Shield Auto-Protect (server-side only)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Shield Auto-Protect automatically:
      // ✅ Detects app name from package.json
      // ✅ Injects into Express/Next.js
      // ✅ Sends telemetry to Sentinel
      // ✅ Handles graceful shutdown
      await import('@unityfinancialnetwork/shield-middleware/auto');
    } catch (error) {
      console.error('[Shield] Auto-protect initialization failed:', error);
    }
  }
}
