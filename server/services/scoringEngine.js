/**
 * Pure scoring helpers. All inputs immutable; returns new state.
 */

export const isLegalDelivery = (ball) =>
  !(ball.extraType === "wide" || ball.extraType === "no-ball");

export const shouldRotateStrike = (ball) => {
  if (ball.isWicket && ball.wicket?.type !== "run-out") return false;
  // Total runs that crossed (excluding wide/penalty) determine strike rotation
  const runs = ball.runsScored;
  return runs % 2 === 1;
};

export const isOverComplete = (legalBallsInOver) => legalBallsInOver >= 6;

export const calculateCRR = (runs, legalBalls) => {
  if (!legalBalls) return 0;
  return +(runs / (legalBalls / 6)).toFixed(2);
};

export const calculateRRR = (target, runs, ballsLeft) => {
  if (!ballsLeft || ballsLeft <= 0) return 0;
  const need = target - runs;
  if (need <= 0) return 0;
  return +(need / (ballsLeft / 6)).toFixed(2);
};

export const calculateProjection = (runs, legalBalls, totalBalls) => {
  if (!legalBalls) return 0;
  return Math.round((runs / legalBalls) * totalBalls);
};

export const calculateNRR = (runs, overs, oppRuns, oppOvers) => {
  if (!overs || !oppOvers) return 0;
  return +(runs / overs - oppRuns / oppOvers).toFixed(3);
};

export const detectMilestone = (prevRuns, newRuns) => {
  if (prevRuns < 50 && newRuns >= 50 && newRuns < 100) return "fifty";
  if (prevRuns < 100 && newRuns >= 100) return "hundred";
  return null;
};

/**
 * processBall: takes innings + ball input → returns side-effects to apply.
 * The controller persists the state.
 */
export function processBall(innings, ball) {
  const legal = isLegalDelivery(ball);
  // Total runs added to innings = runsScored (off bat or extras already merged)
  const runsAdded = (ball.runsScored || 0) + (ball.extraRuns || 0);

  return {
    legal,
    runsAdded,
    rotate: shouldRotateStrike(ball),
    isWicket: !!ball.isWicket,
    boundary: ball.isBoundary,
  };
}

export const formatOvers = (legalBalls) => {
  const fullOvers = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return parseFloat(`${fullOvers}.${balls}`);
};
