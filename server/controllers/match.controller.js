import { Match } from "../models/Match.js";
import { Innings } from "../models/Innings.js";
import { Tournament } from "../models/Tournament.js";
import { User } from "../models/User.js";
import { Venue } from "../models/Venue.js";
import { Over } from "../models/Over.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { genMatchKey } from "../utils/ids.js";
import { notifyScorerAssigned } from "../services/notificationService.js";

export const list = asyncHandler(async (req, res) => {
  const { status, tournamentId, q } = req.query;
  const filter = { isPublic: true };
  if (status) {
    // Support comma-separated statuses e.g. "live,innings-break"
    const statuses = status.split(",").map((s) => s.trim());
    if (statuses.length > 1) {
      filter.status = { $in: statuses };
    } else {
      filter.status = statuses[0];
    }
  }
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
    .populate({ path: "teamA", populate: { path: "players", select: "name" } })
    .populate({ path: "teamB", populate: { path: "players", select: "name" } })
    .populate({
      path: "innings",
      populate: [
        { path: "batterScores.playerId", select: "name" },
        { path: "batterScores.dismissedBy", select: "name" },
        { path: "batterScores.fielder", select: "name" },
        { path: "bowlerFigures.playerId", select: "name" },
        { path: "fallOfWickets.batterId", select: "name" },
        { path: "striker nonStriker currentBowler", select: "name" },
        { path: "battingTeam", select: "name shortName players", populate: { path: "players", select: "name" } },
        { path: "bowlingTeam", select: "name shortName players", populate: { path: "players", select: "name" } },
      ],
    });
  if (!m) return res.status(404).json({ message: "Not found" });

  let needNewBowler = false;
  if (m.status === "live" && m.currentInningsNumber > 0) {
    const activeInnings = m.innings[m.currentInningsNumber - 1];
    if (activeInnings) {
      const lastOver = await Over.findOne({ inningsId: activeInnings._id }).sort("-overNumber");
      if (lastOver && lastOver.isCompleted) {
        needNewBowler = true;
      }
    }
  }

  const result = m.toObject();
  result.needNewBowler = needNewBowler;
  res.json(result);
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

  if (req.body.venueName) {
    const vr = await Venue.create({ name: req.body.venueName.trim(), city: "" });
    req.body.venue = vr._id;
  }

  Object.assign(m, req.body);
  await m.save();
  res.json(m);
});

export const deleteMatch = asyncHandler(async (req, res) => {
  const m = await Match.findById(req.params.id);
  if (!m) return res.status(404).json({ message: "Not found" });
  if (String(m.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  // Remove from tournament if linked
  if (m.tournamentId) {
    await Tournament.findByIdAndUpdate(m.tournamentId, {
      $pull: { matches: m._id },
    });
  }
  await Match.deleteOne({ _id: m._id });
  res.json({ ok: true });
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
  await notifyScorerAssigned(user._id, m);
  res.json(m);
});
