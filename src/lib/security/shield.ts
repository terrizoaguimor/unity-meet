import { createShield, Shield, ShieldConfig } from '@unityfinancialnetwork/shield-middleware';

let shieldInstance: Shield | null = null;
let initPromise: Promise<Shield> | null = null;

/**
 * Get or initialize the Shield security middleware instance
 * Uses singleton pattern to ensure single instance across all API routes
 */
export async function getShield(): Promise<Shield | null> {
  // Skip Shield in development if no config
  if (!process.env.SHIELD_API_KEY || !process.env.REDIS_URL) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Shield] Skipping - missing SHIELD_API_KEY or REDIS_URL');
    }
    return null;
  }

  if (shieldInstance) {
    return shieldInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = initializeShield();
  shieldInstance = await initPromise;
  return shieldInstance;
}

async function initializeShield(): Promise<Shield> {
  const config: ShieldConfig = {
    appId: process.env.SHIELD_APP_ID || 'unity-meet',
    sentinelUrl: process.env.SENTINEL_URL || 'https://unity-sentinel-u8gbx.ondigitalocean.app/api',
    apiKey: process.env.SHIELD_API_KEY!,
    redisUrl: process.env.REDIS_URL!,

    // Fail-open for high availability
    failOpen: true,

    // Circuit breaker settings
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 30000,

    // Telemetry
    telemetryBatchSize: 100,
    telemetryFlushMs: 5000,

    // Skip health endpoints
    excludePaths: ['/health', '/ready', '/api/health'],

    // Debug in development
    debug: process.env.NODE_ENV === 'development',
  };

  try {
    const shield = await createShield(config);
    console.log('[Shield] Security middleware initialized successfully');
    return shield;
  } catch (error) {
    console.error('[Shield] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Shutdown Shield gracefully (for app cleanup)
 */
export async function shutdownShield(): Promise<void> {
  if (shieldInstance) {
    await shieldInstance.shutdown();
    shieldInstance = null;
    initPromise = null;
    console.log('[Shield] Shutdown complete');
  }
}

/**
 * Check Shield health status
 */
export async function getShieldHealth(): Promise<{
  redis: boolean;
  sentinel: boolean;
  circuitBreaker: string;
} | null> {
  const shield = await getShield();
  if (!shield) return null;
  return shield.isHealthy();
}
