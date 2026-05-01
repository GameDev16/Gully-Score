import { Match } from "../models/Match.js";
import { Innings } from "../models/Innings.js";
import { Tournament } from "../models/Tournament.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { genMatchKey } from "../utils/ids.js";
import { notifyScorerAssigned } from "../services/notificationService.js";

export const list = asyncHandler(async (req, res) => {
  const { status, tournamentId, q } = req.query;
  const filter = { isPublic: true };
  if (status) filter.status = status;
  if (tournamentId) filter.tournamentId = tournamentId;
  if (q)
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { matchKey: q.toUpperCase() },
    ];
  const list = await Match.find(filter)
    .sort("-createdAt")
    .limit(50)
    .populate("teamA teamB venue tournamentId");
  res.json(list);
});

export const detail = asyncHandler(async (req, res) => {
  const m = await Match.findById(req.params.id)
    .populate({ path: "teamA", populate: { path: "players" } })
    .populate({ path: "teamB", populate: { path: "players" } })
    .populate("venue tournamentId scorerId")
    .populate({ path: "innings" });
  if (!m) return res.status(404).json({ message: "Match not found" });
  res.json(m);
});

export const findByKey = asyncHandler(async (req, res) => {
  const m = await Match.findOne({
    matchKey: req.params.matchKey.toUpperCase(),
  });
  if (!m) return res.status(404).json({ message: "Not found" });
  res.json({ id: m._id });
});

export const liveState = asyncHandler(async (req, res) => {
  const m = await Match.findById(req.params.id)
    .populate("teamA teamB")
    .populate({
      path: "innings",
      populate: [
        { path: "batterScores.playerId", select: "name" },
        { path: "bowlerFigures.playerId", select: "name" },
        { path: "striker nonStriker currentBowler", select: "name" },
      ],
    });
  if (!m) return res.status(404).json({ message: "Not found" });
  res.json(m);
});

export const create = asyncHandler(async (req, res) => {
  let matchKey;
  for (let i = 0; i < 5; i++) {
    matchKey = genMatchKey();
    if (!(await Match.exists({ matchKey }))) break;
  }
  const match = await Match.create({
    ...req.body,
    matchKey,
    hostId: req.user._id,
  });
  if (match.tournamentId) {
    await Tournament.findByIdAndUpdate(match.tournamentId, {
      $addToSet: { matches: match._id },
    });
  }
  res.status(201).json(match);
});

export const update = asyncHandler(async (req, res) => {
  const m = await Match.findById(req.params.id);
  if (!m) return res.status(404).json({ message: "Not found" });
  if (String(m.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  Object.assign(m, req.body);
  await m.save();
  res.json(m);
});

export const assignScorer = asyncHandler(async (req, res) => {
  const m = await Match.findById(req.params.id);
  if (!m) return res.status(404).json({ message: "Not found" });
  if (String(m.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ message: "User not found by email" });
  m.scorerId = user._id;
  await m.save();
  await User.findByIdAndUpdate(user._id, {
    $addToSet: { scoring_assignments: m._id },
  });
  res.json(m);
});
