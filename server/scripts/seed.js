import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Team } from "../models/Team.js";
import { Player } from "../models/Player.js";
import { Tournament } from "../models/Tournament.js";
import { Match } from "../models/Match.js";
import { genShortCode, genMatchKey } from "../utils/ids.js";

async function run() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    Tournament.deleteMany({}),
    Match.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("password123", 10);
  const host = await User.create({
    name: "Demo Host",
    email: "host@pitchday.com",
    passwordHash,
  });

  const t = await Tournament.create({
    name: "PitchDay Champions Cup",
    shortCode: genShortCode(),
    format: "T20",
    overs: 20,
    hostId: host._id,
    status: "live",
    description: "Demo tournament for testing all features",
  });

  const teamNames = [
    { name: "Mumbai Mavericks", short: "MUM" },
    { name: "Delhi Dynamos", short: "DEL" },
    { name: "Chennai Chargers", short: "CHE" },
    { name: "Bangalore Blasters", short: "BLR" },
  ];

  const teams = await Promise.all(
    teamNames.map(({ name, short }) =>
      Team.create({
        name,
        shortName: short,
        tournamentId: t._id,
        hostId: host._id,
      }),
    ),
  );
  t.teams = teams.map((x) => x._id);
  await t.save();

  const roles = ["batsman", "bowler", "allrounder", "wicketkeeper"];
  for (const team of teams) {
    const players = await Promise.all(
      Array.from({ length: 11 }).map((_, i) =>
        Player.create({
          name: `${team.shortName} Player ${i + 1}`,
          role: roles[i % 4],
          battingStyle: i % 5 === 0 ? "left-hand" : "right-hand",
          bowlingStyle: i % 3 === 0 ? "right-arm-fast" : "right-arm-spin",
          jerseyNumber: i + 1,
          teamId: team._id,
        }),
      ),
    );
    team.players = players.map((p) => p._id);
    team.captain = players[0]._id;
    await team.save();
  }

  await Match.create({
    matchKey: genMatchKey(),
    title: "Match 1: MUM vs DEL",
    format: "T20",
    overs: 20,
    teamA: teams[0]._id,
    teamB: teams[1]._id,
    tournamentId: t._id,
    hostId: host._id,
    scorerId: host._id,
    status: "upcoming",
  });

  console.log("✅ Seed complete");
  console.log("Login: host@pitchday.com / password123");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
