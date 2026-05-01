import { Routes, Route } from "react-router-dom";
import Header from "./components/layout/Header.jsx";
import BottomNav from "./components/layout/BottomNav.jsx";
import HomePage from "./pages/HomePage.jsx";
import MatchPage from "./pages/MatchPage.jsx";
import TournamentPage from "./pages/TournamentPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import PlayerProfilePage from "./pages/PlayerProfilePage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import HostDashboard from "./pages/HostDashboard.jsx";
import ScoringPad from "./pages/ScoringPad.jsx";
import NewTournamentPage from "./pages/NewTournamentPage.jsx";
import NewMatchPage from "./pages/NewMatchPage.jsx";
import AssignScorerPage from "./pages/AssignScorerPage.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap.js";

export default function App() {
  useAuthBootstrap();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/matches/:id" element={<MatchPage />} />
          <Route path="/tournaments/:id" element={<TournamentPage />} />
          <Route path="/teams/:id" element={<TeamPage />} />
          <Route path="/players/:id" element={<PlayerProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <HostDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/new-tournament"
            element={
              <RequireAuth>
                <NewTournamentPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/new-match"
            element={
              <RequireAuth>
                <NewMatchPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/matches/:id/assign"
            element={
              <RequireAuth>
                <AssignScorerPage />
              </RequireAuth>
            }
          />
          <Route
            path="/score/:matchId"
            element={
              <RequireAuth>
                <ScoringPad />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
