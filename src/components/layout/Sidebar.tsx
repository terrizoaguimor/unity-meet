'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  width?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Sidebar animado para paneles laterales (chat, participantes, settings)
 */
export function Sidebar({
  isOpen,
  onClose,
  position = 'right',
  width = 'w-80',
  title,
  children,
  className,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Animaciones de entrada/salida
  useEffect(() => {
    if (!sidebarRef.current || !overlayRef.current) return;

    const sidebar = sidebarRef.current;
    const overlay = overlayRef.current;

    if (isOpen) {
      // Animación de entrada
      gsap.set(sidebar, {
        x: position === 'right' ? '100%' : '-100%',
      });
      gsap.set(overlay, { opacity: 0, display: 'block' });

      gsap.to(sidebar, {
        x: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(overlay, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    } else {
      // Animación de salida
      gsap.to(sidebar, {
        x: position === 'right' ? '100%' : '-100%',
        duration: 0.25,
        ease: 'power2.in',
      });
      gsap.to(overlay, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          gsap.set(overlay, { display: 'none' });
        },
      });
    }
  }, [isOpen, position]);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/30 z-40 hidden md:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          'fixed top-0 bottom-0 z-50 flex flex-col',
          'bg-white dark:bg-unity-dark-gray',
          'border-l border-unity-light-gray dark:border-unity-darker',
          'shadow-xl',
          width,
          position === 'right' ? 'right-0' : 'left-0',
          className
        )}
        style={{
          transform: `translateX(${position === 'right' ? '100%' : '-100%'})`,
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-unity-light-gray dark:border-unity-darker">
            <h3 className="font-semibold text-unity-dark-gray dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-unity-darker transition-colors"
              aria-label="Cerrar panel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
