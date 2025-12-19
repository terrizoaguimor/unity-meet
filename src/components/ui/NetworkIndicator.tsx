'use client';

import { cn } from '@/lib/utils/cn';
import { NetworkQualityInfo } from '@/lib/telnyx/qualityPresets';
import { Tooltip } from './Tooltip';

interface NetworkIndicatorProps {
  quality: NetworkQualityInfo;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { barHeight: 8, barWidth: 3, gap: 1 },
  md: { barHeight: 12, barWidth: 4, gap: 1.5 },
  lg: { barHeight: 16, barWidth: 5, gap: 2 },
};

/**
 * Indicador visual de calidad de red con barras estilo señal móvil
 */
export function NetworkIndicator({
  quality,
  size = 'sm',
  showLabel = false,
  className,
}: NetworkIndicatorProps) {
  const config = sizeConfig[size];
  const { bars, color, label } = quality;

  const heights = [0.2, 0.4, 0.6, 0.8, 1]; // Porcentaje de altura para cada barra

  return (
    <Tooltip content={`Conexión: ${label}`} position="top">
      <div
        className={cn('flex items-end', className)}
        style={{ gap: `${config.gap}px` }}
        role="img"
        aria-label={`Calidad de conexión: ${label}`}
      >
        {heights.map((heightPercent, index) => {
          const isActive = index < bars;
          const barHeight = config.barHeight * heightPercent;

          return (
            <div
              key={index}
              className={cn(
                'rounded-sm transition-all duration-300',
                isActive ? 'opacity-100' : 'opacity-30'
              )}
              style={{
                width: `${config.barWidth}px`,
                height: `${barHeight}px`,
                backgroundColor: isActive ? color : '#6b7280',
              }}
            />
          );
        })}
        {showLabel && (
          <span
            className="ml-1 text-xs font-medium"
            style={{ color }}
          >
            {label}
          </span>
        )}
      </div>
    </Tooltip>
  );
}

/**
 * Indicador de red compacto para VideoTile
 */
export function NetworkBadge({
  quality,
  className,
}: {
  quality: NetworkQualityInfo;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm',
        className
      )}
    >
      <NetworkIndicator quality={quality} size="sm" />
    </div>
  );
}

/**
 * Indicador de red animado para estados críticos
 */
export function NetworkWarning({
  quality,
  onDismiss,
}: {
  quality: NetworkQualityInfo;
  onDismiss?: () => void;
}) {
  if (quality.bars >= 3) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/90 dark:bg-yellow-600/90 rounded-lg text-white text-sm animate-pulse">
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>Conexión {quality.label.toLowerCase()}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto p-0.5 hover:bg-white/20 rounded"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
