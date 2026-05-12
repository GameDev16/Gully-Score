import { Notification } from "../models/Notification.js";

export async function notify(userId, { type, message, link }) {
  if (!userId) return;
  const n = await Notification.create({ userId, type, message, link });
  return n;
}

export async function notifyScorerAssigned(scorerId, match) {
  return notify(scorerId, {
    type: "scorer_assigned",
    message: `You've been assigned to score "${match.title}"`,
    link: `/score/${match._id}`,
  });
}

export async function notifyMatchStarting(userIds, match) {
  return Promise.all(
    userIds.map((uid) =>
      notify(uid, {
        type: "match_starting",
        message: `${match.title} is starting soon`,
        link: `/matches/${match._id}`,
      }),
    ),
  );
}
