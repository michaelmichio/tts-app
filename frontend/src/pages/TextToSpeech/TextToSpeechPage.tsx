import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import type { Conversion } from "../../interfaces/conversion.interface";
import {
  Play,
  Pause,
  Square,
  Volume2,
  RotateCcw,
  Trash,
  Save,
} from "lucide-react";
import { clamp } from "../../helpers/main.helper";

export default function TextToSpeechPage() {
  const [text, setText] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  const [history, setHistory] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");

  const lastIndexRef = useRef<number>(0);

  const [voices, setVoices] = useState<any>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");

  const synthRef = useRef(window.speechSynthesis);

  // load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synthRef.current.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(availableVoices[0].voiceURI);
      }
    };

    loadVoices();
    synthRef.current.addEventListener("voiceschanged", loadVoices);

    return () => {
      synthRef.current.removeEventListener("voiceschanged", loadVoices);
    };
  }, [selectedVoiceURI]);

  // load history
  const load = async () => {
    const res = await api.get("/api/conversions");
    setHistory(res.data.items);
  };
  useEffect(() => {
    load();
  }, []);

  // pick speech voice object from browser by URI
  const pickVoice = (v: string): SpeechSynthesisVoice | null => {
    if (!v) return null;
    const voices = synthRef.current.getVoices();
    const byURI = voices.find((voice: any) => voice.voiceURI === v);
    return byURI ?? voices[0] ?? null;
  };

  const play = () => {
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(selectedVoiceURI);

    if (voice) utterance.voice = voice;
    utterance.rate = clamp(rate, 0.1, 10);
    utterance.pitch = clamp(pitch, 0, 2);
    utterance.volume = clamp(volume, 0, 1);

    // reset position
    lastIndexRef.current = 0;

    utterance.onboundary = (e: any) => {
      // e.charIndex available on Chrome; safe fallback if undefined
      if (typeof e.charIndex === "number") lastIndexRef.current = e.charIndex;
    };
    utterance.onstart = () => setStatus("playing");
    utterance.onend = () => setStatus("idle");
    utterance.onpause = () => setStatus("paused");
    utterance.onresume = () => setStatus("playing");
    utterance.onerror = () => setStatus("idle");

    synthRef.current.cancel();
    synthRef.current.speak(utterance);
  };

  const pause = () => {
    if (synthRef.current.speaking && !synthRef.current.paused) {
      synthRef.current.pause();
      setStatus("paused");
    }
  };

  const resume = () => {
    if (!text.trim()) return;

    // Try a normal resume first
    if (synthRef.current.paused) {
      synthRef.current.resume();

      // check 150ms later, if still paused or not playing, fallback
      setTimeout(() => {
        const stillPaused = synthRef.current.paused;
        const notSpeaking = !synthRef.current.speaking;

        if (stillPaused || notSpeaking) {
          // Fallback: speak remaining text from lastIndex
          const start = Math.min(lastIndexRef.current || 0, text.length - 1);
          const remaining = text.slice(start);

          if (!remaining.trim()) return;

          const utterance = new SpeechSynthesisUtterance(remaining);
          const voice = pickVoice(selectedVoiceURI);

          if (voice) utterance.voice = voice;
          utterance.rate = clamp(rate, 0.1, 10);
          utterance.pitch = clamp(pitch, 0, 2);
          utterance.volume = clamp(volume, 0, 1);

          // reset boundary for new session
          lastIndexRef.current = 0;

          utterance.onboundary = (e: any) => {
            if (typeof e.charIndex === "number")
              lastIndexRef.current = start + e.charIndex;
          };
          utterance.onstart = () => setStatus("playing");
          utterance.onend = () => setStatus("idle");
          utterance.onpause = () => setStatus("paused");
          utterance.onresume = () => setStatus("playing");
          utterance.onerror = () => setStatus("idle");

          synthRef.current.cancel();
          synthRef.current.speak(utterance);
        } else {
          setStatus("playing");
        }
      }, 150);
    }
  };

  const stop = () => {
    synthRef.current.cancel();
    setStatus("idle");
    lastIndexRef.current = 0;
  };

  const save = async () => {
    if (!selectedVoiceURI) {
      return;
    }

    setLoading(true);
    const voice = pickVoice(selectedVoiceURI);

    try {
      await api.post("/api/conversions", {
        text,
        voiceURI: voice?.voiceURI,
        voiceName: voice?.name,
        voiceLang: voice?.lang,
        rate,
        pitch,
        volume,
      });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const replayFromHistory = (entry: any) => {
    setText(entry.text);
    setSelectedVoiceURI(entry.voiceUri);
    setRate(entry.rate);
    setPitch(entry.pitch);
    setVolume(entry.volume);

    // Auto-play after a short delay
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(entry.text);
      const voice = voices.find((v: any) => v.voiceUri === entry.voiceUri);

      if (voice) utterance.voice = voice;
      utterance.rate = clamp(entry.rate, 0.1, 10);
      utterance.pitch = clamp(entry.pitch, 0, 2);
      utterance.volume = clamp(entry.volume, 0, 1);

      // reset position
      lastIndexRef.current = 0;

      utterance.onboundary = (e: any) => {
        // e.charIndex available on Chrome; safe fallback if undefined
        if (typeof e.charIndex === "number") lastIndexRef.current = e.charIndex;
      };
      utterance.onstart = () => setStatus("playing");
      utterance.onend = () => setStatus("idle");
      utterance.onpause = () => setStatus("paused");
      utterance.onresume = () => setStatus("playing");
      utterance.onerror = () => setStatus("idle");

      synthRef.current.cancel();
      synthRef.current.speak(utterance);
    }, 150);
  };

  const remove = async (id: string) => {
    if (
      !confirm(
        "Delete this conversion? The associated MP3 file may also be deleted if no other use is made."
      )
    )
      return;
    await api.delete(`/api/conversions/${id}`);
    await load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Text Input */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label
              id="text-to-convert"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Text to Convert
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Enter the text you want to convert to speech..."
              aria-labelledby="text-to-convert"
            />
            <div className="flex justify-between items-center mt-3">
              <div className="text-sm text-gray-500">
                Characters: {text.length}
              </div>
              <button
                onClick={() => setText("")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                aria-label="clear text"
              >
                Clear Text
              </button>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label
              id="voice-selection"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Voice Selection
            </label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              aria-labelledby="voice-selection"
            >
              {voices.map((voice: any) => (
                <option key={voice.name} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Audio Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">
                Audio Controls
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Volume2 className="w-4 h-4" />
                <span>
                  {status === "playing"
                    ? "Playing"
                    : status === "paused"
                    ? "Paused"
                    : "Ready"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center gap-2"
                onClick={play}
                disabled={!text.trim()}
                aria-label="play"
              >
                {status === "idle" ? (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Play</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-5 h-5" />
                    <span>Replay</span>
                  </>
                )}
              </button>
              {status !== "paused" ? (
                <button
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center gap-2"
                  onClick={pause}
                  disabled={status !== "playing"}
                  aria-label="pause"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center gap-2"
                  onClick={resume}
                  aria-label="resume"
                >
                  <Play className="w-5 h-5" />
                  Resume
                </button>
              )}
              <button
                onClick={stop}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center gap-2"
                disabled={status === "idle"}
                aria-label="stop"
              >
                <Square className="w-5 h-5" />
                <span>Stop</span>
              </button>
              <button
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors flex items-center gap-2"
                onClick={save}
                disabled={loading || !selectedVoiceURI || !text.trim()}
                aria-label="save"
              >
                <Save className="w-5 h-5" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Voice Customization */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-lg font-semibold text-gray-900 mb-4">
              Voice Settings
            </div>

            <div className="space-y-4">
              <div>
                <label
                  id="rate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Rate: {rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  aria-labelledby="rate"
                />
              </div>

              <div>
                <label
                  id="pitch"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Pitch: {pitch.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  aria-labelledby="pitch"
                />
              </div>

              <div>
                <label
                  id="volume"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Volume: {Math.round(volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  aria-labelledby="volume"
                />
              </div>

              <button
                onClick={() => {
                  setRate(1);
                  setPitch(1);
                  setVolume(1);
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                aria-label="reset to default"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
            </div>
          </div>

          {/* History Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-lg font-semibold text-gray-900 mb-4">
              Conversion History
            </div>

            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No conversions yet
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {history.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-sm text-gray-600 mb-2">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-900 mb-2 line-clamp-2">
                      {entry.text.substring(0, 100)}...
                    </div>
                    <div className="text-xs text-gray-500 mb-0">
                      {entry.voiceName} ({entry.voiceLang})
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Rate {entry.rate}x • Pitch {entry.pitch}x • Vol{" "}
                      {entry.volume * 100}%
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => replayFromHistory(entry)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs flex items-center gap-1"
                        aria-label="replay"
                      >
                        <Play className="w-3 h-3" />
                        Replay
                      </button>
                      <button
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-xs flex items-center gap-1"
                        onClick={() => remove(entry.id)}
                        aria-label="delete"
                      >
                        <Trash className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
