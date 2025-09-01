import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/store";

export default function ProtectedRoute() {
  const isValid = useAuthStore((s) => s.isValid);
  return isValid() ? <Outlet /> : <Navigate to="/login" replace />;
}
