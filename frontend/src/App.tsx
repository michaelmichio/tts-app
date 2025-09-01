import { useAuthStore } from "./store";
import LoginPage from "./pages/LoginPage";
import TTSPage from "./pages/TextToSpeechPage";

export default function App() {
  const user = useAuthStore((s) => s.user);
  // simple router by path:
  const path = location.pathname;
  if (path.startsWith("/login")) return <LoginPage />;
  return user ? <TTSPage /> : <LoginPage />;
}
