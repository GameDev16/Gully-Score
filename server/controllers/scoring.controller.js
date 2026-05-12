import { Match } from "../models/Match.js";
import { Innings } from "../models/Innings.js";
import { Over } from "../models/Over.js";
import { Ball } from "../models/Ball.js";
import { Team } from "../models/Team.js";
import { Player } from "../models/Player.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recomputePointsTable } from "../services/pointsTableService.js";
import {
  isLegalDelivery,
  calculateCRR,
  calculateRRR,
  calculateProjection,
  detectMilestone,
  formatOvers,
} from "../services/scoringEngine.js";
import { createAppearances } from "../services/appearanceService.js";
import { emitMatchEvent } from "../socket/index.js";

/* -------- helper: get allout threshold -------- */
async function getAllOutThreshold(innings) {
  const team = await Team.findById(innings.battingTeam);
  const playerCount = team?.players?.length || 11;
  return playerCount - 1;
}

/* ---------------- TOSS ---------------- */
export const setToss = asyncHandler(async (req, res) => {
  const match = req.match;
  const {
    tossWonBy,
    tossDecision,
    openingStriker,
    openingNonStriker,
    openingBowler,
  } = req.body;

  match.tossWonBy = tossWonBy;
  match.tossDecision = tossDecision;
  match.status = "live";

  // Determine batting team
  const battingTeamId =
    tossDecision === "bat"
      ? tossWonBy
      : String(tossWonBy) === String(match.teamA)
        ? match.teamB
        : match.teamA;
  const bowlingTeamId =
    String(battingTeamId) === String(match.teamA) ? match.teamB : match.teamA;

  const innings = await Innings.create({
    matchId: match._id,
    battingTeam: battingTeamId,
    bowlingTeam: bowlingTeamId,
    inningsNumber: 1,
    striker: openingStriker,
    nonStriker: openingNonStriker,
    currentBowler: openingBowler,
    powerplayOvers: match.powerplayOvers,
    batterScores: [
      { playerId: openingStriker, order: 1 },
      { playerId: openingNonStriker, order: 2 },
    ],
    bowlerFigures: [{ playerId: openingBowler, order: 1 }],
  });

  await Over.create({
    inningsId: innings._id,
    overNumber: 0,
    bowlerId: openingBowler,
    balls: [],
  });

  match.innings.push(innings._id);
  match.currentInningsNumber = 1;
  await match.save();

  const io = req.app.get("io");
  emitMatchEvent(io, match._id, "match:status", {
    status: match.status,
    innings,
  });
  res.json({ match, innings });
});

/* ---------------- BALL ENTRY ---------------- */
export const submitBall = asyncHandler(async (req, res) => {
  const match = req.match;
  if (match.status !== "live")
    return res.status(400).json({ message: "Match not live" });

  const innings = await Innings.findById(
    match.innings[match.currentInningsNumber - 1],
  );
  if (!innings || innings.status !== "live")
    return res.status(400).json({ message: "No live innings" });

  const {
    runsScored = 0,
    extraType = null,
    extraRuns = 0,
    isWicket = false,
    wicket = null,
    newBatterId,
    newBowlerId,
  } = req.body;

  const legal = isLegalDelivery({ extraType });

  // Find current over
  let currentOver = await Over.findOne({ inningsId: innings._id }).sort(
    "-overNumber",
  );
  if (!currentOver || currentOver.isCompleted) {
    const newOverNumber = currentOver ? currentOver.overNumber + 1 : 0;
    currentOver = await Over.create({
      inningsId: innings._id,
      overNumber: newOverNumber,
      bowlerId: innings.currentBowler,
      balls: [],
    });
  }

  // Compute ball number within over (legal balls + 1)
  const ballsInOver = await Ball.find({ overId: currentOver._id });
  const legalBallsInOver = ballsInOver.filter((b) => b.isLegalDelivery).length;
  const ballNumber = legal ? legalBallsInOver + 1 : legalBallsInOver + 0.1;

  const totalRunsThisBall = (runsScored || 0) + (extraRuns || 0);
  const isBoundary = !extraType && (runsScored === 4 || runsScored === 6);

  const ball = await Ball.create({
    overId: currentOver._id,
    inningsId: innings._id,
    matchId: match._id,
    overNumber: currentOver.overNumber,
    ballNumber,
    batterId: innings.striker,
    bowlerId: innings.currentBowler,
    nonStrikerId: innings.nonStriker,
    runsScored: totalRunsThisBall,
    isExtra: !!extraType,
    extraType,
    extraRuns,
    isLegalDelivery: legal,
    isWicket,
    wicket: isWicket ? wicket : undefined,
    isBoundary,
    boundaryType: isBoundary ? String(runsScored) : null,
  });

  currentOver.balls.push(ball._id);
  currentOver.runsInOver += totalRunsThisBall;
  if (isWicket) currentOver.wicketsInOver += 1;

  /* Update innings totals */
  innings.totalRuns += totalRunsThisBall;
  if (legal) innings.totalBalls += 1;

  if (extraType === "wide")
    innings.extras.wides += extraRuns;
  if (extraType === "no-ball")
    innings.extras.noBalls += extraRuns;
  if (extraType === "leg-bye") innings.extras.legByes += extraRuns;
  if (extraType === "bye") innings.extras.byes += extraRuns;
  if (extraType === "penalty") innings.extras.penalties += extraRuns;

  /* Update batter (only off-bat runs) */
  const batter = innings.batterScores.find(
    (b) => String(b.playerId) === String(innings.striker),
  );
  if (batter) {
    if (legal) batter.balls += 1;
    // Off-bat runs only when not bye/leg-bye/wide(extra)/penalty
    const offBat = !extraType
      ? runsScored
      : extraType === "no-ball"
        ? runsScored
        : 0;
    batter.runs += offBat;
    if (offBat === 4) batter.fours += 1;
    if (offBat === 6) batter.sixes += 1;
    batter.strikeRate = batter.balls
      ? +((batter.runs / batter.balls) * 100).toFixed(2)
      : 0;
  }

  /* Update bowler */
  const bowler = innings.bowlerFigures.find(
    (b) => String(b.playerId) === String(innings.currentBowler),
  );
  if (bowler) {
    if (legal) bowler.balls += 1;
    // Runs charged to bowler: all runs except byes/leg-byes/penalty
    const charged =
      extraType === "bye" || extraType === "leg-bye" || extraType === "penalty"
        ? 0
        : totalRunsThisBall;
    bowler.runs += charged;
    if (extraType === "wide") bowler.wides += extraRuns;
    if (extraType === "no-ball") bowler.noBalls += 1;
    bowler.overs = +(
      Math.floor(bowler.balls / 6) +
      (bowler.balls % 6) / 10
    ).toFixed(1);
    bowler.economy = bowler.balls
      ? +((bowler.runs / bowler.balls) * 6).toFixed(2)
      : 0;
    if (isWicket && wicket?.bowlerCredited) bowler.wickets += 1;
  }

  /* Dynamic allout threshold based on team size */
  const allOutThreshold = await getAllOutThreshold(innings);

  /* Wicket handling */
  let needNewBatter = false;
  let dismissedWasStriker = false;
  if (isWicket && wicket) {
    const dismissed = innings.batterScores.find(
      (b) => String(b.playerId) === String(wicket.dismissedPlayerId),
    );
    if (dismissed) {
      dismissed.isOut = true;
      dismissed.dismissalType = wicket.type;
      dismissed.dismissedBy = wicket.bowlerCredited
        ? innings.currentBowler
        : null;
      dismissed.fielder = wicket.fielder1Id || null;
    }
    innings.totalWickets += 1;
    innings.fallOfWickets.push({
      wicketNumber: innings.totalWickets,
      runs: innings.totalRuns,
      over: formatOvers(innings.totalBalls),
      batterId: wicket.dismissedPlayerId,
    });

    needNewBatter = innings.totalWickets < allOutThreshold;

    // Immediately null out the dismissed batter's position
    dismissedWasStriker = String(wicket.dismissedPlayerId) === String(innings.striker);
    if (dismissedWasStriker) {
      innings.striker = null;
    } else {
      innings.nonStriker = null;
    }
  }

  /* Strike rotation (odd off-bat runs) — only if both positions are occupied */
  const offBatRuns = !extraType
    ? runsScored
    : extraType === "no-ball"
      ? runsScored
      : 0;
  if (innings.striker && innings.nonStriker && offBatRuns % 2 === 1) {
    [innings.striker, innings.nonStriker] = [
      innings.nonStriker,
      innings.striker,
    ];
  }
  // Leg-bye / bye runs: rotate strike on odd runs too — only if both occupied
  if (innings.striker && innings.nonStriker && (extraType === "leg-bye" || extraType === "bye") && extraRuns % 2 === 1) {
    [innings.striker, innings.nonStriker] = [
      innings.nonStriker,
      innings.striker,
    ];
  }

  /* Over complete? */
  let overComplete = false;
  if (legal && legalBallsInOver + 1 >= 6) {
    currentOver.isCompleted = true;
    currentOver.isMaiden =
      currentOver.runsInOver === 0 && currentOver.wicketsInOver === 0;
    overComplete = true;
    // End of over: rotate strike — only if both positions occupied
    if (innings.striker && innings.nonStriker) {
      [innings.striker, innings.nonStriker] = [
        innings.nonStriker,
        innings.striker,
      ];
    }
    innings.totalOvers = Math.floor(innings.totalBalls / 6);
    if (newBowlerId) {
      innings.previousBowler = innings.currentBowler;
      innings.currentBowler = newBowlerId;
      const exists = innings.bowlerFigures.find(
        (b) => String(b.playerId) === String(newBowlerId),
      );
      if (!exists) {
        innings.bowlerFigures.push({
          playerId: newBowlerId,
          order: innings.bowlerFigures.length + 1,
        });
      }
    }
  }

  /* CRR / RRR / Projected */
  innings.currentRunRate = calculateCRR(innings.totalRuns, innings.totalBalls);
  const totalBalls = match.overs * 6;
  innings.projectedScore = calculateProjection(
    innings.totalRuns,
    innings.totalBalls,
    totalBalls,
  );
  if (innings.target) {
    innings.requiredRunRate = calculateRRR(
      innings.target,
      innings.totalRuns,
      totalBalls - innings.totalBalls,
    );
  }

  /* Innings end check — use dynamic threshold */
  let inningsEnded = false;
  if (innings.totalWickets >= allOutThreshold || innings.totalBalls >= match.overs * 6) {
    innings.status = "completed";
    inningsEnded = true;
  }
  if (innings.target && innings.totalRuns >= innings.target) {
    innings.status = "completed";
    inningsEnded = true;
  }

  await Promise.all([currentOver.save(), innings.save()]);

  /* Milestone */
  let milestone = null;
  if (batter) {
    const prevRuns = batter.runs - (offBatRuns || 0);
    milestone = detectMilestone(prevRuns, batter.runs);
  }

  const io = req.app.get("io");
  emitMatchEvent(io, match._id, "ball:update", {
    matchId: match._id,
    inningsId: innings._id,
    ball,
    innings,
    overComplete,
    milestone,
  });

  if (inningsEnded) {
    if (match.currentInningsNumber === 1) {
      match.status = "innings-break";
      await match.save();
      emitMatchEvent(io, match._id, "innings:change", {
        completedInnings: 1,
        target: innings.totalRuns + 1,
      });
    } else {
      // Match end
      await finalizeMatch(match._id, io);
    }
  }

  res.json({ ball, innings, overComplete, milestone, inningsEnded, needNewBatter, allOutThreshold });
});

async function finalizeMatch(matchId, io) {
  const match = await Match.findById(matchId).populate("innings");
  const [i1, i2] = match.innings;
  let resultText = "";
  let winner = null;
  let margin = 0;
  let marginType = "no-result";

  if (i1.totalRuns > i2.totalRuns) {
    winner = i1.battingTeam;
    margin = i1.totalRuns - i2.totalRuns;
    marginType = "runs";
    resultText = `Won by ${margin} runs`;
  } else if (i2.totalRuns > i1.totalRuns) {
    winner = i2.battingTeam;
    const allOutThreshold2 = await getAllOutThreshold(i2);
    margin = allOutThreshold2 - i2.totalWickets;
    marginType = "wickets";
    resultText = `Won by ${margin} wickets`;
  } else {
    marginType = "tie";
    resultText = "Match Tied";
  }

  match.result = { winner, resultText, margin, marginType };
  match.status = "completed";
  await match.save();

  // Create appearances + update career stats (background style)
  setImmediate(async () => {
    try {
      await createAppearances(matchId);
      if (match.tournamentId) await recomputePointsTable(match.tournamentId);
    } catch (e) {
      console.error("Post-match job failed:", e);
    }
  });

  emitMatchEvent(io, matchId, "match:end", { result: match.result });
}

/* ---------------- 2nd innings start ---------------- */
export const startSecondInnings = asyncHandler(async (req, res) => {
  const match = req.match;
  if (match.status !== "innings-break")
    return res.status(400).json({ message: "Not in innings break" });

  const { openingStriker, openingNonStriker, openingBowler } = req.body;
  const firstInnings = await Innings.findById(match.innings[0]);
  const target = firstInnings.totalRuns + 1;

  const innings = await Innings.create({
    matchId: match._id,
    battingTeam: firstInnings.bowlingTeam,
    bowlingTeam: firstInnings.battingTeam,
    inningsNumber: 2,
    striker: openingStriker,
    nonStriker: openingNonStriker,
    currentBowler: openingBowler,
    target,
    powerplayOvers: match.powerplayOvers,
    batterScores: [
      { playerId: openingStriker, order: 1 },
      { playerId: openingNonStriker, order: 2 },
    ],
    bowlerFigures: [{ playerId: openingBowler, order: 1 }],
  });

  await Over.create({
    inningsId: innings._id,
    overNumber: 0,
    bowlerId: openingBowler,
    balls: [],
  });

  match.innings.push(innings._id);
  match.currentInningsNumber = 2;
  match.status = "live";
  await match.save();

  const io = req.app.get("io");
  emitMatchEvent(io, match._id, "match:status", {
    status: match.status,
    innings,
  });
  res.json({ match, innings });
});

/* ---------------- SET BATTER (no ball recorded) ---------------- */
export const setBatter = asyncHandler(async (req, res) => {
  const match = req.match;
  if (match.status !== "live")
    return res.status(400).json({ message: "Match not live" });

  const innings = await Innings.findById(
    match.innings[match.currentInningsNumber - 1],
  );
  if (!innings || innings.status !== "live")
    return res.status(400).json({ message: "No live innings" });

  const { newBatterId } = req.body;
  if (!newBatterId)
    return res.status(400).json({ message: "newBatterId required" });

  // Add new batter to batterScores
  const exists = innings.batterScores.find(
    (b) => String(b.playerId) === String(newBatterId),
  );
  if (!exists) {
    innings.batterScores.push({
      playerId: newBatterId,
      order: innings.batterScores.length + 1,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
    });
  }

  // Fill the empty slot — the wicket handler nulls out the dismissed position
  if (!innings.striker) {
    innings.striker = newBatterId;
  } else if (!innings.nonStriker) {
    innings.nonStriker = newBatterId;
  } else {
    // Both occupied — check isOut as fallback
    const strikerScore = innings.batterScores.find(b => String(b.playerId) === String(innings.striker));
    const nonStrikerScore = innings.batterScores.find(b => String(b.playerId) === String(innings.nonStriker));
    if (strikerScore?.isOut) {
      innings.striker = newBatterId;
    } else if (nonStrikerScore?.isOut) {
      innings.nonStriker = newBatterId;
    }
  }

  await innings.save();

  const io = req.app.get("io");
  emitMatchEvent(io, match._id, "ball:update", {
    matchId: match._id,
    inningsId: innings._id,
    innings,
    batterChanged: true,
  });

  res.json({ ok: true, innings });
});

/* ---------------- SET BOWLER (no ball recorded) ---------------- */
export const setBowler = asyncHandler(async (req, res) => {
  const match = req.match;
  if (match.status !== "live")
    return res.status(400).json({ message: "Match not live" });

  const innings = await Innings.findById(
    match.innings[match.currentInningsNumber - 1],
  );
  if (!innings || innings.status !== "live")
    return res.status(400).json({ message: "No live innings" });

  const { newBowlerId } = req.body;
  if (!newBowlerId)
    return res.status(400).json({ message: "newBowlerId required" });

  innings.previousBowler = innings.currentBowler;
  innings.currentBowler = newBowlerId;
  const exists = innings.bowlerFigures.find(
    (b) => String(b.playerId) === String(newBowlerId),
  );
  if (!exists) {
    innings.bowlerFigures.push({
      playerId: newBowlerId,
      order: innings.bowlerFigures.length + 1,
    });
  }

  // Create the new over
  const lastOver = await Over.findOne({ inningsId: innings._id }).sort("-overNumber");
  if (!lastOver || lastOver.isCompleted) {
    const newOverNumber = lastOver ? lastOver.overNumber + 1 : 0;
    await Over.create({
      inningsId: innings._id,
      overNumber: newOverNumber,
      bowlerId: newBowlerId,
      balls: [],
    });
  }

  await innings.save();

  const io = req.app.get("io");
  emitMatchEvent(io, match._id, "ball:update", {
    matchId: match._id,
    inningsId: innings._id,
    innings,
    bowlerChanged: true,
  });

  res.json({ ok: true, innings });
});

/* ---------------- END INNINGS (manual) ---------------- */
export const endInnings = asyncHandler(async (req, res) => {
  const match = req.match;
  if (match.status !== "live")
    return res.status(400).json({ message: "Match not live" });

  const innings = await Innings.findById(
    match.innings[match.currentInningsNumber - 1],
  );
  if (!innings || innings.status !== "live")
    return res.status(400).json({ message: "No live innings" });

  innings.status = "completed";
  await innings.save();

  const io = req.app.get("io");

  if (match.currentInningsNumber === 1) {
    match.status = "innings-break";
    await match.save();
    emitMatchEvent(io, match._id, "innings:change", {
      completedInnings: 1,
      target: innings.totalRuns + 1,
    });
  } else {
    await finalizeMatch(match._id, io);
  }

  res.json({ ok: true });
});

/* ---------------- Undo last ball (FULL REVERT) ---------------- */
export const undoLastBall = asyncHandler(async (req, res) => {
  const match = req.match;
  const innings = await Innings.findById(
    match.innings[match.currentInningsNumber - 1],
  );
  if (!innings) return res.status(400).json({ message: "No innings" });

  const lastBall = await Ball.findOne({ inningsId: innings._id }).sort(
    "-createdAt",
  );
  if (!lastBall) return res.status(400).json({ message: "No ball to undo" });
  if (Date.now() - new Date(lastBall.createdAt).getTime() > 120_000) {
    return res.status(400).json({ message: "Undo window expired (2 min)" });
  }

  /* ---- Revert innings totals ---- */
  innings.totalRuns -= lastBall.runsScored;
  if (lastBall.isLegalDelivery) innings.totalBalls -= 1;

  if (lastBall.extraType === "wide")
    innings.extras.wides -= lastBall.extraRuns;
  if (lastBall.extraType === "no-ball")
    innings.extras.noBalls -= lastBall.extraRuns;
  if (lastBall.extraType === "leg-bye") innings.extras.legByes -= lastBall.extraRuns;
  if (lastBall.extraType === "bye") innings.extras.byes -= lastBall.extraRuns;
  if (lastBall.extraType === "penalty") innings.extras.penalties -= lastBall.extraRuns;

  /* ---- Revert batter stats ---- */
  const batter = innings.batterScores.find(
    (b) => String(b.playerId) === String(lastBall.batterId),
  );
  if (batter) {
    if (lastBall.isLegalDelivery) batter.balls -= 1;
    const offBat = !lastBall.extraType
      ? lastBall.runsScored
      : lastBall.extraType === "no-ball"
        ? lastBall.runsScored - lastBall.extraRuns
        : 0;
    batter.runs -= offBat;
    if (offBat === 4) batter.fours -= 1;
    if (offBat === 6) batter.sixes -= 1;
    batter.strikeRate = batter.balls
      ? +((batter.runs / batter.balls) * 100).toFixed(2)
      : 0;
  }

  /* ---- Revert bowler stats ---- */
  const bowlerFig = innings.bowlerFigures.find(
    (b) => String(b.playerId) === String(lastBall.bowlerId),
  );
  if (bowlerFig) {
    if (lastBall.isLegalDelivery) bowlerFig.balls -= 1;
    const charged =
      lastBall.extraType === "bye" || lastBall.extraType === "leg-bye" || lastBall.extraType === "penalty"
        ? 0
        : lastBall.runsScored;
    bowlerFig.runs -= charged;
    if (lastBall.extraType === "wide") bowlerFig.wides -= lastBall.extraRuns;
    if (lastBall.extraType === "no-ball") bowlerFig.noBalls -= 1;
    if (lastBall.isWicket && lastBall.wicket?.bowlerCredited) bowlerFig.wickets -= 1;
    bowlerFig.overs = +(
      Math.floor(bowlerFig.balls / 6) +
      (bowlerFig.balls % 6) / 10
    ).toFixed(1);
    bowlerFig.economy = bowlerFig.balls
      ? +((bowlerFig.runs / bowlerFig.balls) * 6).toFixed(2)
      : 0;
  }

  /* ---- Revert wicket ---- */
  if (lastBall.isWicket && lastBall.wicket) {
    innings.totalWickets -= 1;
    // Remove last FOW entry
    if (innings.fallOfWickets.length > 0) {
      innings.fallOfWickets.pop();
    }
    // Un-dismiss batter
    const dismissed = innings.batterScores.find(
      (b) => String(b.playerId) === String(lastBall.wicket.dismissedPlayerId),
    );
    if (dismissed) {
      dismissed.isOut = false;
      dismissed.dismissalType = undefined;
      dismissed.dismissedBy = undefined;
      dismissed.fielder = undefined;
    }
    // Remove the new batter that was added after wicket (last entry)
    const lastBatterEntry = innings.batterScores[innings.batterScores.length - 1];
    if (
      lastBatterEntry &&
      String(lastBatterEntry.playerId) !== String(lastBall.batterId) &&
      String(lastBatterEntry.playerId) !== String(lastBall.nonStrikerId) &&
      lastBatterEntry.balls === 0 && lastBatterEntry.runs === 0
    ) {
      innings.batterScores.pop();
    }
  }

  /* ---- Restore striker/nonStriker ---- */
  innings.striker = lastBall.batterId;
  innings.nonStriker = lastBall.nonStrikerId;

  /* ---- Revert over state ---- */
  const over = await Over.findById(lastBall.overId);
  if (over) {
    over.balls = over.balls.filter((b) => String(b) !== String(lastBall._id));
    over.runsInOver -= lastBall.runsScored;
    if (lastBall.isWicket) over.wicketsInOver -= 1;
    if (over.isCompleted) over.isCompleted = false;
    if (over.isMaiden) over.isMaiden = false;
    await over.save();
  }

  /* ---- Recompute CRR / projected ---- */
  innings.currentRunRate = innings.totalBalls > 0 ? calculateCRR(innings.totalRuns, innings.totalBalls) : 0;
  const totalBallsInMatch = match.overs * 6;
  innings.projectedScore = innings.totalBalls > 0
    ? calculateProjection(innings.totalRuns, innings.totalBalls, totalBallsInMatch)
    : 0;
  if (innings.target) {
    innings.requiredRunRate = calculateRRR(
      innings.target,
      innings.totalRuns,
      totalBallsInMatch - innings.totalBalls,
    );
  }
  innings.totalOvers = Math.floor(innings.totalBalls / 6);

  // If innings was completed, reopen it
  if (innings.status === "completed") {
    innings.status = "live";
    if (match.status === "innings-break" || match.status === "completed") {
      match.status = "live";
      await match.save();
    }
  }

  await Ball.deleteOne({ _id: lastBall._id });
  await innings.save();

  const io = req.app.get("io");
  emitMatchEvent(io, match._id, "ball:undo", { ballId: lastBall._id, innings });
  res.json({ ok: true, innings });
});

/* ---------------- End match (manual) ---------------- */
export const endMatch = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  await finalizeMatch(req.match._id, io);
  res.json({ ok: true });
});
