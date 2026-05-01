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
        <LiveTab match={match} innings={current} flash={flash} />
      )}
      {tab === "scorecard" && <ScorecardTab innings={innings} />}
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
          {match.status === "live" && <LiveBadge />}
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

function LiveTab({ match, innings, flash }) {
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
        <h3 className="font-semibold mb-3">Batting</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 text-left">
            <tr>
              <th>Batter</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {innings.batterScores
              ?.filter((b) => !b.isOut)
              .slice(-2)
              .map((b, i) => (
                <tr
                  key={i}
                  className="border-t border-slate-100 dark:border-slate-700"
                >
                  <td className="py-2">
                    <PlayerLink player={b.playerId} />
                  </td>
                  <td className="font-mono">{b.runs}</td>
                  <td className="font-mono">{b.balls}</td>
                  <td className="font-mono">{b.fours}</td>
                  <td className="font-mono">{b.sixes}</td>
                  <td className="font-mono">{b.strikeRate?.toFixed(1)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Bowling</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-500 text-left">
            <tr>
              <th>Bowler</th>
              <th>O</th>
              <th>R</th>
              <th>W</th>
              <th>Econ</th>
            </tr>
          </thead>
          <tbody>
            {innings.bowlerFigures?.slice(-1).map((b, i) => (
              <tr
                key={i}
                className="border-t border-slate-100 dark:border-slate-700"
              >
                <td className="py-2">
                  <PlayerLink player={b.playerId} />
                </td>
                <td className="font-mono">{b.overs?.toFixed(1)}</td>
                <td className="font-mono">{b.runs}</td>
                <td className="font-mono">{b.wickets}</td>
                <td className="font-mono">{b.economy?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScorecardTab({ innings }) {
  return (
    <div className="space-y-6">
      {innings.map((inn, idx) => (
        <div key={inn._id || idx} className="card p-4">
          <h3 className="font-display text-lg font-bold mb-3">
            Innings {inn.inningsNumber} — {inn.totalRuns}/{inn.totalWickets} (
            {formatOvers(inn.totalBalls)})
          </h3>
          <BattingTable rows={inn.batterScores} />
          <ExtrasRow extras={inn.extras} />
          <h4 className="font-semibold mt-5 mb-2">Bowling</h4>
          <BowlingTable rows={inn.bowlerFigures} />
          <FOW rows={inn.fallOfWickets} />
        </div>
      ))}
      {!innings.length && <p className="text-slate-500">No innings data.</p>}
    </div>
  );
}

const BattingTable = ({ rows = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[500px]">
      <thead className="text-xs text-slate-500 text-left">
        <tr>
          <th className="py-1">Batter</th>
          <th>How Out</th>
          <th>R</th>
          <th>B</th>
          <th>4s</th>
          <th>6s</th>
          <th>SR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b, i) => (
          <tr
            key={i}
            className="border-t border-slate-100 dark:border-slate-700"
          >
            <td className="py-2">
              <PlayerLink player={b.playerId} />
            </td>
            <td className="text-slate-500">
              {b.isOut ? b.dismissalType : "not out"}
            </td>
            <td className="font-mono">{b.runs}</td>
            <td className="font-mono">{b.balls}</td>
            <td className="font-mono">{b.fours}</td>
            <td className="font-mono">{b.sixes}</td>
            <td className="font-mono">{b.strikeRate?.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BowlingTable = ({ rows = [] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm min-w-[500px]">
      <thead className="text-xs text-slate-500 text-left">
        <tr>
          <th>Bowler</th>
          <th>O</th>
          <th>M</th>
          <th>R</th>
          <th>W</th>
          <th>NB</th>
          <th>Wd</th>
          <th>Econ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b, i) => (
          <tr
            key={i}
            className="border-t border-slate-100 dark:border-slate-700"
          >
            <td className="py-2">
              <PlayerLink player={b.playerId} />
            </td>
            <td className="font-mono">{b.overs?.toFixed(1)}</td>
            <td className="font-mono">{b.maidens}</td>
            <td className="font-mono">{b.runs}</td>
            <td className="font-mono">{b.wickets}</td>
            <td className="font-mono">{b.noBalls}</td>
            <td className="font-mono">{b.wides}</td>
            <td className="font-mono">{b.economy?.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ExtrasRow = ({ extras = {} }) => {
  const total =
    (extras.wides || 0) +
    (extras.noBalls || 0) +
    (extras.legByes || 0) +
    (extras.byes || 0) +
    (extras.penalties || 0);
  return (
    <div className="text-xs text-slate-500 mt-2">
      Extras: {total} (wd {extras.wides || 0}, nb {extras.noBalls || 0}, lb{" "}
      {extras.legByes || 0}, b {extras.byes || 0}, p {extras.penalties || 0})
    </div>
  );
};

const FOW = ({ rows = [] }) => (
  <div className="text-xs text-slate-500 mt-3">
    <b className="text-slate-700 dark:text-slate-300">Fall of Wickets:</b>{" "}
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
