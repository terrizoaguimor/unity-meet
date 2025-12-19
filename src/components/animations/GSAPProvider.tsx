'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';

interface GSAPProviderProps {
  children: ReactNode;
}

/**
 * Provider para inicializar GSAP y proporcionar contexto global
 */
export function GSAPProvider({ children }: GSAPProviderProps) {
  const contextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    // Crear contexto de GSAP para cleanup automático
    contextRef.current = gsap.context(() => {
      // Configuración global de GSAP
      gsap.defaults({
        ease: 'power2.out',
        duration: 0.3,
      });
    });

    return () => {
      // Cleanup de todas las animaciones al desmontar
      contextRef.current?.revert();
    };
  }, []);

  return <>{children}</>;
}

/**
 * Animaciones predefinidas para usar en componentes
 */
export const animations = {
  // Entrada de participante al video grid
  participantEnter: (element: HTMLElement) => {
    return gsap.from(element, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(1.7)',
    });
  },

  // Salida de participante del video grid
  participantLeave: (element: HTMLElement) => {
    return gsap.to(element, {
      scale: 0,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    });
  },

  // Toggle de panel (chat, participantes)
  panelToggle: (element: HTMLElement, isVisible: boolean) => {
    return gsap.to(element, {
      x: isVisible ? 0 : '100%',
      opacity: isVisible ? 1 : 0,
      duration: 0.3,
      ease: 'power2.out',
    });
  },

  // Toggle de controles
  controlsToggle: (element: HTMLElement, isVisible: boolean) => {
    return gsap.to(element, {
      y: isVisible ? 0 : 100,
      opacity: isVisible ? 1 : 0,
      duration: 0.3,
      ease: 'power2.out',
    });
  },

  // Indicador de "hablando"
  speakingPulse: (element: HTMLElement) => {
    return gsap.to(element, {
      scale: 1.1,
      repeat: -1,
      yoyo: true,
      duration: 0.5,
      ease: 'sine.inOut',
    });
  },

  // Efecto hover en botones
  buttonHover: (element: HTMLElement, isHovering: boolean) => {
    return gsap.to(element, {
      scale: isHovering ? 1.05 : 1,
      duration: 0.2,
      ease: 'power2.out',
    });
  },

  // Fade in genérico
  fadeIn: (element: HTMLElement, delay = 0) => {
    return gsap.from(element, {
      opacity: 0,
      y: 20,
      duration: 0.5,
      delay,
      ease: 'power2.out',
    });
  },

  // Fade out genérico
  fadeOut: (element: HTMLElement) => {
    return gsap.to(element, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in',
    });
  },

  // Shake para errores
  shake: (element: HTMLElement) => {
    return gsap.to(element, {
      keyframes: [
        { x: -10 },
        { x: 10 },
        { x: -10 },
        { x: 10 },
        { x: 0 },
      ],
      duration: 0.4,
      ease: 'power2.out',
    });
  },

  // Notificación toast
  toastEnter: (element: HTMLElement) => {
    return gsap.from(element, {
      x: 100,
      opacity: 0,
      duration: 0.4,
      ease: 'back.out(1.4)',
    });
  },

  toastLeave: (element: HTMLElement) => {
    return gsap.to(element, {
      x: 100,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    });
  },

  // Stagger para listas
  staggerIn: (elements: HTMLElement[], staggerTime = 0.1) => {
    return gsap.from(elements, {
      opacity: 0,
      y: 20,
      stagger: staggerTime,
      duration: 0.4,
      ease: 'power2.out',
    });
  },
};

/**
 * Hook para usar animaciones de GSAP con cleanup automático
 */
export function useGSAP() {
  const contextRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    contextRef.current = gsap.context(() => {});

    return () => {
      contextRef.current?.revert();
    };
  }, []);

  return {
    context: contextRef.current,
    gsap,
    animations,
  };
}
