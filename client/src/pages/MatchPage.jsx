import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import api from "../api/client.js";
import LiveBadge from "../components/common/LiveBadge.jsx";
import PlayerLink from "../components/common/PlayerLink.jsx";
import WormChart from "../components/common/WormChart.jsx";
import TossCoin from "../components/common/TossCoin.jsx";
import { useMatchSocket } from "../hooks/useMatchSocket.js";
import { formatOvers } from "../utils/format.js";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Printer } from "lucide-react";
import toast from "react-hot-toast";

export default function MatchPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState("live");
  const [flash, setFlash] = useState(null);

  const { data: match } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => (await api.get(`/api/matches/${id}`)).data,
  });

  const { data: state, refetch } = useQuery({
    queryKey: ["match-state", id],
    queryFn: async () => (await api.get(`/api/matches/${id}/state`)).data,
    refetchInterval: 15000,
  });

  useMatchSocket(id, {
    onBall: (p) => {
      setFlash(
        p.ball.isWicket ? "wicket" : p.ball.isBoundary ? "boundary" : "run",
      );
      setTimeout(() => setFlash(null), 800);
      refetch();
    },
    onStatus: () => refetch(),
    onInnings: () => refetch(),
    onEnd: () => qc.invalidateQueries({ queryKey: ["match", id] }),
  });

  if (!match)
    return <div className="p-10 text-center text-slate-500">Loading…</div>;

  const innings = state?.innings || [];
  const current = innings[match.currentInningsNumber - 1];

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: match.title,
          text: `Watch ${match.title} live`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Match link copied!");
      }
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4 print:max-w-full">
      <Header match={match} onShare={share} />

      <AnimatePresence>
        {flash === "wicket" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-14 z-40 bg-danger text-white text-center py-2 font-bold uppercase tracking-wider"
          >
            🏏 WICKET!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto print:hidden">
        {["live", "scorecard", "stats", "info"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 ${
              tab === t
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <LiveTab match={match} state={state} innings={current} flash={flash} />
      )}
      {tab === "scorecard" && <ScorecardTab match={match} state={state} innings={innings} />}
      {tab === "stats" && <StatsTab innings={innings} />}
      {tab === "info" && <InfoTab match={match} />}
    </div>
  );
}

function Header({ match, onShare }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>
          {match.format} · {match.title}
        </span>
        <div className="flex items-center gap-2">
          {(match.status === "live" || match.status === "innings-break") && <LiveBadge />}
          <button onClick={onShare} className="btn btn-ghost p-1.5">
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-ghost p-1.5 hidden sm:inline-flex"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Link
          to={`/teams/${match.teamA?._id}`}
          className="font-bold player-link"
        >
          {match.teamA?.name}
        </Link>
        <span className="text-xs text-slate-400">vs</span>
        <Link
          to={`/teams/${match.teamB?._id}`}
          className="font-bold player-link"
        >
          {match.teamB?.name}
        </Link>
      </div>
      {match.result?.resultText && (
        <div className="mt-3 text-sm font-medium text-primary-600">
          {match.result.resultText}
        </div>
      )}
      <div className="mt-2 text-xs text-slate-500 font-mono">
        Match Key: {match.matchKey}
      </div>
    </div>
  );
}

function LiveTab({ match, state, innings, flash }) {
  const [showToss, setShowToss] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowToss(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!innings) {
    if (match.tossWonBy && showToss) {
      return (
        <div className="card p-6">
          <TossCoin
            result={
              String(match.tossWonBy._id || match.tossWonBy) ===
              String(match.teamA?._id)
                ? "A"
                : "B"
            }
            teamA={match.teamA}
            teamB={match.teamB}
          />
          <p className="text-center text-sm text-slate-500">
            Chose to <b>{match.tossDecision}</b>
          </p>
        </div>
      );
    }
    // During innings break, show first innings score
    if (match.status === "innings-break" && state?.innings?.length > 0) {
      const i1 = state.innings[0];
      const battingTeamName = String(i1.battingTeam?._id || i1.battingTeam) === String(match.teamA?._id) ? match.teamA?.name : match.teamB?.name;
      return (
        <div className="space-y-4">
          <div className="card p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">🕐 Innings Break</div>
            <div className="text-2xl font-bold">{battingTeamName}: {i1.totalRuns}/{i1.totalWickets} ({formatOvers(i1.totalBalls)} ov)</div>
            <div className="text-sm text-slate-500 mt-1">Target: {i1.totalRuns + 1}</div>
          </div>
        </div>
      );
    }
    return <p className="text-slate-500">Match not started yet.</p>;
  }

  return (
    <div className="space-y-4">
      <motion.div
        key={`${innings.totalRuns}-${innings.totalWickets}`}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className={`card p-5 ${flash === "boundary" ? "animate-flash" : ""}`}
      >
        <div className="flex items-baseline gap-3">
          <div className="score-mono text-4xl font-bold">
            {innings.totalRuns}/{innings.totalWickets}
          </div>
          <div className="text-slate-500 score-mono">
            ({formatOvers(innings.totalBalls)} ov)
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <span>
            CRR:{" "}
            <b className="score-mono text-slate-700 dark:text-slate-200">
              {innings.currentRunRate?.toFixed(2)}
            </b>
          </span>
          {innings.target && (
            <>
              <span>
                Target: <b>{innings.target}</b>
              </span>
              <span>
                RRR: <b>{innings.requiredRunRate?.toFixed(2)}</b>
              </span>
            </>
          )}
          <span>
            Proj: <b>{innings.projectedScore}</b>
          </span>
        </div>
      </motion.div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3 text-xs uppercase tracking-wide text-slate-500">At the Crease</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 text-left">
            <tr><th className="pb-1">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
          </thead>
          <tbody>
            {innings.batterScores
              ?.filter((b) => !b.isOut)
              .slice(-2)
              .map((b, i) => {
                const isStriker =
                  String(b.playerId?._id || b.playerId) ===
                  String(innings.striker?._id || innings.striker);
                return (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="py-2 font-medium">
                      <PlayerLink player={b.playerId} />
                      {isStriker && <span className="ml-1 text-primary-600 font-bold">*</span>}
                    </td>
                    <td className="font-mono font-semibold">{b.runs}</td>
                    <td className="font-mono text-slate-400">{b.balls}</td>
                    <td className="font-mono">{b.fours}</td>
                    <td className="font-mono">{b.sixes}</td>
                    <td className="font-mono text-xs">{b.strikeRate?.toFixed(1)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3 text-xs uppercase tracking-wide text-slate-500">Current Bowler</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 text-left">
            <tr><th className="pb-1">Bowler</th><th>O</th><th>R</th><th>W</th><th>Econ</th></tr>
          </thead>
          <tbody>
            {innings.bowlerFigures?.slice(-1).map((b, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-2 font-medium"><PlayerLink player={b.playerId} /></td>
                <td className="font-mono">{b.overs?.toFixed(1)}</td>
                <td className="font-mono">{b.runs}</td>
                <td className="font-mono font-semibold">{b.wickets}</td>
                <td className="font-mono text-xs">{b.economy?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- CRICBUZZ-STYLE SCORECARD ---------- */
function ScorecardTab({ match, state, innings }) {
  // Helper to get team players for "Did not bat"
  const getTeamForInnings = (inn) => {
    const batTeamId = String(inn.battingTeam?._id || inn.battingTeam);
    if (batTeamId === String(match?.teamA?._id)) return match.teamA;
    return match.teamB;
  };

  const getBowlTeamForInnings = (inn) => {
    const batTeamId = String(inn.battingTeam?._id || inn.battingTeam);
    if (batTeamId === String(match?.teamA?._id)) return match.teamB;
    return match.teamA;
  };

  const getDismissalText = (b, inn) => {
    if (!b.isOut) return "not out";
    const type = b.dismissalType;
    const bowlerName = b.dismissedBy?.name || "";
    const fielderName = b.fielder?.name || "";

    switch (type) {
      case "bowled": return `b ${bowlerName}`;
      case "caught": return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
      case "lbw": return `lbw b ${bowlerName}`;
      case "stumped": return `st ${fielderName} b ${bowlerName}`;
      case "run-out": return fielderName ? `run out (${fielderName})` : "run out";
      case "hit-wicket": return `hit wicket b ${bowlerName}`;
      case "retired-hurt": return "retired hurt";
      default: return type || "out";
    }
  };

  return (
    <div className="space-y-6">
      {innings.map((inn, idx) => {
        const batTeam = getTeamForInnings(inn);
        const bowlTeam = getBowlTeamForInnings(inn);
        const batTeamName = inn.battingTeam?.name || batTeam?.name || `Innings ${idx + 1}`;
        const battedIds = new Set((inn.batterScores || []).map(b => String(b.playerId?._id || b.playerId)));
        const didNotBat = (batTeam?.players || []).filter(p => !battedIds.has(String(p._id)));

        const totalExtras = (inn.extras?.wides || 0) + (inn.extras?.noBalls || 0) +
          (inn.extras?.legByes || 0) + (inn.extras?.byes || 0) + (inn.extras?.penalties || 0);

        return (
          <div key={inn._id || idx} className="card overflow-hidden">
            {/* Innings Header */}
            <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="font-bold text-lg">{batTeamName}</div>
              <div className="score-mono text-xl font-bold">
                {inn.totalRuns}/{inn.totalWickets}
                <span className="text-sm font-normal ml-1 opacity-80">({formatOvers(inn.totalBalls)} ov)</span>
              </div>
            </div>

            {/* Batting Table */}
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="text-xs text-slate-500 text-left border-b-2 border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="py-2 w-[200px]">Batter</th>
                      <th className="w-[200px]">Dismissal</th>
                      <th className="text-right">R</th>
                      <th className="text-right">B</th>
                      <th className="text-right">4s</th>
                      <th className="text-right">6s</th>
                      <th className="text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inn.batterScores || []).map((b, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 font-medium">
                          <PlayerLink player={b.playerId} />
                        </td>
                        <td className="text-slate-500 text-xs">{getDismissalText(b, inn)}</td>
                        <td className="font-mono text-right font-semibold">{b.runs}</td>
                        <td className="font-mono text-right text-slate-400">{b.balls}</td>
                        <td className="font-mono text-right">{b.fours}</td>
                        <td className="font-mono text-right">{b.sixes}</td>
                        <td className="font-mono text-right text-xs">{b.strikeRate?.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Extras */}
              <div className="border-t-2 border-slate-200 dark:border-slate-600 mt-2 pt-2 text-sm flex justify-between">
                <span className="text-slate-500">
                  Extras: <span className="font-mono">{totalExtras}</span>
                  <span className="text-xs ml-1">
                    (wd {inn.extras?.wides || 0}, nb {inn.extras?.noBalls || 0}, lb {inn.extras?.legByes || 0}, b {inn.extras?.byes || 0}, p {inn.extras?.penalties || 0})
                  </span>
                </span>
              </div>

              {/* Total */}
              <div className="border-t-2 border-slate-200 dark:border-slate-600 mt-2 pt-2 text-sm font-bold flex justify-between">
                <span>Total</span>
                <span className="font-mono">{inn.totalRuns}/{inn.totalWickets} ({formatOvers(inn.totalBalls)} ov)</span>
              </div>

              {/* Did Not Bat */}
              {didNotBat.length > 0 && (
                <div className="mt-3 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Did not bat: </span>
                  {didNotBat.map((p, i) => (
                    <span key={p._id}>
                      <PlayerLink player={p} />
                      {i < didNotBat.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              )}

              {/* Fall of Wickets */}
              <FOW rows={inn.fallOfWickets} />
            </div>

            {/* Bowling Table */}
            <div className="border-t-2 border-slate-200 dark:border-slate-600 p-4">
              <h4 className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">
                Bowling — {inn.bowlingTeam?.name || bowlTeam?.name || ""}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="text-xs text-slate-500 text-left border-b-2 border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="py-2">Bowler</th>
                      <th className="text-right">O</th>
                      <th className="text-right">M</th>
                      <th className="text-right">R</th>
                      <th className="text-right">W</th>
                      <th className="text-right">NB</th>
                      <th className="text-right">WD</th>
                      <th className="text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inn.bowlerFigures || []).map((b, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 font-medium"><PlayerLink player={b.playerId} /></td>
                        <td className="font-mono text-right">{b.overs?.toFixed(1)}</td>
                        <td className="font-mono text-right">{b.maidens}</td>
                        <td className="font-mono text-right">{b.runs}</td>
                        <td className="font-mono text-right font-semibold">{b.wickets}</td>
                        <td className="font-mono text-right">{b.noBalls}</td>
                        <td className="font-mono text-right">{b.wides}</td>
                        <td className="font-mono text-right text-xs">{b.economy?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
      {!innings.length && <p className="text-slate-500">No innings data.</p>}
    </div>
  );
}

const FOW = ({ rows = [] }) => (
  <div className="text-xs text-slate-500 mt-3">
    <b className="text-slate-700 dark:text-slate-300">Fall of Wickets:</b>{" "}
    {rows.length === 0 && "—"}
    {rows.map((f, i) => (
      <span key={i}>
        {f.wicketNumber}-{f.runs} (<PlayerLink player={f.batterId} />, {f.over})
        {i < rows.length - 1 && " · "}
      </span>
    ))}
  </div>
);

function StatsTab({ innings }) {
  const topScorer = innings
    .flatMap((i) => i.batterScores || [])
    .sort((a, b) => (b.runs || 0) - (a.runs || 0))[0];
  const topBowler = innings
    .flatMap((i) => i.bowlerFigures || [])
    .sort((a, b) => (b.wickets || 0) - (a.wickets || 0))[0];

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">Top Scorer</div>
          {topScorer ? (
            <>
              <div className="font-bold mt-1">
                <PlayerLink player={topScorer.playerId} />
              </div>
              <div className="font-mono text-2xl">
                {topScorer.runs}({topScorer.balls})
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">—</p>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 uppercase">
            Top Wicket-taker
          </div>
          {topBowler ? (
            <>
              <div className="font-bold mt-1">
                <PlayerLink player={topBowler.playerId} />
              </div>
              <div className="font-mono text-2xl">
                {topBowler.wickets}/{topBowler.runs}
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">—</p>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Worm Graph</h3>
        <WormChart innings={innings} />
      </div>
    </div>
  );
}

function InfoTab({ match }) {
  return (
    <div className="card p-4 text-sm space-y-2">
      <Row k="Format" v={match.format} />
      <Row k="Overs" v={match.overs} />
      <Row k="Date" v={match.date && new Date(match.date).toLocaleString()} />
      <Row k="Venue" v={match.venue?.name} />
      <Row
        k="Toss"
        v={
          match.tossWonBy
            ? `${match.tossWonBy.name || ""} chose to ${match.tossDecision}`
            : "—"
        }
      />
      <Row
        k="Umpires"
        v={[match.umpire1, match.umpire2].filter(Boolean).join(" · ") || "—"}
      />
      <Row
        k="Tournament"
        v={
          match.tournamentId ? (
            <Link
              className="player-link"
              to={`/tournaments/${match.tournamentId._id}`}
            >
              {match.tournamentId.name}
            </Link>
          ) : (
            "—"
          )
        }
      />
      <Row k="Scorer" v={match.scorerId?.name || "—"} />
      <Row
        k="Match Key"
        v={<span className="font-mono">{match.matchKey}</span>}
      />
    </div>
  );
}
const Row = ({ k, v }) => (
  <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 py-1.5">
    <span className="text-slate-500">{k}</span>
    <span className="font-medium">{v || "—"}</span>
  </div>
);
