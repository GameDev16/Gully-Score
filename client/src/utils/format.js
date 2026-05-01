export const formatOvers = (legalBalls = 0) => {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return `${o}.${b}`;
};

export const calcAge = (dob) => {
  if (!dob) return null;
  const ms = Date.now() - new Date(dob).getTime();
  return Math.floor(ms / (365.25 * 24 * 3600 * 1000));
};

export const sr = (runs, balls) =>
  balls ? +((runs / balls) * 100).toFixed(2) : 0;
export const econ = (runs, overs) => (overs ? +(runs / overs).toFixed(2) : 0);
