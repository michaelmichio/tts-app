import { useEffect, useRef, useState } from "react";
import VoiceSelector, { type VoiceInfo } from "../components/VoiceSelector";
import { useAuthStore } from "../store";
import { api } from "../api";
import type { Conversion } from "../types";

export default function TTSPage() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clear);

  const [text, setText] = useState("");
  const [voice, setVoice] = useState<VoiceInfo | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  const [items, setItems] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastIndexRef = useRef<number>(0);

  // load history
  const load = async () => {
    const res = await api.get("/api/conversions");
    setItems(res.data.items);
  };
  useEffect(() => {
    load();
  }, []);

  // pick speech voice object from browser by URI/lang
  const pickVoice = (v: VoiceInfo | null): SpeechSynthesisVoice | null => {
    if (!v) return null;
    const voices = window.speechSynthesis.getVoices();
    const byURI = voices.find(
      (vv: any) => (vv.voiceURI ?? `${vv.name}-${vv.lang}`) === v.uri
    );
    if (byURI) return byURI;
    const byLang = voices.find((vv) => vv.lang === v.lang);
    return byLang ?? voices[0] ?? null;
  };

  const play = () => {
    if (!text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    const sel = pickVoice(voice);
    if (sel) u.voice = sel;
    u.rate = clamp(rate, 0.1, 10);
    u.pitch = clamp(pitch, 0, 2);
    u.volume = clamp(volume, 0, 1);

    // reset position
    lastIndexRef.current = 0;

    u.onboundary = (e: any) => {
      // e.charIndex available on Chrome; safe fallback if undefined
      if (typeof e.charIndex === "number") lastIndexRef.current = e.charIndex;
    };
    u.onstart = () => setStatus("playing");
    u.onend = () => setStatus("idle");
    u.onpause = () => setStatus("paused");
    u.onresume = () => setStatus("playing");
    u.onerror = () => setStatus("idle");

    utterRef.current = u;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  };

  const resume = () => {
    if (!text.trim()) return;
    // Try a normal resume first
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      // check 150ms later, if still paused or not playing, fallback
      setTimeout(() => {
        const stillPaused = window.speechSynthesis.paused;
        const notSpeaking = !window.speechSynthesis.speaking;
        if (stillPaused || notSpeaking) {
          // Fallback: speak remaining text from lastIndex
          const start = Math.min(lastIndexRef.current || 0, text.length - 1);
          const remaining = text.slice(start);
          if (!remaining.trim()) return;

          const u = new SpeechSynthesisUtterance(remaining);
          const sel = pickVoice(voice);
          if (sel) u.voice = sel;
          u.rate = clamp(rate, 0.1, 10);
          u.pitch = clamp(pitch, 0, 2);
          u.volume = clamp(volume, 0, 1);

          // reset boundary for new session
          lastIndexRef.current = 0;
          u.onboundary = (e: any) => {
            if (typeof e.charIndex === "number")
              lastIndexRef.current = start + e.charIndex;
          };
          u.onstart = () => setStatus("playing");
          u.onend = () => setStatus("idle");
          u.onerror = () => setStatus("idle");

          utterRef.current = u;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } else {
          setStatus("playing");
        }
      }, 150);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setStatus("idle");
    lastIndexRef.current = 0;
  };

  const save = async () => {
    if (!voice) {
      alert("Pilih voice dulu");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/conversions", {
        text,
        voiceURI: voice.uri,
        voiceName: voice.name,
        voiceLang: voice.lang,
        rate,
        pitch,
        volume,
      });
      await load();
    } finally {
      setLoading(false);
    }
  };

  const replay = (c: Conversion) => {
    const v: VoiceInfo = {
      uri: c.voiceURI,
      name: c.voiceName,
      lang: c.voiceLang,
    };
    const u = new SpeechSynthesisUtterance(c.text);
    const sel = pickVoice(v);
    if (sel) u.voice = sel;
    u.rate = clamp(c.rate, 0.1, 10);
    u.pitch = clamp(c.pitch, 0, 2);
    u.volume = clamp(c.volume, 0, 1);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
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

  const logout = () => {
    clearAuth();
    location.href = "/login";
  };

  if (!user) {
    location.href = "/login";
    return null;
  }

  return (
    <div className="container">
      <header className="row space">
        <h1>TTS Converter</h1>
        <div className="row gap small">
          <span className="muted">{user.email}</span>
          <button className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <h2>Input</h2>
          <textarea
            className="input"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write the text you want to read..."
          />
          <label className="col">
            <span>Voice</span>
            <VoiceSelector value={voice?.uri} onChange={setVoice} />
          </label>
          <div className="row gap">
            <label className="col flex">
              <span>Rate: {rate.toFixed(2)}</span>
              <input
                type="range"
                min={0.1}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
              />
            </label>
            <label className="col flex">
              <span>Pitch: {pitch.toFixed(2)}</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
              />
            </label>
            <label className="col flex">
              <span>Volume: {volume.toFixed(2)}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="row gap">
            <button className="btn" onClick={play} disabled={!text.trim()}>
              Play
            </button>
            {status !== "paused" ? (
              <button
                className="btn ghost"
                onClick={pause}
                disabled={status !== "playing"}
              >
                Pause
              </button>
            ) : (
              <button className="btn ghost" onClick={resume}>
                Resume
              </button>
            )}
            <button className="btn danger" onClick={stop}>
              Stop
            </button>
            <button
              className="btn success"
              onClick={save}
              disabled={loading || !voice}
            >
              Save
            </button>
          </div>
        </div>

        <div className="card">
          <h2>History</h2>
          {items.length === 0 && (
            <div className="muted">There are no conversions yet.</div>
          )}
          <ul className="list">
            {items.map((c) => (
              <li key={c.id} className="row space">
                <div className="col">
                  <div className="text-ellipsis">{c.text}</div>
                  <div className="muted small">
                    {c.voiceName} ({c.voiceLang}) · rate {c.rate} · pitch{" "}
                    {c.pitch} · vol {c.volume} ·{" "}
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="row gap">
                  <button className="btn" onClick={() => replay(c)}>
                    Replay
                  </button>
                  {c.mediaId && (
                    <a
                      className="btn ghost"
                      href={`${import.meta.env.VITE_API_URL}/api/media/${
                        c.mediaId
                      }`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download MP3
                    </a>
                  )}
                  <button className="btn danger" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
