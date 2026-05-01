import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Match } from "../models/Match.js";

export const authRequired = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Auth required" });
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.uid).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "Invalid token" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireScorer = async (req, res, next) => {
  const matchId = req.params.matchId || req.params.id;
  const match = await Match.findById(matchId);
  if (!match) return res.status(404).json({ message: "Match not found" });
  if (
    String(match.scorerId) !== String(req.user._id) &&
    String(match.hostId) !== String(req.user._id)
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to score this match" });
  }
  req.match = match;
  next();
};

export const requireOwner = (modelGetter) => async (req, res, next) => {
  const doc = await modelGetter(req);
  if (!doc) return res.status(404).json({ message: "Resource not found" });
  if (String(doc.hostId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not the owner" });
  }
  req.resource = doc;
  next();
};
