import { useEffect } from "react";
import { getSocket } from "../socket/socket.js";

export function useMatchSocket(matchId, handlers = {}) {
  useEffect(() => {
    if (!matchId) return;
    const s = getSocket();
    s.emit("join:match", matchId);

    const map = {
      "ball:update": handlers.onBall,
      "match:status": handlers.onStatus,
      "innings:change": handlers.onInnings,
      "match:end": handlers.onEnd,
      "ball:undo": handlers.onUndo,
    };
    Object.entries(map).forEach(([k, fn]) => fn && s.on(k, fn));

    return () => {
      Object.entries(map).forEach(([k, fn]) => fn && s.off(k, fn));
      s.emit("leave:match", matchId);
    };
  }, [matchId]);
}
