'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import type { ChatMessage } from '@/types';

interface UseChatOptions {
  participantId: string;
  participantName: string;
}

interface UseChatReturn {
  // Mensajes
  messages: ChatMessage[];
  unreadCount: number;

  // Enviar mensaje
  sendMessage: (content: string) => void;

  // UI
  isChatOpen: boolean;
  toggleChat: () => void;
  markAsRead: () => void;

  // Scroll
  scrollToBottom: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook para gestionar el chat de la sala
 */
export function useChat({
  participantId,
  participantName,
}: UseChatOptions): UseChatReturn {
  // Store state - solo datos, no acciones
  const messages = useRoomStore((state) => state.messages);
  const unreadCount = useRoomStore((state) => state.unreadMessages);
  const isChatOpen = useRoomStore((state) => state.isChatOpen);

  // Refs para evitar dependencias inestables
  const participantIdRef = useRef(participantId);
  const participantNameRef = useRef(participantName);
  participantIdRef.current = participantId;
  participantNameRef.current = participantName;

  // Acciones del store - obtener via getState() para estabilidad
  const storeActionsRef = useRef(useRoomStore.getState());
  const toggleChat = storeActionsRef.current.toggleChat;
  const markMessagesAsRead = storeActionsRef.current.markMessagesAsRead;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  /**
   * Enviar un mensaje - sin dependencias inestables
   */
  const sendMessage = useCallback(
    (content: string) => {
      const trimmedContent = content.trim();

      if (!trimmedContent) return;

      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: participantIdRef.current,
        senderName: participantNameRef.current,
        content: trimmedContent,
        timestamp: new Date(),
        type: 'message',
      };

      // Usar getState() para la acción
      useRoomStore.getState().addMessage(message);
    },
    [] // Sin dependencias - usa refs
  );

  /**
   * Scroll al final de los mensajes
   */
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  /**
   * Marcar mensajes como leídos - sin dependencias
   */
  const markAsRead = useCallback(() => {
    useRoomStore.getState().markMessagesAsRead();
  }, []); // Sin dependencias - usa getState()

  // Auto-scroll cuando llegan nuevos mensajes y estamos al final
  useEffect(() => {
    if (isScrolledToBottom && isChatOpen) {
      scrollToBottom();
    }
  }, [messages.length, isScrolledToBottom, isChatOpen, scrollToBottom]);

  // Marcar como leídos cuando se abre el chat
  useEffect(() => {
    if (isChatOpen) {
      markAsRead();
    }
  }, [isChatOpen, markAsRead]);

  return {
    messages,
    unreadCount,
    sendMessage,
    isChatOpen,
    toggleChat,
    markAsRead,
    scrollToBottom,
    messagesEndRef: messagesEndRef as React.RefObject<HTMLDivElement>,
  };
}

/**
 * Agregar mensaje de sistema (participante unido/salió)
 */
export function useSystemMessages() {
  const addMessage = useRoomStore((state) => state.addMessage);

  const addJoinMessage = useCallback(
    (participantName: string) => {
      const message: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'Sistema',
        content: `${participantName} se ha unido a la reunión`,
        timestamp: new Date(),
        type: 'system',
      };
      addMessage(message);
    },
    [addMessage]
  );

  const addLeaveMessage = useCallback(
    (participantName: string) => {
      const message: ChatMessage = {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'Sistema',
        content: `${participantName} ha salido de la reunión`,
        timestamp: new Date(),
        type: 'system',
      };
      addMessage(message);
    },
    [addMessage]
  );

  return {
    addJoinMessage,
    addLeaveMessage,
  };
}
