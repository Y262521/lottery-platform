import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Guards a route for any authenticated user.
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-cream-300">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Guards a route for admin/auditor roles.
export function AdminRoute({ children, roles = ["ADMIN"] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-cream-300">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!roles.includes(user.role)) {
    return (
      <div className="mx-auto mt-20 max-w-md p-6 text-center text-cream-200 card">
        You don’t have permission to view this page.
      </div>
    );
  }
  return children;
}
