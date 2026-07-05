type VoiceListeningIndicatorProps = {
  /** Shown while mic is active (listening, starting, recording). */
  active: boolean;
};

const BAR_DELAYS = [0, 0.08, 0.16, 0.05, 0.12, 0.2, 0.1];

export function VoiceListeningIndicator({ active }: VoiceListeningIndicatorProps) {
  if (!active) return null;

  return (
    <div className="voice-waveform" aria-hidden="true">
      {BAR_DELAYS.map((delay, index) => (
        <span
          key={index}
          className="voice-wave-bar"
          style={{ animationDelay: `${delay}s`, animationDuration: `${0.72 + (index % 3) * 0.08}s` }}
        />
      ))}
    </div>
  );
}
