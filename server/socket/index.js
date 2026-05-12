export function initSocket(io) {
  io.on("connection", (socket) => {
    socket.on("join:match", (matchId) => {
      if (matchId) socket.join(`match:${matchId}`);
    });
    socket.on("leave:match", (matchId) => {
      if (matchId) socket.leave(`match:${matchId}`);
    });
  });
}

export const emitMatchEvent = (io, matchId, event, payload) => {
  io.to(`match:${matchId}`).emit(event, payload);
};
