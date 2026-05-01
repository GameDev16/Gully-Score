import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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

  const submitBall = async (payload) => {
    try {
      const { data } = await api.post(`/api/scoring/${matchId}/ball`, payload);
      if (data.overComplete) setNeedNewBowler(true);
      if (data.ball.isWicket && data.innings.totalWickets < 10)
        setNeedNewBatter(true);
      if (data.milestone)
        toast.success(
          `🏏 ${data.milestone === "fifty" ? "Fifty!" : "Hundred!"}`,
        );
      setExtraType(null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed");
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

  if (!match) return <div className="p-10 text-center">Loading…</div>;

  if (match.status === "upcoming" || match.status === "toss") {
    return <TossSetup match={match} onDone={refetch} />;
  }
  if (match.status === "innings-break") {
    return <SecondInningsSetup match={match} onDone={refetch} />;
  }
  if (match.status === "completed") {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold mb-2">Match Completed</h2>
        <p>{match.result?.resultText}</p>
      </div>
    );
  }

  const runButtons = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="card p-4 sticky top-14 z-10">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-slate-500">
              Innings {innings.inningsNumber}
            </div>
            <div className="score-mono text-3xl font-bold">
              {innings.totalRuns}/{innings.totalWickets}
            </div>
          </div>
          <div className="text-sm text-slate-500 score-mono">
            {formatOvers(innings.totalBalls)} / {match.overs}
          </div>
        </div>
        {innings.target && (
          <div className="mt-2 text-sm">
            Target {innings.target} · Need {innings.target - innings.totalRuns}{" "}
            from {match.overs * 6 - innings.totalBalls} balls
          </div>
        )}
      </div>

      <div className="card p-4 space-y-2 text-sm">
        <Row
          label="Striker"
          id={innings.striker}
          scores={innings.batterScores}
          mark="*"
        />
        <Row
          label="Non-Striker"
          id={innings.nonStriker}
          scores={innings.batterScores}
        />
        <Row
          label="Bowler"
          id={innings.currentBowler}
          scores={innings.bowlerFigures}
          bowler
        />
      </div>

      {needNewBatter && (
        <PickPlayer
          label="Select new batter"
          team={
            String(innings.battingTeam) === String(match.teamA._id)
              ? match.teamA
              : match.teamB
          }
          excludeIds={innings.batterScores.map((b) => String(b.playerId))}
          onPick={(playerId) => {
            setNeedNewBatter(false);
            submitBall({
              runsScored: 0,
              _newBatterPending: true,
              newBatterId: playerId,
            });
          }}
        />
      )}
      {needNewBowler && (
        <PickPlayer
          label="Select next bowler (cannot be previous)"
          team={
            String(innings.bowlingTeam) === String(match.teamA._id)
              ? match.teamA
              : match.teamB
          }
          excludeIds={[String(innings.currentBowler)]}
          onPick={(playerId) => {
            setNeedNewBowler(false);
            submitBall({ runsScored: 0, newBowlerId: playerId });
          }}
        />
      )}

      <div className="card p-4">
        <div className="text-xs font-semibold text-slate-500 mb-2">RUNS</div>
        <div className="grid grid-cols-7 gap-2">
          {runButtons.map((r) => (
            <button
              key={r}
              onClick={() =>
                submitBall({
                  runsScored: r,
                  extraType,
                  extraRuns: extraType ? r : 0,
                })
              }
              className={`py-3 rounded-lg font-bold text-lg ${
                r === 4
                  ? "bg-primary-100 text-primary-700"
                  : r === 6
                    ? "bg-accent/30 text-amber-800"
                    : "bg-slate-100 dark:bg-slate-800"
              } hover:opacity-80`}
            >
              {extraType ? `${labelFor(extraType)}+${r}` : r}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500 mt-4 mb-2">
          EXTRAS (toggle then pick a run)
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

        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setShowWicket(true)}
            className="bg-danger text-white py-3 rounded-lg font-bold"
          >
            WICKET
          </button>
          <button onClick={undo} className="btn btn-outline">
            Undo last ball
          </button>
        </div>
      </div>

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

const Row = ({ label, id, scores, bowler, mark = "" }) => {
  const s = scores?.find(
    (x) => String(x.playerId?._id || x.playerId) === String(id?._id || id),
  );
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">
        {label}
        {mark}
      </span>
      <span className="font-mono">
        {bowler
          ? `${s?.overs?.toFixed(1) || "0.0"}-${s?.maidens || 0}-${s?.runs || 0}-${s?.wickets || 0}`
          : `${s?.runs || 0}(${s?.balls || 0})`}
      </span>
    </div>
  );
};

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
      return toast.error("Pick all 3 players");
    await api.post(`/api/scoring/${match._id}/toss`, {
      tossWonBy,
      tossDecision,
      openingStriker: striker,
      openingNonStriker: nonStriker,
      openingBowler: bowler,
    });
    onDone();
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Toss & Lineup</h2>
      <div className="card p-4 space-y-3">
        <label className="block">
          <div className="text-sm mb-1">Toss won by</div>
          <select
            className="input"
            value={tossWonBy}
            onChange={(e) => setTossWonBy(e.target.value)}
          >
            <option value={match.teamA._id}>{match.teamA.name}</option>
            <option value={match.teamB._id}>{match.teamB.name}</option>
          </select>
        </label>
        <label className="block">
          <div className="text-sm mb-1">Decision</div>
          <select
            className="input"
            value={tossDecision}
            onChange={(e) => setTossDecision(e.target.value)}
          >
            <option value="bat">Bat</option>
            <option value="field">Field</option>
          </select>
        </label>
        <PlayerSelect
          label="Striker"
          team={battingTeam}
          value={striker}
          onChange={setStriker}
        />
        <PlayerSelect
          label="Non-striker"
          team={battingTeam}
          value={nonStriker}
          onChange={setNonStriker}
          excludeIds={[striker]}
        />
        <PlayerSelect
          label="Opening Bowler"
          team={bowlingTeam}
          value={bowler}
          onChange={setBowler}
        />
        <button onClick={go} className="btn btn-primary w-full">
          Start Match
        </button>
      </div>
    </div>
  );
}

function SecondInningsSetup({ match, onDone }) {
  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");
  const i1 = match.innings[0];
  const battingTeam =
    String(i1.bowlingTeam) === String(match.teamA._id)
      ? match.teamA
      : match.teamB;
  const bowlingTeam =
    battingTeam._id === match.teamA._id ? match.teamB : match.teamA;

  const go = async () => {
    if (!striker || !nonStriker || !bowler) return toast.error("Pick all 3");
    await api.post(`/api/scoring/${match._id}/innings-start`, {
      openingStriker: striker,
      openingNonStriker: nonStriker,
      openingBowler: bowler,
    });
    onDone();
  };
  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h2 className="text-xl font-bold">Second Innings Setup</h2>
      <div className="card p-4 space-y-3">
        <PlayerSelect
          label="Striker"
          team={battingTeam}
          value={striker}
          onChange={setStriker}
        />
        <PlayerSelect
          label="Non-striker"
          team={battingTeam}
          value={nonStriker}
          onChange={setNonStriker}
          excludeIds={[striker]}
        />
        <PlayerSelect
          label="Opening Bowler"
          team={bowlingTeam}
          value={bowler}
          onChange={setBowler}
        />
        <button onClick={go} className="btn btn-primary w-full">
          Begin 2nd Innings
        </button>
      </div>
    </div>
  );
}

const PlayerSelect = ({ label, team, value, onChange, excludeIds = [] }) => (
  <label className="block">
    <div className="text-sm mb-1">{label}</div>
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Select from {team?.name} —</option>
      {team?.players
        ?.filter((p) => !excludeIds.includes(p._id))
        .map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
    </select>
  </label>
);

const PickPlayer = ({ label, team, excludeIds = [], onPick }) => (
  <div className="card p-4 border-2 border-accent">
    <div className="font-semibold mb-2">{label}</div>
    <div className="flex flex-wrap gap-2">
      {team?.players
        ?.filter((p) => !excludeIds.includes(String(p._id)))
        .map((p) => (
          <button
            key={p._id}
            onClick={() => onPick(p._id)}
            className="btn btn-outline text-sm"
          >
            {p.name}
          </button>
        ))}
    </div>
  </div>
);

function WicketModal({ match, innings, onClose, onSubmit }) {
  const [type, setType] = useState("bowled");
  const [dismissedId, setDismissedId] = useState(
    innings.striker?._id || innings.striker,
  );
  const [fielder1, setFielder1] = useState("");
  const [bowlerCredited, setBowlerCredited] = useState(true);
  const [runsBeforeWicket, setRunsBeforeWicket] = useState(0);

  const battingTeam =
    String(innings.battingTeam) === String(match.teamA._id)
      ? match.teamA
      : match.teamB;
  const bowlingTeam =
    battingTeam._id === match.teamA._id ? match.teamB : match.teamA;

  const types = [
    "bowled",
    "caught",
    "lbw",
    "run-out",
    "stumped",
    "hit-wicket",
    "retired-hurt",
  ];

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
              setBowlerCredited(
                !["run-out", "retired-hurt", "obstructing-field"].includes(
                  e.target.value,
                ),
              );
            }}
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-sm mb-1">Batter Out</div>
          <select
            className="input"
            value={dismissedId}
            onChange={(e) => setDismissedId(e.target.value)}
          >
            <option value={innings.striker?._id || innings.striker}>
              Striker
            </option>
            <option value={innings.nonStriker?._id || innings.nonStriker}>
              Non-striker
            </option>
          </select>
        </label>

        {(type === "caught" || type === "stumped" || type === "run-out") && (
          <PlayerSelect
            label="Fielder"
            team={bowlingTeam}
            value={fielder1}
            onChange={setFielder1}
          />
        )}

        <label className="block">
          <div className="text-sm mb-1">Runs completed before dismissal</div>
          <input
            className="input"
            type="number"
            min="0"
            max="6"
            value={runsBeforeWicket}
            onChange={(e) => setRunsBeforeWicket(Number(e.target.value))}
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn btn-outline flex-1">
            Cancel
          </button>
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
            Record
          </button>
        </div>
      </div>
    </div>
  );
}
