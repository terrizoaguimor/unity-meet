/**
 * Video Quality Presets for Unity Meet
 * Configures video resolution, framerate, and bitrate for different scenarios
 */

export type QualityPreset = 'auto' | 'high' | 'medium' | 'low';

export interface VideoQualityConfig {
  width: number;
  height: number;
  frameRate: number;
  maxBitrate?: number;
  label: string;
  description: string;
}

export interface AudioQualityConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate?: number;
}

export const VIDEO_QUALITY_PRESETS: Record<QualityPreset, VideoQualityConfig> = {
  auto: {
    width: 1280,
    height: 720,
    frameRate: 30,
    label: 'Auto',
    description: 'Ajusta automáticamente según tu conexión',
  },
  high: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 4000000, // 4 Mbps
    label: 'Alta (1080p)',
    description: 'Mejor calidad - requiere buena conexión',
  },
  medium: {
    width: 1280,
    height: 720,
    frameRate: 30,
    maxBitrate: 2500000, // 2.5 Mbps
    label: 'Media (720p)',
    description: 'Balance entre calidad y rendimiento',
  },
  low: {
    width: 640,
    height: 480,
    frameRate: 24,
    maxBitrate: 1000000, // 1 Mbps
    label: 'Baja (480p)',
    description: 'Ahorro de datos - conexiones lentas',
  },
};

export const AUDIO_QUALITY_CONFIG: AudioQualityConfig = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
};

/**
 * Get media constraints for a specific quality preset
 */
export function getMediaConstraints(
  preset: QualityPreset,
  deviceIds?: { audioId?: string; videoId?: string }
): MediaStreamConstraints {
  const videoConfig = VIDEO_QUALITY_PRESETS[preset];

  return {
    audio: {
      ...AUDIO_QUALITY_CONFIG,
      ...(deviceIds?.audioId && { deviceId: { exact: deviceIds.audioId } }),
    },
    video: {
      width: { ideal: videoConfig.width },
      height: { ideal: videoConfig.height },
      frameRate: { ideal: videoConfig.frameRate },
      facingMode: 'user',
      ...(deviceIds?.videoId && { deviceId: { exact: deviceIds.videoId } }),
    },
  };
}

/**
 * Determine recommended quality based on network conditions
 */
export function getRecommendedQuality(metrics: {
  bandwidth?: number; // in kbps
  packetLoss?: number; // percentage
  latency?: number; // in ms
}): QualityPreset {
  const { bandwidth = 5000, packetLoss = 0, latency = 50 } = metrics;

  // Poor network: high packet loss or very high latency
  if (packetLoss > 5 || latency > 300) {
    return 'low';
  }

  // Limited bandwidth
  if (bandwidth < 1500) {
    return 'low';
  }

  if (bandwidth < 3000 || latency > 150) {
    return 'medium';
  }

  // Good network conditions
  if (bandwidth > 5000 && latency < 100 && packetLoss < 1) {
    return 'high';
  }

  return 'medium';
}

/**
 * Network quality levels for UI indicators
 */
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'bad';

export interface NetworkQualityInfo {
  level: NetworkQuality;
  bars: 1 | 2 | 3 | 4 | 5;
  color: string;
  label: string;
}

export function getNetworkQualityInfo(metrics: {
  bandwidth?: number;
  packetLoss?: number;
  latency?: number;
}): NetworkQualityInfo {
  const { bandwidth = 5000, packetLoss = 0, latency = 50 } = metrics;

  // Calculate quality score (0-100)
  let score = 100;

  // Bandwidth impact (max -40 points)
  if (bandwidth < 1000) score -= 40;
  else if (bandwidth < 2000) score -= 30;
  else if (bandwidth < 3000) score -= 20;
  else if (bandwidth < 5000) score -= 10;

  // Packet loss impact (max -30 points)
  if (packetLoss > 10) score -= 30;
  else if (packetLoss > 5) score -= 20;
  else if (packetLoss > 2) score -= 10;
  else if (packetLoss > 0.5) score -= 5;

  // Latency impact (max -30 points)
  if (latency > 500) score -= 30;
  else if (latency > 300) score -= 20;
  else if (latency > 150) score -= 10;
  else if (latency > 100) score -= 5;

  if (score >= 90) {
    return { level: 'excellent', bars: 5, color: '#22c55e', label: 'Excelente' };
  }
  if (score >= 70) {
    return { level: 'good', bars: 4, color: '#84cc16', label: 'Buena' };
  }
  if (score >= 50) {
    return { level: 'fair', bars: 3, color: '#eab308', label: 'Regular' };
  }
  if (score >= 30) {
    return { level: 'poor', bars: 2, color: '#f97316', label: 'Mala' };
  }
  return { level: 'bad', bars: 1, color: '#ef4444', label: 'Muy mala' };
}
