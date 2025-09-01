import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import TextToSpeechPage from "./pages/TextToSpeech/TextToSpeechPage";
import TextToSpeechLayout from "./pages/TextToSpeech/TextToSpeechLayout";

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<LoginPage />} />

      {/* protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="" element={<TextToSpeechLayout />}>
          <Route path="/app" element={<TextToSpeechPage/>} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
