'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  NetworkQuality,
  NetworkQualityInfo,
  getNetworkQualityInfo,
  getRecommendedQuality,
  QualityPreset,
} from '@/lib/telnyx/qualityPresets';

export interface NetworkMetrics {
  bandwidth: number; // kbps
  packetLoss: number; // percentage
  latency: number; // ms (RTT)
  jitter: number; // ms
  timestamp: number;
}

export interface UseNetworkMetricsReturn {
  metrics: NetworkMetrics | null;
  quality: NetworkQualityInfo;
  recommendedPreset: QualityPreset;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

const DEFAULT_METRICS: NetworkMetrics = {
  bandwidth: 5000,
  packetLoss: 0,
  latency: 50,
  jitter: 5,
  timestamp: Date.now(),
};

const DEFAULT_QUALITY: NetworkQualityInfo = {
  level: 'good',
  bars: 4,
  color: '#84cc16',
  label: 'Buena',
};

/**
 * Hook para monitorear métricas de red en tiempo real
 * Utiliza la API de WebRTC para obtener estadísticas de conexión
 */
export function useNetworkMetrics(
  peerConnection?: RTCPeerConnection | null,
  interval = 2000
): UseNetworkMetricsReturn {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatsRef = useRef<{
    bytesReceived: number;
    packetsLost: number;
    packetsReceived: number;
    timestamp: number;
  } | null>(null);

  const collectMetrics = useCallback(async () => {
    if (!peerConnection) {
      // Si no hay conexión, simular métricas basadas en navigator.connection
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

      if (connection) {
        const bandwidth = connection.downlink ? connection.downlink * 1000 : 5000;
        const latency = connection.rtt || 50;

        setMetrics({
          bandwidth,
          packetLoss: 0,
          latency,
          jitter: 5,
          timestamp: Date.now(),
        });
      }
      return;
    }

    try {
      const stats = await peerConnection.getStats();
      let bytesReceived = 0;
      let packetsLost = 0;
      let packetsReceived = 0;
      let roundTripTime = 0;
      let jitter = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          bytesReceived += report.bytesReceived || 0;
          packetsLost += report.packetsLost || 0;
          packetsReceived += report.packetsReceived || 0;
          jitter = report.jitter ? report.jitter * 1000 : 0;
        }

        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime
            ? report.currentRoundTripTime * 1000
            : 0;
        }
      });

      const now = Date.now();
      const prev = previousStatsRef.current;

      if (prev) {
        const timeDiff = (now - prev.timestamp) / 1000; // seconds
        const bytesDiff = bytesReceived - prev.bytesReceived;
        const bandwidth = (bytesDiff * 8) / timeDiff / 1000; // kbps

        const totalPackets = packetsReceived - prev.packetsReceived;
        const lostPackets = packetsLost - prev.packetsLost;
        const packetLoss = totalPackets > 0 ? (lostPackets / totalPackets) * 100 : 0;

        setMetrics({
          bandwidth: Math.max(0, bandwidth),
          packetLoss: Math.max(0, Math.min(100, packetLoss)),
          latency: roundTripTime,
          jitter,
          timestamp: now,
        });
      }

      previousStatsRef.current = {
        bytesReceived,
        packetsLost,
        packetsReceived,
        timestamp: now,
      };
    } catch (error) {
      console.error('Error collecting network metrics:', error);
    }
  }, [peerConnection]);

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;

    setIsMonitoring(true);
    collectMetrics(); // Collect immediately

    intervalRef.current = setInterval(collectMetrics, interval);
  }, [collectMetrics, interval]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  // Auto-start monitoring when peer connection is available
  useEffect(() => {
    if (peerConnection) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [peerConnection, startMonitoring, stopMonitoring]);

  const quality = metrics
    ? getNetworkQualityInfo(metrics)
    : DEFAULT_QUALITY;

  const recommendedPreset = metrics
    ? getRecommendedQuality(metrics)
    : 'medium';

  return {
    metrics,
    quality,
    recommendedPreset,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
  };
}

/**
 * Hook simplificado para mostrar indicador de calidad
 * Sin necesidad de peer connection - usa navigator.connection
 */
export function useSimpleNetworkQuality(): {
  quality: NetworkQuality;
  info: NetworkQualityInfo;
} {
  const [info, setInfo] = useState<NetworkQualityInfo>(DEFAULT_QUALITY);

  useEffect(() => {
    const updateQuality = () => {
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

      if (connection) {
        const metrics = {
          bandwidth: connection.downlink ? connection.downlink * 1000 : 5000,
          latency: connection.rtt || 50,
          packetLoss: 0,
        };
        setInfo(getNetworkQualityInfo(metrics));
      }
    };

    updateQuality();

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, []);

  return { quality: info.level, info };
}

// Type for navigator.connection
interface NetworkInformation extends EventTarget {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}
