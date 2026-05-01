import { Match } from "../models/Match.js";
import { Innings } from "../models/Innings.js";
import { Player } from "../models/Player.js";
import { PlayerAppearance } from "../models/PlayerAppearance.js";
import { Team } from "../models/Team.js";
import { Venue } from "../models/Venue.js";

export async function createAppearances(matchId) {
  const match = await Match.findById(matchId).populate("innings");
  if (!match) return;

  const venue = match.venue ? await Venue.findById(match.venue) : null;
  const innings = await Innings.find({ matchId });

  const playerMap = new Map(); // playerId → appearance doc

  for (const inn of innings) {
    const oppositionTeamId = inn.bowlingTeam;

    for (const bs of inn.batterScores) {
      const key = String(bs.playerId);
      const existing = playerMap.get(key) || baseDoc(bs.playerId);
      existing.batting = {
        didBat: true,
        runs: bs.runs,
        balls: bs.balls,
        fours: bs.fours,
        sixes: bs.sixes,
        strikeRate: bs.balls ? +((bs.runs / bs.balls) * 100).toFixed(2) : 0,
        dismissalType: bs.dismissalType,
        isNotOut: !bs.isOut,
        battingPosition: bs.order,
      };
      existing.oppositionTeamId = oppositionTeamId;
      playerMap.set(key, existing);
    }

    for (const bf of inn.bowlerFigures) {
      const key = String(bf.playerId);
      const existing = playerMap.get(key) || baseDoc(bf.playerId);
      existing.bowling = {
        didBowl: true,
        overs: bf.overs,
        maidens: bf.maidens,
        runs: bf.runs,
        wickets: bf.wickets,
        economy: bf.overs ? +(bf.runs / bf.overs).toFixed(2) : 0,
        noBalls: bf.noBalls,
        wides: bf.wides,
      };
      existing.oppositionTeamId = inn.battingTeam;
      playerMap.set(key, existing);
    }
  }

  function baseDoc(playerId) {
    return {
      playerId,
      matchId: match._id,
      tournamentId: match.tournamentId,
      matchDate: match.date || match.createdAt,
      matchTitle: match.title,
      format: match.format,
      venueName: venue?.name,
      batting: { didBat: false },
      bowling: { didBowl: false },
    };
  }

  // Bulk create
  const docs = Array.from(playerMap.values());
  if (docs.length) await PlayerAppearance.insertMany(docs);

  // Update career stats for all involved players
  await Promise.all([...playerMap.keys()].map(updateCareerStats));
}

export async function updateCareerStats(playerId) {
  const apps = await PlayerAppearance.find({ playerId });
  const matches = apps.length;
  let runs = 0,
    balls = 0,
    fours = 0,
    sixes = 0,
    fifties = 0,
    hundreds = 0;
  let notOuts = 0,
    highest = 0,
    innings = 0;
  let wickets = 0,
    oversBowled = 0,
    runsConceded = 0,
    fourW = 0,
    fiveW = 0;
  let bestW = 0,
    bestR = 999;

  for (const a of apps) {
    if (a.batting?.didBat) {
      innings += 1;
      runs += a.batting.runs;
      balls += a.batting.balls;
      fours += a.batting.fours;
      sixes += a.batting.sixes;
      if (a.batting.runs >= 100) hundreds += 1;
      else if (a.batting.runs >= 50) fifties += 1;
      if (a.batting.isNotOut) notOuts += 1;
      if (a.batting.runs > highest) highest = a.batting.runs;
    }
    if (a.bowling?.didBowl) {
      wickets += a.bowling.wickets;
      oversBowled += a.bowling.overs;
      runsConceded += a.bowling.runs;
      if (a.bowling.wickets >= 5) fiveW += 1;
      else if (a.bowling.wickets >= 4) fourW += 1;
      if (
        a.bowling.wickets > bestW ||
        (a.bowling.wickets === bestW && a.bowling.runs < bestR)
      ) {
        bestW = a.bowling.wickets;
        bestR = a.bowling.runs;
      }
    }
  }

  const dismissals = innings - notOuts;
  const battingAvg = dismissals ? +(runs / dismissals).toFixed(2) : runs;
  const sr = balls ? +((runs / balls) * 100).toFixed(2) : 0;
  const econ = oversBowled ? +(runsConceded / oversBowled).toFixed(2) : 0;
  const bowlAvg = wickets ? +(runsConceded / wickets).toFixed(2) : 0;

  await Player.findByIdAndUpdate(playerId, {
    "career_stats.matches": matches,
    "career_stats.innings": innings,
    "career_stats.batting": {
      runs,
      balls,
      fours,
      sixes,
      fifties,
      hundreds,
      notOuts,
      highestScore: highest,
      average: battingAvg,
      strikeRate: sr,
    },
    "career_stats.bowling": {
      wickets,
      overs: oversBowled,
      runsConceded,
      economy: econ,
      average: bowlAvg,
      bestFigures: { wickets: bestW, runs: bestW ? bestR : 0 },
      fourWickets: fourW,
      fiveWickets: fiveW,
    },
  });
}
