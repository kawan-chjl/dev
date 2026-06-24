// useWorkspaceSocket — single /ws connection for live scheduler pushes.
// WS is a live signal only: the consumer refetches the timeline GET on any relevant push
// (CRITICAL FINDING in plan.md). No socket library; no auto-reconnect.
// Disabled in mock-mode: MOCK_AUTH short-circuits before new WebSocket.

import { useEffect, useRef, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import type { WsServerMessage } from './api'

interface WorkspaceSocketResult {
  connected: boolean
}

export function useWorkspaceSocket(onEvent: (msg: WsServerMessage) => void): WorkspaceSocketResult {
  const [connected, setConnected] = useState(false)
  // Use a ref for the socket so cleanup doesn't trigger re-renders.
  const wsRef = useRef<WebSocket | null>(null)
  // Stable ref for the caller's callback — avoids re-opening the socket on every render.
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (MOCK_AUTH) {
      // No socket in mock-mode — headless never dangles a connection.
      return
    }

    // In prod, VITE_WS_URL points directly at the Render host (wss://<render-host>/ws)
    // because Vercel cannot proxy WebSocket upgrades. In dev the var is unset and the
    // Vite proxy handles /ws → ws://localhost:8000 transparently.
    const url = import.meta.env.VITE_WS_URL
      ? (import.meta.env.VITE_WS_URL as string)
      : (() => {
          const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
          return `${protocol}//${location.host}/ws`
        })()

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      // No auto-reconnect (Open Q2 — a single connection is enough for the demo).
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WsServerMessage
        onEventRef.current(msg)
      } catch {
        // Malformed frame — drop it silently.
      }
    }

    return () => {
      // Clean up on unmount: null the handlers first to prevent setState-after-unmount.
      ws.onopen = null
      ws.onclose = null
      ws.onmessage = null
      ws.close()
      wsRef.current = null
      setConnected(false)
    }
  }, []) // Stable: opens once on mount, closes on unmount. onEvent is read via ref.

  return { connected }
}
