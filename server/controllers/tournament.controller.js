import { Tournament } from "../models/Tournament.js";
import { Match } from "../models/Match.js";
import { Team } from "../models/Team.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { genShortCode } from "../utils/ids.js";

export const list = asyncHandler(async (req, res) => {
  const { q, status, format } = req.query;
  const filter = { isPublic: true };
  if (status) filter.status = status;
  if (format) filter.format = format;
  if (q)
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { shortCode: q.toUpperCase() },
    ];
  const list = await Tournament.find(filter).sort("-createdAt").limit(50);
  res.json(list);
});

export const detail = asyncHandler(async (req, res) => {
  const t = await Tournament.findById(req.params.id)
    .populate("teams")
    .populate({ path: "matches", populate: ["teamA", "teamB"] });
  if (!t) return res.status(404).json({ message: "Tournament not found" });
  res.json(t);
});

export const findByCode = asyncHandler(async (req, res) => {
  const t = await Tournament.findOne({
    shortCode: req.params.code.toUpperCase(),
  })
    .populate("teams")
    .populate({ path: "matches", populate: ["teamA", "teamB"] });
  if (!t) return res.status(404).json({ message: "Not found" });
  res.json(t);
});

export const create = asyncHandler(async (req, res) => {
  let shortCode;
  for (let i = 0; i < 5; i++) {
    shortCode = genShortCode();
    if (!(await Tournament.exists({ shortCode }))) break;
  }
  const t = await Tournament.create({
    ...req.body,
    shortCode,
    hostId: req.user._id,
  });
  res.status(201).json(t);
});

export const update = asyncHandler(async (req, res) => {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ message: "Not found" });
  if (String(t.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  Object.assign(t, req.body);
  await t.save();
  res.json(t);
});

export const remove = asyncHandler(async (req, res) => {
  const t = await Tournament.findById(req.params.id);
  if (!t) return res.status(404).json({ message: "Not found" });
  if (String(t.hostId) !== String(req.user._id))
    return res.status(403).json({ message: "Forbidden" });
  await t.deleteOne();
  res.json({ ok: true });
});
