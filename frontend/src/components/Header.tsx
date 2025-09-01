import { LogOut, Mic, User } from "lucide-react";
import { useAuthStore } from "../stores/store";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 w-10 h-10 rounded-lg flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">VoiceGen</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-5 h-5" />
              <span>{user?.email}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
