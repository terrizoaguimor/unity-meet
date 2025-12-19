'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { getInitials, stringToColor } from '@/lib/utils/formatters';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'busy' | 'away';
  isSpeaking?: boolean;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    status: 'w-2 h-2 border',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    status: 'w-2.5 h-2.5 border-2',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    status: 'w-3 h-3 border-2',
  },
  lg: {
    container: 'w-14 h-14',
    text: 'text-lg',
    status: 'w-3.5 h-3.5 border-2',
  },
  xl: {
    container: 'w-20 h-20',
    text: 'text-2xl',
    status: 'w-4 h-4 border-2',
  },
};

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
};

/**
 * Avatar con soporte para imagen, iniciales, estado y indicador de hablando
 */
function Avatar({
  src,
  name,
  size = 'md',
  showStatus = false,
  status = 'offline',
  isSpeaking = false,
  className,
  ...props
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const backgroundColor = stringToColor(name);
  const styles = sizeStyles[size];
  const showImage = src && !imageError;

  return (
    <div className={cn('relative inline-flex', className)}>
      {/* Avatar principal */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden flex items-center justify-center',
          'ring-2 ring-transparent',
          isSpeaking && 'ring-unity-orange animate-[speaking_0.5s_ease-in-out_infinite_alternate]',
          styles.container
        )}
        style={{ backgroundColor: showImage ? undefined : backgroundColor }}
      >
        {showImage ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            {...props}
          />
        ) : (
          <span className={cn('font-medium text-white', styles.text)}>{initials}</span>
        )}
      </div>

      {/* Indicador de estado */}
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full',
            'border-white dark:border-unity-dark-gray',
            statusColors[status],
            styles.status
          )}
        />
      )}
    </div>
  );
}

export { Avatar, type AvatarProps, type AvatarSize };
