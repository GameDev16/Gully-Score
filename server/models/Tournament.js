import mongoose from 'mongoose';

const PointsRowSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    tied: { type: Number, default: 0 },
    nrr: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { _id: false }
);

const TournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortCode: { type: String, unique: true, uppercase: true, index: true },
    description: String,
    format: { type: String, enum: ['T10', 'T20', 'ODI', 'Test', 'Custom'], default: 'T20' },
    overs: { type: Number, default: 20 },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
    venue: String,
    startDate: Date,
    endDate: Date,
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    pointsTable: [PointsRowSchema],
    banner_image: String,
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TournamentSchema.index({ name: 'text', description: 'text' });

export const Tournament = mongoose.model('Tournament', TournamentSchema);