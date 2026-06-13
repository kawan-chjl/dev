"""Per-user WebSocket hub (TR-22). Broadcasts to all of a user's connections;
chat is last-write-wins (handled by callers). Tier 1 of the delivery ladder."""

from __future__ import annotations

from fastapi import WebSocket


class WSHub:
    def __init__(self) -> None:
        self._conns: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._conns.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        conns = self._conns.get(user_id)
        if conns:
            conns.discard(ws)
            if not conns:
                self._conns.pop(user_id, None)

    def is_connected(self, user_id: str) -> bool:
        return bool(self._conns.get(user_id))

    async def send(self, user_id: str, message: dict) -> bool:
        """Broadcast to every live connection; returns True if at least one got it."""
        delivered = False
        for ws in list(self._conns.get(user_id, ())):
            try:
                await ws.send_json(message)
                delivered = True
            except Exception:  # noqa: BLE001 - drop a dead socket, keep delivering to the rest
                self.disconnect(user_id, ws)
        return delivered


hub = WSHub()
