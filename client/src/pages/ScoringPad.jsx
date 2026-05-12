import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import api from "../api/client.js";
import toast from "react-hot-toast";
import { useMatchSocket } from "../hooks/useMatchSocket.js";
import { formatOvers } from "../utils/format.js";

export default function ScoringPad() {
  const { matchId } = useParams();
  const [extraType, setExtraType] = useState(null);
  const [showWicket, setShowWicket] = useState(false);
  const [needNewBowler, setNeedNewBowler] = useState(false);
  const [needNewBatter, setNeedNewBatter] = useState(false);
  const [lastDismissedId, setLastDismissedId] = useState(null);

  const { data: match, refetch } = useQuery({
    queryKey: ["scoring-match", matchId],
    queryFn: async () => (await api.get(`/api/matches/${matchId}/state`)).data,
    refetchInterval: 5000,
  });

  useMatchSocket(matchId, { onBall: () => refetch() });

  const innings = useMemo(
    () => match?.innings?.[match?.currentInningsNumber - 1],
    [match],
  );

  useEffect(() => {
    if (match && innings && innings.status === "live") {
      // The backend now nulls the dismissed batter's position,
      // so if either striker or nonStriker is null/missing, we need a new batter
      const allOut = innings.battingTeam?.players?.length ? innings.battingTeam.players.length - 1 : 10;
      const hasMissingSlot = !innings.striker || !innings.nonStriker;
      const notAllOut = innings.totalWickets < allOut;
      
      if (hasMissingSlot && notAllOut) {
        setNeedNewBatter(true);
      }
    }
  }, [match, innings]);

  const submitBall = async (payload) => {
    try {
      const { data } = await api.post(`/api/scoring/${matchId}/ball`, payload);
      if (data.overComplete) setNeedNewBowler(true);
      if (data.needNewBatter) {
        setNeedNewBatter(true);
        // Track the dismissed player so we can exclude them from the picker
        if (payload.isWicket && payload.wicket?.dismissedPlayerId) {
          setLastDismissedId(payload.wicket.dismissedPlayerId);
        }
      }
      if (data.milestone)
        toast.success(
          `🏏 ${data.milestone === "fifty" ? "Fifty!" : "Hundred!"}`,
        );
      setExtraType(null);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const changeBowler = async (newBowlerId) => {
    try {
      await api.post(`/api/scoring/${matchId}/set-bowler`, { newBowlerId });
      setNeedNewBowler(false);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to set bowler");
    }
  };

  const changeBatter = async (newBatterId) => {
    try {
      await api.post(`/api/scoring/${matchId}/set-batter`, { newBatterId });
      setNeedNewBatter(false);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to set batter");
    }
  };

  const undo = async () => {
    try {
      await api.delete(`/api/scoring/${matchId}/ball/undo`);
      toast.success("Last ball undone");
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const endInningsManual = async () => {
    if (!confirm("Are you sure you want to end this innings?")) return;
    try {
      await api.post(`/api/scoring/${matchId}/innings-end`);
      toast.success("Innings ended");
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  if (!match) return <div className="p-10 text-center">Loading…</div>;

  if (match.status === "upcoming" || match.status === "toss") {
    return <TossSetup match={match} onDone={refetch} />;
  }
  if (match.status === "innings-break") {
    return <SecondInningsSetup match={match} onDone={refetch} />;
  }
  if (match.status === "completed") {
    return <MatchEndScreen match={match} />;
  }

  // Build set of out player IDs
  const outPlayerIds = new Set(
    (innings?.batterScores || [])
      .filter((b) => b.isOut)
      .map((b) => String(b.playerId?._id || b.playerId)),
  );
  // Also add the just-dismissed player from the current wicket action
  if (lastDismissedId) outPlayerIds.add(String(lastDismissedId));

  const battingTeam =
    String(innings?.battingTeam?._id || innings?.battingTeam) === String(match.teamA?._id || match.teamA)
      ? match.teamA
      : match.teamB;
  const bowlingTeam =
    String(battingTeam?._id || battingTeam) === String(match.teamA?._id || match.teamA) ? match.teamB : match.teamA;

  // Resolve player names from populated data
  const strikerId = String(innings?.striker?._id || innings?.striker || "");
  const nonStrikerId = String(innings?.nonStriker?._id || innings?.nonStriker || "");
  const bowlerId = String(innings?.currentBowler?._id || innings?.currentBowler || "");

  const findPlayerName = (id, team) => {
    if (!id) return "Unknown";
    // Check innings populated refs
    const fromBatter = innings?.batterScores?.find(b => String(b.playerId?._id || b.playerId) === id);
    if (fromBatter?.playerId?.name) return fromBatter.playerId.name;
    // Check team players
    const fromTeam = team?.players?.find(p => String(p._id) === id);
    if (fromTeam?.name) return fromTeam.name;
    return "Unknown";
  };

  const strikerName = innings?.striker 
    ? (innings?.striker?.name || findPlayerName(strikerId, battingTeam))
    : "Awaiting new batter…";
  const nonStrikerName = innings?.nonStriker 
    ? (innings?.nonStriker?.name || findPlayerName(nonStrikerId, battingTeam))
    : "Awaiting new batter…";
  const bowlerName = innings?.currentBowler?.name || findPlayerName(bowlerId, bowlingTeam);

  const strikerScore = innings?.batterScores?.find(b => String(b.playerId?._id || b.playerId) === strikerId);
  const nonStrikerScore = innings?.batterScores?.find(b => String(b.playerId?._id || b.playerId) === nonStrikerId);
  const bowlerScore = innings?.bowlerFigures?.find(b => String(b.playerId?._id || b.playerId) === bowlerId);

  const runButtons = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Score Header */}
      <div className="card p-4 sticky top-14 z-10">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500">
              {battingTeam?.name} — Innings {innings.inningsNumber}
            </div>
            <div className="score-mono text-3xl font-bold">
              {innings.totalRuns}/{innings.totalWickets}
            </div>
          </div>
          <div className="text-sm text-slate-500 score-mono text-right">
            <div>{formatOvers(innings.totalBalls)} / {match.overs} ov</div>
            {innings.target && (
              <div className="text-xs">
                Need {innings.target - innings.totalRuns} off {match.overs * 6 - innings.totalBalls} balls
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Players */}
      <div className="card p-4 space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <div className="font-semibold">
            <span className="text-primary-600">⚡</span> {strikerName}*
          </div>
          <span className="font-mono text-base">
            {strikerScore?.runs ?? 0}({strikerScore?.balls ?? 0})
            {strikerScore?.fours ? ` · ${strikerScore.fours}×4` : ""}
            {strikerScore?.sixes ? ` · ${strikerScore.sixes}×6` : ""}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <div>{nonStrikerName}</div>
          <span className="font-mono">
            {nonStrikerScore?.runs ?? 0}({nonStrikerScore?.balls ?? 0})
          </span>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between items-center text-slate-600 dark:text-slate-400">
          <div>🎳 {bowlerName}</div>
          <span className="font-mono text-xs">
            {bowlerScore?.overs?.toFixed(1) ?? "0.0"}-{bowlerScore?.maidens ?? 0}-{bowlerScore?.runs ?? 0}-{bowlerScore?.wickets ?? 0}
          </span>
        </div>
      </div>

      {/* New Batter picker */}
      {needNewBatter && (
        <PickPlayer
          label="Select new batter"
          team={battingTeam}
          excludeIds={[
            ...outPlayerIds,
            strikerId,
            nonStrikerId,
          ]}
          onPick={(playerId) => {
            setNeedNewBatter(false);
            setLastDismissedId(null);
            changeBatter(playerId);
          }}
        />
      )}

      {/* New Bowler picker — calls setBowler, NOT submitBall */}
      {needNewBowler && (
        <PickPlayer
          label="Select next bowler (cannot bowl consecutive overs)"
          team={bowlingTeam}
          excludeIds={[bowlerId]}
          onPick={(playerId) => {
            changeBowler(playerId);
          }}
        />
      )}

      {/* Run buttons (Hidden if action required) */}
      {!needNewBatter && !needNewBowler && (
      <div className="card p-4">
        <div className="text-xs font-semibold text-slate-500 mb-2">RUNS</div>
        <div className="grid grid-cols-7 gap-2">
          {runButtons.map((r) => (
            <button
              key={r}
              onClick={() => {
                let actualRuns = r;
                let actualExtras = 0;
                
                if (extraType === "wide") {
                  actualExtras = 1 + r; // 1 penalty + r byes
                  actualRuns = 0;
                } else if (extraType === "no-ball") {
                  actualExtras = 1; // 1 penalty
                  actualRuns = r; // run off bat
                } else if (extraType === "leg-bye" || extraType === "bye" || extraType === "penalty") {
                  actualExtras = r;
                  actualRuns = 0;
                }
                
                submitBall({
                  runsScored: actualRuns,
                  extraType,
                  extraRuns: actualExtras,
                });
              }}
              className={`py-3 rounded-lg font-bold text-lg ${
                r === 4
                  ? "bg-primary-100 text-primary-700"
                  : r === 6
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 dark:bg-slate-800"
              } hover:opacity-80`}
            >
              {extraType ? `${labelFor(extraType)}+${r}` : r}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500 mt-4 mb-2">
          EXTRAS (toggle then pick runs)
        </div>
        <div className="flex flex-wrap gap-2">
          {["wide", "no-ball", "leg-bye", "bye", "penalty"].map((e) => (
            <button
              key={e}
              onClick={() => setExtraType(extraType === e ? null : e)}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                extraType === e
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => setShowWicket(true)}
            className="bg-red-600 text-white py-3 rounded-lg font-bold"
          >
            WICKET
          </button>
          <button onClick={undo} className="btn btn-outline">
            Undo last ball
          </button>
          <button
            onClick={endInningsManual}
            className="bg-amber-600 text-white py-3 rounded-lg font-bold"
          >
            End Innings
          </button>
        </div>
      </div>
      )}

      {showWicket && (
        <WicketModal
          match={match}
          innings={innings}
          onClose={() => setShowWicket(false)}
          onSubmit={(payload) => {
            setShowWicket(false);
            submitBall(payload);
          }}
        />
      )}
    </div>
  );
}

const labelFor = (e) =>
  ({ wide: "Wd", "no-ball": "NB", "leg-bye": "LB", bye: "B", penalty: "P" })[e];

/* ---- Match End Screen ---- */
function MatchEndScreen({ match }) {
  const winner = match.result?.winner;
  const winnerName =
    winner
      ? String(winner._id || winner) === String(match.teamA?._id)
        ? match.teamA?.name
        : match.teamB?.name
      : null;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="relative flex flex-col items-center">
        <div className="text-8xl animate-bounce mb-2">🏆</div>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
      </div>

      <div className="text-center space-y-3 mt-2 max-w-sm">
        <div className="text-xs uppercase tracking-widest text-slate-400 font-medium">
          Match Completed
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-slate-100">
          {match.title}
        </h1>

        {winnerName ? (
          <>
            <div className="inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full px-5 py-1.5 font-semibold text-lg mt-1">
              🎉 {winnerName} won!
            </div>
            <div className="text-slate-500 text-sm">{match.result?.resultText}</div>
          </>
        ) : (
          <div className="text-lg font-semibold text-slate-600">
            {match.result?.resultText || "Match ended"}
          </div>
        )}
      </div>

      {match.innings?.length > 0 && (
        <div className="mt-8 w-full max-w-sm space-y-3">
          {match.innings.map((inn, i) => {
            const team =
              String(inn.battingTeam?._id || inn.battingTeam) === String(match.teamA?._id)
                ? match.teamA
                : match.teamB;
            return (
              <div key={i} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{team?.name}</div>
                  <div className="text-xs text-slate-500">Innings {i + 1}</div>
                </div>
                <div className="score-mono text-2xl font-bold">
                  {inn.totalRuns}/{inn.totalWickets}
                  <span className="text-sm font-normal text-slate-500 ml-1">
                    ({formatOvers(inn.totalBalls)})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link to={`/matches/${match._id}`} className="btn btn-outline">
          Full Scorecard
        </Link>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

/* ---- Toss Setup ---- */
function TossSetup({ match, onDone }) {
  const [tossWonBy, setTossWonBy] = useState(match.teamA?._id);
  const [tossDecision, setTossDecision] = useState("bat");
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  const battingTeam =
    tossDecision === "bat"
      ? tossWonBy === match.teamA._id
        ? match.teamA
        : match.teamB
      : tossWonBy === match.teamA._id
        ? match.teamB
        : match.teamA;
  const bowlingTeam =
    battingTeam._id === match.teamA._id ? match.teamB : match.teamA;

  const go = async () => {
    if (!striker || !nonStriker || !bowler)
      return toast.error("Pick all 3 players to start");
    try {
      await api.post(`/api/scoring/${match._id}/toss`, {
        tossWonBy,
        tossDecision,
        openingStriker: striker,
        openingNonStriker: nonStriker,
        openingBowler: bowler,
      });
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  const hasBattingPlayers = battingTeam?.players?.length > 0;
  const hasBowlingPlayers = bowlingTeam?.players?.length > 0;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Toss & Opening Lineup</h2>
      {(!hasBattingPlayers || !hasBowlingPlayers) && (
        <div className="card p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ One or both teams have no players. Add players to teams first, then return here.
        </div>
      )}
      <div className="card p-4 space-y-3">
        <label className="block">
          <div className="text-sm mb-1">Toss won by</div>
          <select className="input" value={tossWonBy} onChange={(e) => setTossWonBy(e.target.value)}>
            <option value={match.teamA._id}>{match.teamA.name}</option>
            <option value={match.teamB._id}>{match.teamB.name}</option>
          </select>
        </label>
        <label className="block">
          <div className="text-sm mb-1">Decision</div>
          <select className="input" value={tossDecision} onChange={(e) => setTossDecision(e.target.value)}>
            <option value="bat">Bat</option>
            <option value="field">Field</option>
          </select>
        </label>
        <div className="text-xs font-medium text-slate-500 uppercase pt-1">
          {battingTeam?.name} batting · {bowlingTeam?.name} bowling
        </div>
        <PlayerSelect label="Opening Striker" team={battingTeam} value={striker} onChange={setStriker} excludeIds={[nonStriker]} />
        <PlayerSelect label="Opening Non-Striker" team={battingTeam} value={nonStriker} onChange={setNonStriker} excludeIds={[striker]} />
        <PlayerSelect label="Opening Bowler" team={bowlingTeam} value={bowler} onChange={setBowler} />
        <button onClick={go} className="btn btn-primary w-full">
          Start Match ▶
        </button>
      </div>
    </div>
  );
}

/* ---- Second Innings Setup ---- */
function SecondInningsSetup({ match, onDone }) {
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");
  const i1 = match.innings[0];
  const battingTeam =
    String(i1.bowlingTeam?._id || i1.bowlingTeam) === String(match.teamA._id)
      ? match.teamA
      : match.teamB;
  const bowlingTeam =
    battingTeam._id === match.teamA._id ? match.teamB : match.teamA;

  const target = i1.totalRuns + 1;

  const go = async () => {
    if (!striker || !nonStriker || !bowler) return toast.error("Pick all 3");
    try {
      await api.post(`/api/scoring/${match._id}/innings-start`, {
        openingStriker: striker,
        openingNonStriker: nonStriker,
        openingBowler: bowler,
      });
      onDone();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">2nd Innings Setup</h2>
      <div className="card p-4 bg-primary-50 dark:bg-primary-900/20 text-sm font-medium text-primary-700 dark:text-primary-300">
        🎯 {battingTeam?.name} need {target} to win
      </div>
      <div className="card p-4 space-y-3">
        <div className="text-xs font-medium text-slate-500 uppercase">
          {battingTeam?.name} batting · {bowlingTeam?.name} bowling
        </div>
        <PlayerSelect label="Opening Striker" team={battingTeam} value={striker} onChange={setStriker} excludeIds={[nonStriker]} />
        <PlayerSelect label="Opening Non-Striker" team={battingTeam} value={nonStriker} onChange={setNonStriker} excludeIds={[striker]} />
        <PlayerSelect label="Opening Bowler" team={bowlingTeam} value={bowler} onChange={setBowler} />
        <button onClick={go} className="btn btn-primary w-full">
          Begin 2nd Innings ▶
        </button>
      </div>
    </div>
  );
}

/* ---- Reusable Components ---- */
const PlayerSelect = ({ label, team, value, onChange, excludeIds = [] }) => (
  <label className="block">
    <div className="text-sm mb-1">{label}</div>
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Select from {team?.name} —</option>
      {team?.players
        ?.filter((p) => !excludeIds.includes(String(p._id)))
        .map((p) => (
          <option key={p._id} value={p._id}>{p.name}</option>
        ))}
    </select>
  </label>
);

const PickPlayer = ({ label, team, excludeIds = [], onPick }) => {
  const available = team?.players?.filter(
    (p) => !excludeIds.includes(String(p._id)),
  );
  return (
    <div className="card p-4 border-2 border-primary-400">
      <div className="font-semibold mb-2 text-primary-700 dark:text-primary-300">
        {label}
      </div>
      {!available?.length ? (
        <p className="text-sm text-slate-500">No eligible players available.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((p) => (
            <button
              key={p._id}
              onClick={() => onPick(p._id)}
              className="btn btn-outline text-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---- Wicket Modal ---- */
function WicketModal({ match, innings, onClose, onSubmit }) {
  const [type, setType] = useState("bowled");
  const [dismissedId, setDismissedId] = useState(
    innings.striker?._id || innings.striker,
  );
  const [fielder1, setFielder1] = useState("");
  const [bowlerCredited, setBowlerCredited] = useState(true);
  const [runsBeforeWicket, setRunsBeforeWicket] = useState(0);

  const battingTeam =
    String(innings.battingTeam?._id || innings.battingTeam) === String(match.teamA._id)
      ? match.teamA
      : match.teamB;
  const bowlingTeam =
    battingTeam._id === match.teamA._id ? match.teamB : match.teamA;

  const strikerId = String(innings.striker?._id || innings.striker || "");
  const nonStrikerId = String(innings.nonStriker?._id || innings.nonStriker || "");

  const getPlayerName = (id) => {
    const p = battingTeam?.players?.find(pl => String(pl._id) === String(id));
    return p?.name || id;
  };

  const types = ["bowled", "caught", "lbw", "run-out", "stumped", "hit-wicket", "retired-hurt"];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 space-y-3">
        <h3 className="text-lg font-bold">Record Wicket</h3>

        <label className="block">
          <div className="text-sm mb-1">Dismissal Type</div>
          <select
            className="input"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setBowlerCredited(!["run-out", "retired-hurt", "obstructing-field"].includes(e.target.value));
            }}
          >
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className="block">
          <div className="text-sm mb-1">Batter Out</div>
          <select className="input" value={dismissedId} onChange={(e) => setDismissedId(e.target.value)}>
            <option value={strikerId}>{getPlayerName(strikerId)} (striker)</option>
            <option value={nonStrikerId}>{getPlayerName(nonStrikerId)} (non-striker)</option>
          </select>
        </label>

        {(type === "caught" || type === "stumped" || type === "run-out") && (
          <PlayerSelect label="Fielder" team={bowlingTeam} value={fielder1} onChange={setFielder1} />
        )}

        <label className="block">
          <div className="text-sm mb-1">Runs completed before dismissal</div>
          <input className="input" type="number" min="0" max="6" value={runsBeforeWicket} onChange={(e) => setRunsBeforeWicket(Number(e.target.value))} />
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
          <button
            onClick={() =>
              onSubmit({
                runsScored: runsBeforeWicket,
                isWicket: true,
                wicket: {
                  type,
                  dismissedPlayerId: dismissedId,
                  fielder1Id: fielder1 || null,
                  bowlerCredited,
                },
              })
            }
            className="btn btn-primary flex-1"
          >
            Record Wicket
          </button>
        </div>
      </div>
    </div>
  );
}
