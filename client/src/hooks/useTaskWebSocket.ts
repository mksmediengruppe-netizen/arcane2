/**
 * useTaskWebSocket — Real-time task status via SSE or WebSocket
 * 
 * Tries WebSocket first (direct connection), falls back to SSE if unavailable.
 * The hook exposes a `send` function for compatibility but SSE is receive-only.
 * 
 * Design: Arcane 2 — Refined Dark SaaS
 */

import { useEffect, useRef, useCallback } from "react";

export interface WsRunStatus {
  type: "run_status" | "connected" | "ping";
  run_id?: string;
  status?: string;
  data?: {
    project_id?: string;
    output?: string;
    actual_cost?: number;
    errors?: string[];
    [key: string]: unknown;
  };
}

type WsMessage = WsRunStatus;

interface UseTaskWebSocketOptions {
  projectId: string | null;
  onMessage: (msg: WsMessage) => void;
  enabled?: boolean;
}

export function useTaskWebSocket({ projectId, onMessage, enabled = true }: UseTaskWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT = 3;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!projectId || !enabled) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    // Build WebSocket URL — use wss:// when page is https://
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${projectId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          onMessageRef.current(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        // error will be followed by onclose — no action needed here
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        // Don't reconnect if intentionally closed (code 1000) or max attempts reached
        if (event.code === 1000 || reconnectAttemptsRef.current >= MAX_RECONNECT) return;

        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    } catch {
      // WebSocket not available — silently skip, polling handles updates
    }
  }, [projectId, enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
