import { Link } from "react-router-dom";

export default function PlayerLink({ player, fallback = "Unknown" }) {
  if (!player) return <span>{fallback}</span>;
  const id = typeof player === "string" ? player : player._id;
  const name = typeof player === "string" ? fallback : player.name;
  if (!id) return <span>{name}</span>;
  return (
    <Link to={`/players/${id}`} className="player-link font-medium">
      {name}
    </Link>
  );
}
