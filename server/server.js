import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/index.js";
import { errorHandler, notFound } from "./middleware/error.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import tournamentRoutes from "./routes/tournament.routes.js";
import teamRoutes from "./routes/team.routes.js";
import playerRoutes from "./routes/player.routes.js";
import venueRoutes from "./routes/venue.routes.js";
import matchRoutes from "./routes/match.routes.js";
import scoringRoutes from "./routes/scoring.routes.js";
import searchRoutes from "./routes/search.routes.js";
import uploadRoutes from "./routes/upload.routes.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("CORS blocked: " + origin));
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/", rateLimit({ windowMs: 60_000, max: 300 }));

app.get("/api/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/scoring", scoringRoutes);
app.use("/api/search", searchRoutes);

app.use(notFound);
app.use(errorHandler);

app.use("/api/upload", uploadRoutes);

const io = new SocketIOServer(server, {
  cors: corsOptions,
  pingInterval: 25000,
  pingTimeout: 60000,
});
initSocket(io);
app.set("io", io);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`🏏 PitchDay API on :${PORT}`));
});
