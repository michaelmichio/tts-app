import { Outlet } from "react-router-dom";
import Footer from "../../components/Footer";
import Header from "../../components/Header";

export default function TextToSpeechLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header />
      
      <Outlet />

      {/* Footer */}
      <Footer />
    </div>
  );
}
