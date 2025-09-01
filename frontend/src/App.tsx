import { useAuthStore } from "./store";
import LoginPage from "./pages/LoginPage";
import TextToSpeechPage from "./pages/TextToSpeechPage";

export default function App() {
  const isValid = useAuthStore((s) => s.isValid);
  const ok = isValid();

  window.addEventListener("storage", (e) => {
    if (e.key === "token" && e.newValue === null) {
      useAuthStore.getState().clear();
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
  });

  const path = location.pathname;
  if (path.startsWith("/login")) return <LoginPage />;
  return ok ? <TextToSpeechPage /> : <LoginPage />;
}
