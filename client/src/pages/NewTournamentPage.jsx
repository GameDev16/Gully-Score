import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import toast from "react-hot-toast";
import ImageUploader from "../components/common/ImageUploader.jsx";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useAuthStore } from "../store/authStore.js";

const STEPS = ["Basics", "Teams", "Players", "Venues", "Matches", "Scorers", "Review"];

function validateStep(step, tournament, teams, venues, matches) {
  if (step === 0) {
    if (!tournament.name?.trim()) return "Tournament name is required";
    if (!tournament.format) return "Format is required";
    if (!tournament.overs || tournament.overs < 1) return "Overs must be at least 1";
    if (!tournament.startDate) return "Start date is required";
    return null;
  }
  if (step === 1) {
    if (teams.length < 2) return "Add at least 2 teams";
    if (teams.some(t => !t.name?.trim())) return "All teams need a name";
    if (teams.some(t => !t.shortName?.trim())) return "All teams need a short name";
    return null;
  }
  if (step === 2) {
    if (teams.some(t => (t.players || []).length < 1)) return "Add at least 1 player per team";
    if (teams.some(t => (t.players || []).some(p => !p.name?.trim()))) return "All players need a name";
    return null;
  }
  if (step === 3) {
    if (venues.some(v => !v.name?.trim())) return "All venues need a name";
    return null;
  }
  if (step === 4) {
    if (matches.length === 0) return "Schedule at least 1 match";
    if (matches.some(m => m.teamAIdx === m.teamBIdx)) return "A match cannot have the same team twice";
    if (matches.some(m => !m.date)) return "All matches need a date/time";
    return null;
  }
  if (step === 5) {
    // Scorers are optional but validate format if provided
    if (matches.some(m => m.scorerEmail && !m.scorerEmail.includes("@"))) return "Invalid scorer email format";
    return null;
  }
  return null;
}

export default function NewTournamentPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const user = useAuthStore((s) => s.user);

  const [tournament, setTournament] = useState({
    name: "",
    description: "",
    format: "T20",
    overs: 20,
    startDate: "",
    endDate: "",
    banner_image: "",
  });
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const next = () => {
    const err = validateStep(step, tournament, teams, venues, matches);
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!tournament.name) return toast.error("Name is required");
    setSubmitting(true);
    try {
      const { data: t } = await api.post("/api/tournaments", tournament);
      const venuesCreated = await Promise.all(
        venues.map((v) => api.post("/api/venues", v).then((r) => r.data)),
      );
      const teamsCreated = await Promise.all(
        teams.map((tm) =>
          api
            .post("/api/teams", {
              name: tm.name,
              shortName: tm.shortName,
              logoUrl: tm.logoUrl,
              tournamentId: t._id,
            })
            .then((r) => r.data),
        ),
      );
      await Promise.all(
        teams.flatMap((tm, idx) =>
          (tm.players || []).map((p) =>
            api.post(`/api/teams/${teamsCreated[idx]._id}/players`, p),
          ),
        ),
      );

      // Create matches
      const matchesCreated = await Promise.all(
        matches.map((m) =>
          api.post("/api/matches", {
            title: `${teamsCreated[m.teamAIdx]?.name} vs ${teamsCreated[m.teamBIdx]?.name}`,
            format: tournament.format,
            overs: tournament.overs,
            teamA: teamsCreated[m.teamAIdx]?._id,
            teamB: teamsCreated[m.teamBIdx]?._id,
            venue: venuesCreated[m.venueIdx]?._id,
            date: m.date,
            tournamentId: t._id,
          }).then(r => r.data),
        ),
      );

      // Assign scorers
      await Promise.all(
        matches.map((m, idx) => {
          if (m.scorerEmail?.trim()) {
            return api.post(`/api/matches/${matchesCreated[idx]._id}/assign-scorer`, {
              email: m.scorerEmail.trim(),
            }).catch(() => {});
          }
          return Promise.resolve();
        }),
      );

      toast.success("Tournament created!");
      nav(`/tournaments/${t._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-display text-3xl font-bold mb-6">
        Create Tournament
      </h1>

      {/* Stepper */}
      <ol className="flex flex-wrap gap-2 mb-8">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition ${
                step === i
                  ? "bg-primary-600 text-white"
                  : i < step
                    ? "bg-primary-100 text-primary-700"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {i < step ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <span>{i + 1}</span>
              )}
              {label}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-slate-300" />
            )}
          </li>
        ))}
      </ol>

      <div className="card p-6 min-h-[300px]">
        {step === 0 && (
          <BasicsStep value={tournament} onChange={setTournament} />
        )}
        {step === 1 && <TeamsStep teams={teams} setTeams={setTeams} />}
        {step === 2 && <PlayersStep teams={teams} setTeams={setTeams} />}
        {step === 3 && <VenuesStep venues={venues} setVenues={setVenues} />}
        {step === 4 && (
          <MatchesStep
            teams={teams}
            venues={venues}
            matches={matches}
            setMatches={setMatches}
          />
        )}
        {step === 5 && (
          <ScorersStep teams={teams} matches={matches} setMatches={setMatches} user={user} />
        )}
        {step === 6 && (
          <ReviewStep
            tournament={tournament}
            teams={teams}
            venues={venues}
            matches={matches}
          />
        )}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={prev}
          disabled={step === 0}
          className="btn btn-outline"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="btn btn-primary">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? "Creating…" : "Publish Tournament"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───── Step Components ───── */

function BasicsStep({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Name *">
        <input className="input" value={value.name} onChange={(e) => set("name", e.target.value)} required />
      </Field>
      <Field label="Description">
        <textarea className="input" rows="3" value={value.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Format *">
          <select className="input" value={value.format} onChange={(e) => set("format", e.target.value)}>
            {["T10", "T20", "ODI", "Test", "Custom"].map((f) => (<option key={f}>{f}</option>))}
          </select>
        </Field>
        <Field label="Overs per innings *">
          <input type="number" className="input" value={value.overs} min={1} onChange={(e) => set("overs", Number(e.target.value))} required />
        </Field>
        <Field label="Start date *">
          <input type="date" className="input" value={value.startDate} onChange={(e) => set("startDate", e.target.value)} required />
        </Field>
        <Field label="End date">
          <input type="date" className="input" value={value.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </Field>
      </div>
      <ImageUploader label="Banner image" value={value.banner_image} onChange={(url) => set("banner_image", url)} />
    </div>
  );
}

function TeamsStep({ teams, setTeams }) {
  const add = () =>
    setTeams([...teams, { tempId: crypto.randomUUID(), name: "", shortName: "", logoUrl: "", players: [] }]);
  const upd = (i, patch) => setTeams(teams.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const del = (i) => setTeams(teams.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-4">
      <button onClick={add} className="btn btn-primary">+ Add Team</button>
      {teams.map((t, i) => (
        <div key={t.tempId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ImageUploader round value={t.logoUrl} onChange={(url) => upd(i, { logoUrl: url })} label="Logo" />
            <div className="grid grid-cols-3 gap-2 flex-1">
              <input className="input col-span-2" placeholder="Team name *" value={t.name} onChange={(e) => upd(i, { name: e.target.value })} required />
              <input className="input col-span-1" placeholder="Short (3 chars) *" maxLength="4" value={t.shortName} onChange={(e) => upd(i, { shortName: e.target.value.toUpperCase() })} required />
            </div>
            <button onClick={() => del(i)} className="btn btn-ghost text-danger text-sm">Remove</button>
          </div>
        </div>
      ))}
      {!teams.length && <p className="text-slate-500 text-sm">No teams added yet.</p>}
    </div>
  );
}

function PlayersStep({ teams, setTeams }) {
  const addPlayer = (ti) => {
    const next = [...teams];
    next[ti].players = [
      ...(next[ti].players || []),
      { tempId: crypto.randomUUID(), name: "", role: "batsman", battingStyle: "right-hand", bowlingStyle: "none", jerseyNumber: "" },
    ];
    setTeams(next);
  };
  const updPlayer = (ti, pi, patch) => {
    const next = [...teams];
    next[ti].players[pi] = { ...next[ti].players[pi], ...patch };
    setTeams(next);
  };
  const delPlayer = (ti, pi) => {
    const next = [...teams];
    next[ti].players = next[ti].players.filter((_, i) => i !== pi);
    setTeams(next);
  };

  if (!teams.length) return <p className="text-slate-500">Add teams first.</p>;

  return (
    <div className="space-y-6">
      {teams.map((t, ti) => (
        <div key={t.tempId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">{t.name || `Team ${ti + 1}`}</h4>
            <button onClick={() => addPlayer(ti)} className="btn btn-outline text-sm">+ Add Player</button>
          </div>
          <div className="space-y-2">
            {(t.players || []).map((p, pi) => (
              <div key={p.tempId} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                <input className="input col-span-2" placeholder="Name *" value={p.name} onChange={(e) => updPlayer(ti, pi, { name: e.target.value })} required />
                <select className="input" value={p.role} onChange={(e) => updPlayer(ti, pi, { role: e.target.value })}>
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="allrounder">All-rounder</option>
                  <option value="wicketkeeper">Wicketkeeper</option>
                </select>
                <select className="input" value={p.battingStyle} onChange={(e) => updPlayer(ti, pi, { battingStyle: e.target.value })}>
                  <option value="right-hand">Right-hand</option>
                  <option value="left-hand">Left-hand</option>
                </select>
                <input className="input" placeholder="Jersey #" type="number" value={p.jerseyNumber} onChange={(e) => updPlayer(ti, pi, { jerseyNumber: Number(e.target.value) })} />
                <button onClick={() => delPlayer(ti, pi)} className="text-danger text-sm">Remove</button>
              </div>
            ))}
            {!(t.players || []).length && <p className="text-xs text-slate-500">No players yet.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function VenuesStep({ venues, setVenues }) {
  const add = () => setVenues([...venues, { tempId: crypto.randomUUID(), name: "", city: "", pitchType: "flat" }]);
  const upd = (i, patch) => setVenues(venues.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  const del = (i) => setVenues(venues.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <button onClick={add} className="btn btn-primary">+ Add Venue</button>
      {venues.map((v, i) => (
        <div key={v.tempId} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
          <input className="input" placeholder="Venue name *" value={v.name} onChange={(e) => upd(i, { name: e.target.value })} required />
          <input className="input" placeholder="City" value={v.city} onChange={(e) => upd(i, { city: e.target.value })} />
          <select className="input" value={v.pitchType} onChange={(e) => upd(i, { pitchType: e.target.value })}>
            {["flat", "turning", "seaming", "bouncy"].map((p) => (<option key={p}>{p}</option>))}
          </select>
          <button onClick={() => del(i)} className="btn btn-ghost text-danger text-sm">Remove</button>
        </div>
      ))}
    </div>
  );
}

function MatchesStep({ teams, venues, matches, setMatches }) {
  const add = () =>
    setMatches([...matches, { tempId: crypto.randomUUID(), teamAIdx: 0, teamBIdx: teams.length > 1 ? 1 : 0, venueIdx: 0, date: "", scorerEmail: "" }]);
  const upd = (i, patch) => setMatches(matches.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const del = (i) => setMatches(matches.filter((_, idx) => idx !== i));

  if (teams.length < 2) return <p className="text-slate-500">Add at least 2 teams first.</p>;

  return (
    <div className="space-y-3">
      <button onClick={add} className="btn btn-primary">+ Schedule Match</button>
      {matches.map((m, i) => (
        <div key={m.tempId} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
          <select className="input" value={m.teamAIdx} onChange={(e) => upd(i, { teamAIdx: Number(e.target.value) })}>
            {teams.map((t, idx) => (<option key={t.tempId} value={idx}>{t.name || `Team ${idx + 1}`}</option>))}
          </select>
          <select className="input" value={m.teamBIdx} onChange={(e) => upd(i, { teamBIdx: Number(e.target.value) })}>
            {teams.map((t, idx) => (<option key={t.tempId} value={idx}>{t.name || `Team ${idx + 1}`}</option>))}
          </select>
          {venues.length > 0 && (
            <select className="input" value={m.venueIdx} onChange={(e) => upd(i, { venueIdx: Number(e.target.value) })}>
              {venues.map((v, idx) => (<option key={v.tempId} value={idx}>{v.name || `Venue ${idx + 1}`}</option>))}
            </select>
          )}
          <input type="datetime-local" className="input" value={m.date} onChange={(e) => upd(i, { date: e.target.value })} required />
          <button onClick={() => del(i)} className="btn btn-ghost text-danger text-sm">Remove</button>
        </div>
      ))}
    </div>
  );
}

function ScorersStep({ teams, matches, setMatches, user }) {
  const upd = (i, patch) => setMatches(matches.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  if (!matches.length) return <p className="text-slate-500">No matches scheduled. Go back and add matches first.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 mb-2">Assign a scorer (by email) to each match. The scorer will receive a notification.</p>
      {matches.map((m, i) => {
        const teamAName = teams[m.teamAIdx]?.name || `Team ${m.teamAIdx + 1}`;
        const teamBName = teams[m.teamBIdx]?.name || `Team ${m.teamBIdx + 1}`;
        return (
          <div key={m.tempId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2">
            <div className="font-medium text-sm">{teamAName} vs {teamBName}</div>
            {m.date && <div className="text-xs text-slate-400">{new Date(m.date).toLocaleString()}</div>}
            
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input 
                type="checkbox" 
                checked={m.scorerEmail === user?.email} 
                onChange={(e) => upd(i, { scorerEmail: e.target.checked ? user?.email : "" })} 
                className="rounded text-primary-600 border-slate-300 focus:ring-primary-500"
              />
              Assign to me (Host)
            </label>
            
            <input
              type="email"
              className="input disabled:opacity-50 disabled:bg-slate-50"
              placeholder="Scorer email (optional)"
              value={m.scorerEmail || ""}
              onChange={(e) => upd(i, { scorerEmail: e.target.value })}
              disabled={m.scorerEmail === user?.email}
            />
          </div>
        );
      })}
    </div>
  );
}

function ReviewStep({ tournament, teams, venues, matches }) {
  return (
    <div className="space-y-3 text-sm">
      <Row k="Tournament" v={tournament.name} />
      <Row k="Format" v={`${tournament.format} · ${tournament.overs} overs`} />
      <Row k="Start" v={tournament.startDate} />
      <Row k="Teams" v={teams.length} />
      <Row k="Players" v={teams.reduce((s, t) => s + (t.players?.length || 0), 0)} />
      <Row k="Venues" v={venues.length} />
      <Row k="Matches" v={matches.length} />
      <Row k="Scorers assigned" v={matches.filter(m => m.scorerEmail?.trim()).length} />
      <p className="pt-3 text-slate-500">
        Click "Publish Tournament" to create everything.
      </p>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block">
    <div className="text-sm font-medium mb-1">{label}</div>
    {children}
  </label>
);
const Row = ({ k, v }) => (
  <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 py-2">
    <span className="text-slate-500">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
);
