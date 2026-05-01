import { Match } from "../models/Match.js";
import { Tournament } from "../models/Tournament.js";
import { Team } from "../models/Team.js";
import { Player } from "../models/Player.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q)
    return res.json({ matches: [], tournaments: [], teams: [], players: [] });

  const rx = new RegExp(q, "i");
  const upper = q.toUpperCase();

  const [matches, tournaments, teams, players] = await Promise.all([
    Match.find({
      $or: [{ title: rx }, { matchKey: upper }],
      isPublic: true,
    })
      .limit(10)
      .populate("teamA teamB"),
    Tournament.find({
      $or: [{ name: rx }, { shortCode: upper }],
      isPublic: true,
    }).limit(10),
    Team.find({ $or: [{ name: rx }, { shortName: upper }] }).limit(10),
    Player.find({ name: rx }).limit(10).populate("teamId", "name shortName"),
  ]);

  res.json({ matches, tournaments, teams, players });
});
