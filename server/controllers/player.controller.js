import { Player } from "../models/Player.js";
import { PlayerAppearance } from "../models/PlayerAppearance.js";
import { Team } from "../models/Team.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const detail = asyncHandler(async (req, res) => {
  const p = await Player.findById(req.params.id).populate(
    "teamId",
    "name shortName logoUrl",
  );
  if (!p) return res.status(404).json({ message: "Player not found" });
  res.json(p);
});

export const appearances = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page || "1");
  const limit = parseInt(req.query.limit || "20");
  const filter = { playerId: req.params.id };
  if (req.query.format) filter.format = req.query.format;
  if (req.query.role === "batting") filter["batting.didBat"] = true;
  if (req.query.role === "bowling") filter["bowling.didBowl"] = true;
  if (req.query.tournamentId) filter.tournamentId = req.query.tournamentId;

  const total = await PlayerAppearance.countDocuments(filter);
  const items = await PlayerAppearance.find(filter)
    .sort("-matchDate")
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("oppositionTeamId", "name shortName logoUrl")
    .populate("matchId", "title matchKey result format")
    .populate("tournamentId", "name shortCode");

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

export const update = asyncHandler(async (req, res) => {
  const p = await Player.findById(req.params.id);
  if (!p) return res.status(404).json({ message: "Not found" });
  // Authorization: only host of the team can update
  if (p.teamId) {
    const team = await Team.findById(p.teamId);
    if (team && String(team.hostId) !== String(req.user._id))
      return res.status(403).json({ message: "Forbidden" });
  }
  Object.assign(p, req.body);
  await p.save();
  res.json(p);
});
