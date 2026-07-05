'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function SharedCvPage() {
  const params = useParams<{ token: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [label, setLabel] = useState('Shared CV');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/public/share/${params.token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Share not found');
          return;
        }
        setContent(data.share.content);
        setLabel(data.share.label ?? 'Shared CV');
      })
      .catch(() => setError('Could not load shared CV'));
  }, [params.token]);

  return (
    <div className="invite-shell ceevie-dark-shell">
      <section className="invite-card">
        <p className="invite-kicker">Shared via Ceevie</p>
        <h1>{label}</h1>
        {error ? <p className="recruiter-error">{error}</p> : null}
        {content ? <pre className="recruiter-candidate-cv">{content}</pre> : null}
      </section>
    </div>
  );
}
