import mongoose from "mongoose";

const BatterScoreSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    dismissalType: String,
    dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    fielder: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    isOut: { type: Boolean, default: false },
    order: Number,
  },
  { _id: false },
);

const BowlerFigureSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    order: Number,
  },
  { _id: false },
);

const FOWSchema = new mongoose.Schema(
  {
    wicketNumber: Number,
    runs: Number,
    over: Number,
    batterId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  },
  { _id: false },
);

const InningsSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
      index: true,
    },
    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    inningsNumber: { type: Number, enum: [1, 2], required: true },
    totalRuns: { type: Number, default: 0 },
    totalWickets: { type: Number, default: 0 },
    totalBalls: { type: Number, default: 0 },
    totalOvers: { type: Number, default: 0 },
    extras: {
      wides: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      legByes: { type: Number, default: 0 },
      byes: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
    },
    target: Number,
    requiredRunRate: Number,
    currentRunRate: { type: Number, default: 0 },
    projectedScore: { type: Number, default: 0 },
    powerplayOvers: { type: Number, default: 6 },
    batterScores: [BatterScoreSchema],
    bowlerFigures: [BowlerFigureSchema],
    fallOfWickets: [FOWSchema],
    overHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Over" }],
    striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    previousBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    status: { type: String, enum: ["live", "completed"], default: "live" },
  },
  { timestamps: true },
);

export const Innings = mongoose.model("Innings", InningsSchema);
