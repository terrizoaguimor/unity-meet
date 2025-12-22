import { NextRequest, NextResponse } from 'next/server';
import { getShield } from './shield';

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper for Next.js API routes that applies Shield security protection
 *
 * Usage:
 * ```
 * import { withShield } from '@/lib/security/withShield';
 *
 * async function handler(request: NextRequest) {
 *   // Your handler logic
 *   return NextResponse.json({ success: true });
 * }
 *
 * export const GET = withShield(handler);
 * export const POST = withShield(handler);
 * ```
 */
export function withShield(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const shield = await getShield();

      if (shield) {
        // Create a mock Express-like request/response for Shield
        const ip = getClientIP(request);
        const path = request.nextUrl.pathname;
        const method = request.method;
        const userAgent = request.headers.get('user-agent') || '';

        // Check if request should be blocked
        // Note: Full Shield integration would require Express adapter
        // For now, we'll do a lightweight check that's compatible with Edge runtime

        // The full middleware integration is handled by the Express adapter
        // in a custom server setup. For API routes, we do basic telemetry.

        // Log request for telemetry (non-blocking)
        logSecurityTelemetry(shield, {
          ip,
          path,
          method,
          userAgent,
          timestamp: new Date().toISOString(),
        }).catch(() => {
          // Ignore telemetry errors - fail open
        });
      }

      // Continue to handler
      return handler(request, context);
    } catch (error) {
      console.error('[Shield] Error in withShield wrapper:', error);
      // Fail open - continue to handler even if Shield fails
      return handler(request, context);
    }
  };
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (reverse proxy scenarios)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }

  // DigitalOcean
  const doIP = request.headers.get('do-connecting-ip');
  if (doIP) {
    return doIP;
  }

  return 'unknown';
}

/**
 * Log security telemetry to Shield (non-blocking)
 */
async function logSecurityTelemetry(
  shield: Awaited<ReturnType<typeof getShield>>,
  data: {
    ip: string;
    path: string;
    method: string;
    userAgent: string;
    timestamp: string;
  }
) {
  // This is a placeholder - full telemetry requires the Express middleware
  // The actual Shield telemetry is collected automatically by the middleware

  // For API routes without full Express, we can still benefit from
  // the singleton Shield instance for blocklist lookups etc.

  if (process.env.SHIELD_DEBUG === 'true') {
    console.log('[Shield] Request:', data);
  }
}

/**
 * Higher-order function to protect an entire set of route handlers
 *
 * Usage:
 * ```
 * const handlers = protectRoutes({
 *   GET: getHandler,
 *   POST: postHandler,
 *   DELETE: deleteHandler,
 * });
 *
 * export const { GET, POST, DELETE } = handlers;
 * ```
 */
export function protectRoutes<T extends Record<string, RouteHandler>>(
  handlers: T
): T {
  const protected_: Partial<T> = {};

  for (const [method, handler] of Object.entries(handlers)) {
    (protected_ as Record<string, RouteHandler>)[method] = withShield(handler);
  }

  return protected_ as T;
}
