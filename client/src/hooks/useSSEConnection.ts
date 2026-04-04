/**
 * ARCANE 2 — SSE Connection Hook
 * ===============================
 * Connects to /api/chats/{chatId}/subscribe for real-time streaming.
 * Also connects to WebSocket /ws/{projectId} for project-level updates.
 *
 * Events emitted by backend:
 *   - token:         { type: "token", content: "..." }          — streaming token
 *   - status:        { type: "status", status: "running"|"done"|"error" }
 *   - cost:          { type: "cost", cost_usd: 0.0012 }        — incremental cost
 *   - step:          { type: "step", step: { tool, action, ... } }
 *   - thinking:      { type: "thinking", content: "..." }       — reasoning chain
 *   - error:         { type: "error", message: "..." }
 *   - ping:          { type: "ping" }                           — keepalive
 *   - connected:     { type: "connected", chat_id: "..." }
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { api, getToken } from '@/lib/api';

export interface SSEEvent {
  type: 'token' | 'status' | 'cost' | 'step' | 'thinking' | 'error' | 'connected' | 'ping';
  content?: string;
  status?: string;
  cost_usd?: number;
  step?: {
    tool: string;
    action: string;
    duration?: number;
    cost?: number;
  };
  message?: string;
  chat_id?: string;
}

interface UseSSEOptions {
  chatId: string | null;
  enabled?: boolean;
  onToken?: (content: string) => void;
  onStatus?: (status: string) => void;
  onCost?: (costUsd: number) => void;
  onStep?: (step: SSEEvent['step']) => void;
  onThinking?: (content: string) => void;
  onError?: (message: string) => void;
  onConnected?: () => void;
}

export function useSSEConnection({
  chatId,
  enabled = true,
  onToken,
  onStatus,
  onCost,
  onStep,
  onThinking,
  onError,
  onConnected,
}: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;

  const connect = useCallback(() => {
    if (!chatId || !enabled) return;

    const url = api.chats.subscribeUrl(chatId);
    const token = getToken();
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    const es = new EventSource(fullUrl);
    esRef.current = es;

    // Unified event dispatcher
    const dispatchEvent = (data: SSEEvent) => {
      switch (data.type) {
        case 'token':    onToken?.(data.content || ''); break;
        case 'status':   onStatus?.(data.status || ''); break;
        case 'cost':     onCost?.(data.cost_usd || 0); break;
        case 'step':     onStep?.(data.step); break;
        case 'thinking': onThinking?.(data.content || ''); break;
        case 'error':    onError?.(data.message || 'Unknown error'); break;
        case 'connected': onConnected?.(); break;
        case 'ping':     break;
      }
    };

    es.onopen = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      retriesRef.current = 0;
    };

    // Handle unnamed events (data: {...}\n\n) via onmessage
    es.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);
        dispatchEvent(data);
      } catch { /* ignore parse errors */ }
    };

    // Also handle named events (event: token\ndata: {...}\n\n)
    // in case backend sends SSE with event: prefix
    const namedEvents = ['token', 'status', 'cost', 'step', 'thinking', 'error', 'connected'] as const;
    for (const eventName of namedEvents) {
      es.addEventListener(eventName, ((event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          dispatchEvent({ type: eventName, ...data });
        } catch { /* ignore */ }
      }) as EventListener);
    }

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      esRef.current = null;

      if (retriesRef.current < maxRetries) {
        setIsReconnecting(true);
        const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 10000);
        retriesRef.current++;
        setTimeout(connect, delay);
      } else {
        setIsReconnecting(false);
        onError?.('SSE connection failed after max retries');
      }
    };
  }, [chatId, enabled, onToken, onStatus, onCost, onStep, onThinking, onError, onConnected]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      setIsConnected(false);
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setIsConnected(false);
    setIsReconnecting(false);
  }, []);

  return { isConnected, isReconnecting, disconnect };
}

// ─── WebSocket Hook for project-level updates ────────────────────────────────

interface UseProjectWSOptions {
  projectId: string | null;
  enabled?: boolean;
  onMessage?: (data: Record<string, unknown>) => void;
}

export function useProjectWebSocket({ projectId, enabled = true, onMessage }: UseProjectWSOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!projectId || !enabled) return;

    const url = api.wsUrl(projectId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch { /* ignore */ }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [projectId, enabled, onMessage]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { isConnected, send };
}
