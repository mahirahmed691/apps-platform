'use client';

export function LandingDemo() {
  return (
    <div className="landing-demo" aria-hidden="true">
      <div className="landing-demo-studio">
        <div className="landing-demo-panel landing-demo-chat">
          <div className="landing-demo-bar landing-demo-bar-dark" />
          <div className="landing-demo-bar landing-demo-bar-dark landing-demo-bar-short" />
          <div className="landing-demo-mic">
            <span className="landing-demo-mic-ring" />
            <span className="landing-demo-mic-core" />
          </div>
          <div className="landing-demo-wave">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        </div>
        <div className="landing-demo-panel landing-demo-doc">
          <div className="landing-demo-paper">
            <div className="landing-demo-line landing-demo-line-title" />
            <div className="landing-demo-line landing-demo-line-sub" />
            <div className="landing-demo-section">
              <div className="landing-demo-line landing-demo-line-label" />
              <div className="landing-demo-line" />
              <div className="landing-demo-line landing-demo-line-fill" />
            </div>
            <div className="landing-demo-section landing-demo-section-capture">
              <div className="landing-demo-line landing-demo-line-label" />
              <div className="landing-demo-line landing-demo-line-fill landing-demo-line-animate" />
            </div>
          </div>
        </div>
      </div>
      <p className="landing-demo-caption">Speak on the left. Watch your CV appear on the right.</p>
    </div>
  );
}
