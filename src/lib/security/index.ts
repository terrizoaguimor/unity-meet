/**
 * Unity Shield Security Integration
 *
 * Provides security middleware for Unity Meet application including:
 * - IP Blocklist checking
 * - Rate limiting
 * - Honeypot detection
 * - Security telemetry
 */

export { getShield, shutdownShield, getShieldHealth } from './shield';
export { withShield, protectRoutes } from './withShield';
