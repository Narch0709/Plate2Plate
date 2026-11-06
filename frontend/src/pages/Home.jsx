import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Home() {
  const { user } = useAuth();
  if (user.role === "donor") return <Navigate to="/donor" replace />;
  if (user.role === "ngo") return <Navigate to="/ngo" replace />;
  return <p className="text-sm text-muted">The admin console is coming soon.</p>;
}