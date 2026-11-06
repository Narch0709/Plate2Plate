import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import MyListings from "./pages/donor/MyListings";
import PostFood from "./pages/donor/PostFood";
import Available from "./pages/ngo/Available";
import Pickups from "./pages/ngo/Pickups";

function Protected({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6 text-sm text-muted">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route element={<Protected roles={["donor"]} />}>
                <Route path="/donor" element={<MyListings />} />
                <Route path="/donor/new" element={<PostFood />} />
              </Route>
              <Route element={<Protected roles={["ngo"]} />}>
                <Route path="/ngo" element={<Available />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}