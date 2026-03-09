import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type RealtimeMessageType = 'items.changed' | 'history.changed' | 'categories.changed';

interface RealtimeMessage {
  type: RealtimeMessageType;
  at: string;
}

function getWebSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/api/ws`;
}

export default function useRealtimeSync() {
  const queryClient = useQueryClient();
  const reconnectTimer = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    shouldReconnectRef.current = true;

    const connect = () => {
      if (!shouldReconnectRef.current) return;

      const socket = new WebSocket(getWebSocketUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        let message: RealtimeMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (message.type === 'items.changed') {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          return;
        }

        if (message.type === 'history.changed') {
          queryClient.invalidateQueries({ queryKey: ['history'] });
          return;
        }

        if (message.type === 'categories.changed') {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          queryClient.invalidateQueries({ queryKey: ['items'] });
        }
      };

      socket.onclose = () => {
        if (!shouldReconnectRef.current) return;

        attemptRef.current = Math.min(attemptRef.current + 1, 6);
        const delayMs = Math.min(1000 * 2 ** (attemptRef.current - 1), 30_000);

        reconnectTimer.current = window.setTimeout(() => {
          connect();
        }, delayMs);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
      }
      socketRef.current?.close();
    };
  }, [queryClient]);
}
