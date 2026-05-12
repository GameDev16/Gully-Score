import { Tournament } from "../models/Tournament.js";
import { Match } from "../models/Match.js";
import { Innings } from "../models/Innings.js";

/**
 * Recompute the points table for a tournament after a match completes.
 * Standard T20-style: Win=2, Tie=1, Loss=0, NRR = sumRuns/sumOvers - sumOppRuns/sumOppOvers
 */
export async function recomputePointsTable(tournamentId) {
  if (!tournamentId) return;
  const tournament = await Tournament.findById(tournamentId).populate("teams");
  if (!tournament) return;

  const matches = await Match.find({
    tournamentId,
    status: "completed",
  }).populate("innings");

  const stats = new Map();
  for (const team of tournament.teams) {
    stats.set(String(team._id), {
      teamId: team._id,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0,
    });
  }

  for (const match of matches) {
    const a = String(match.teamA);
    const b = String(match.teamB);
    if (!stats.has(a) || !stats.has(b)) continue;

    const sa = stats.get(a);
    const sb = stats.get(b);
    sa.played += 1;
    sb.played += 1;

    const allOuts = (innings) => innings.totalWickets >= 10;
    const overs = (i, fallback) => (allOuts(i) ? fallback : i.totalBalls / 6);

    const inn = await Innings.find({ matchId: match._id }).sort(
      "inningsNumber",
    );
    if (inn.length < 2) continue;

    const teamABat = String(inn[0].battingTeam) === a ? inn[0] : inn[1];
    const teamBBat = String(inn[0].battingTeam) === b ? inn[0] : inn[1];

    sa.runsFor += teamABat.totalRuns;
    sa.oversFor += overs(teamABat, match.overs);
    sa.runsAgainst += teamBBat.totalRuns;
    sa.oversAgainst += overs(teamBBat, match.overs);

    sb.runsFor += teamBBat.totalRuns;
    sb.oversFor += overs(teamBBat, match.overs);
    sb.runsAgainst += teamABat.totalRuns;
    sb.oversAgainst += overs(teamABat, match.overs);

    const winnerId = String(match.result?.winner || "");
    if (match.result?.marginType === "tie") {
      sa.tied += 1;
      sb.tied += 1;
      sa.points += 1;
      sb.points += 1;
    } else if (winnerId === a) {
      sa.won += 1;
      sb.lost += 1;
      sa.points += 2;
    } else if (winnerId === b) {
      sb.won += 1;
      sa.lost += 1;
      sb.points += 2;
    }
  }

  tournament.pointsTable = [...stats.values()]
    .map((s) => ({
      teamId: s.teamId,
      played: s.played,
      won: s.won,
      lost: s.lost,
      tied: s.tied,
      points: s.points,
      nrr:
        s.oversFor && s.oversAgainst
          ? +(s.runsFor / s.oversFor - s.runsAgainst / s.oversAgainst).toFixed(
              3,
            )
          : 0,
    }))
    .sort((x, y) => y.points - x.points || y.nrr - x.nrr);

  await tournament.save();
}

/**
 * Seed the points table with 0-point entries for all registered teams
 * that don't yet have a row. Called after teams are added to a tournament.
 */
export async function seedPointsTable(tournamentId) {
  if (!tournamentId) return;
  const tournament = await Tournament.findById(tournamentId).populate("teams");
  if (!tournament) return;

  const existingIds = new Set(
    tournament.pointsTable.map((r) => String(r.teamId)),
  );

  let changed = false;
  for (const team of tournament.teams) {
    if (!existingIds.has(String(team._id))) {
      tournament.pointsTable.push({
        teamId: team._id,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        nrr: 0,
      });
      changed = true;
    }
  }

  if (changed) {
    // Sort by points desc
    tournament.pointsTable.sort((a, b) => b.points - a.points);
    await tournament.save();
  }
}
