import { User } from "../models/User.js";
import { Match } from "../models/Match.js";
import { Tournament } from "../models/Tournament.js";
import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const me = asyncHandler(async (req, res) => res.json(req.user));

export const updateMe = asyncHandler(async (req, res) => {
  const { name, avatar, phone } = req.body;
  const u = await User.findByIdAndUpdate(
    req.user._id,
    { name, avatar, phone },
    { new: true },
  ).select("-passwordHash");
  res.json(u);
});

export const myAssignments = asyncHandler(async (req, res) => {
  const matches = await Match.find({ scorerId: req.user._id })
    .sort("-createdAt")
    .populate("teamA teamB tournamentId");
  res.json(matches);
});

export const myDashboard = asyncHandler(async (req, res) => {
  const [tournaments, matches] = await Promise.all([
    Tournament.find({ hostId: req.user._id }).sort("-createdAt").limit(20),
    Match.find({ hostId: req.user._id })
      .sort("-createdAt")
      .limit(20)
      .populate("teamA teamB tournamentId scorerId"),
  ]);
  res.json({ tournaments, matches });
});

export const notifications = asyncHandler(async (req, res) => {
  const list = await Notification.find({ userId: req.user._id })
    .sort("-createdAt")
    .limit(30);
  res.json(list);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
  );
  res.json({ ok: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true },
  );
  res.json({ ok: true });
});
