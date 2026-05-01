import { Team } from "../models/Team.js";
import { Player } from "../models/Player.js";
import { Tournament } from "../models/Tournament.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const detail = asyncHandler(async (req, res) => {
  const t = await Team.findById(req.params.id)
    .populate("players")
    .populate("captain");
  if (!t) return res.status(404).json({ message: "Team not found" });
  res.json(t);
});

export const create = asyncHandler(async (req, res) => {
  const team = await Team.create({ ...req.body, hostId: req.user._id });
  if (team.tournamentId) {
    await Tournament.findByIdAndUpdate(team.tournamentId, {
      $addToSet: { teams: team._id },
    });
  }
  res.status(201).json(team);
});

export const update = asyncHandler(async (req, res) => {
  const t = await Team.findById(req.params.id);
  if (!t) return res.status(404).json({ message: "Not found" });
  if (String(t.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  Object.assign(t, req.body);
  await t.save();
  res.json(t);
});

export const addPlayer = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (String(team.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  const player = await Player.create({ ...req.body, teamId: team._id });
  team.players.push(player._id);
  await team.save();
  res.status(201).json(player);
});

export const removePlayer = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) return res.status(404).json({ message: "Team not found" });
  if (String(team.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  team.players = team.players.filter((p) => String(p) !== req.params.pid);
  await team.save();
  res.json({ ok: true });
});
