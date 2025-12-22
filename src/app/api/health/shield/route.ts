import { NextResponse } from 'next/server';
import { getShieldHealth } from '@/lib/security';

/**
 * GET /api/health/shield
 * Returns Shield security middleware health status
 */
export async function GET() {
  try {
    const health = await getShieldHealth();

    if (!health) {
      return NextResponse.json({
        status: 'disabled',
        message: 'Shield is not configured (missing SHIELD_API_KEY or REDIS_URL)',
      });
    }

    const isHealthy = health.redis && health.sentinel && health.circuitBreaker === 'CLOSED';

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      components: health,
      timestamp: new Date().toISOString(),
    }, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('[Shield Health] Error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
    });
  }
}
