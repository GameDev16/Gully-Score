import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const signAccess = (uid) =>
  jwt.sign({ uid }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
const signRefresh = (uid) =>
  jwt.sign({ uid }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists)
    return res.status(409).json({ message: "Email already registered" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  res.cookie("rt", refreshToken, cookieOpts);
  res.status(201).json({
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });
  user.lastLogin = new Date();
  await user.save();
  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  res.cookie("rt", refreshToken, cookieOpts);
  res.json({
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.rt;
  if (!token) return res.status(401).json({ message: "No refresh token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = signAccess(decoded.uid);
    const refreshToken = signRefresh(decoded.uid);
    res.cookie("rt", refreshToken, cookieOpts);
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("rt", { ...cookieOpts, maxAge: 0 });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
