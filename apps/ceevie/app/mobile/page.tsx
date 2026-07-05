'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { queueAnswerIfOffline } from '@/components/StudioToolkit';

export default function MobileMicPage() {
  const { session, loading } = useAuth({ requireAuth: true });
  const accessToken = session?.access_token;
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !accessToken) return;

    if (queueAnswerIfOffline(trimmed)) {
      setStatus('Saved offline — open studio on desktop to sync.');
      setText('');
      return;
    }

    setStatus('Sending to your studio draft…');
    const draftRes = await fetch('/api/cv/draft', { headers: { Authorization: `Bearer ${accessToken}` } });
    const draftData = await draftRes.json();
    const messages = Array.isArray(draftData.draft?.messages) ? draftData.draft.messages : [];
    messages.push({ id: crypto.randomUUID(), role: 'user', content: trimmed });

    await fetch('/api/cv/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        answers: draftData.draft?.answers ?? {},
        messages,
        finished: draftData.draft?.finished ?? false,
        turnCount: (draftData.draft?.turnCount ?? 0) + 1,
        generatedCv: draftData.draft?.generatedCv ?? null,
      }),
    });

    setStatus('Answer sent. Continue on your main studio screen.');
    setText('');
  }

  if (loading) return <LoadingScreen message="Opening mobile mic…" />;

  return (
    <div className="invite-shell ceevie-dark-shell">
      <section className="invite-card">
        <p className="invite-kicker">Phone as mic</p>
        <h1>Capture answers on your phone</h1>
        <p className="invite-copy">Type or dictate here while your CV preview stays open on desktop.</p>
        <form onSubmit={handleSubmit}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Speak your answer…" />
          <button type="submit" className="btn btn-primary">Send to studio</button>
        </form>
        {status ? <p className="invite-footnote">{status}</p> : null}
      </section>
    </div>
  );
}
