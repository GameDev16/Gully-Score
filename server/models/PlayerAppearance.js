import mongoose from "mongoose";

const PlayerAppearanceSchema = new mongoose.Schema(
  {
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
      index: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },
    inningsId: { type: mongoose.Schema.Types.ObjectId, ref: "Innings" },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
    matchDate: Date,
    matchTitle: String,
    format: String,
    oppositionTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    venueName: String,
    batting: {
      didBat: { type: Boolean, default: false },
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },
      dismissalType: String,
      dismissedBy: String,
      fielder: String,
      isNotOut: { type: Boolean, default: false },
      battingPosition: Number,
    },
    bowling: {
      didBowl: { type: Boolean, default: false },
      overs: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      runs: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      economy: { type: Number, default: 0 },
      noBalls: { type: Number, default: 0 },
      wides: { type: Number, default: 0 },
    },
    isWicketkeeper: { type: Boolean, default: false },
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PlayerAppearanceSchema.index({ playerId: 1, matchDate: -1 });

export const PlayerAppearance = mongoose.model(
  "PlayerAppearance",
  PlayerAppearanceSchema,
);
