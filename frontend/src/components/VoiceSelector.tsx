import { useEffect, useMemo, useState } from "react";

export type VoiceInfo = {
  uri: string;
  name: string;
  lang: string;
};

type Props = {
  value?: string; // voiceURI
  onChange: (v: VoiceInfo) => void;
};

export default function VoiceSelector({ value, onChange }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // load voices
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const options = useMemo(
    () =>
      voices.map((v) => ({
        uri: (v as any).voiceURI ?? `${v.name}-${v.lang}`,
        name: v.name,
        lang: v.lang,
      })),
    [voices]
  );

  const current: any = value && options.find((o) => o.uri === value); //

  return (
    <select
      value={current?.uri || ""}
      onChange={(e) => {
        const v = options.find((o) => o.uri === e.target.value);
        if (v) onChange(v);
      }}
      className="input"
    >
      <option value="" disabled>
        Select voice...
      </option>
      {options.map((o) => (
        <option key={o.uri} value={o.uri}>
          {o.name} ({o.lang})
        </option>
      ))}
    </select>
  );
}
