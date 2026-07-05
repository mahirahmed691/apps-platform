import { getMissingEnvVars } from '@/lib/env';

export function SetupRequired() {
  const missing = getMissingEnvVars();

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '40rem' }}>
      <h1>Setup required</h1>
      <p>Supabase client env vars are missing from <code>.env.local</code>.</p>
      <ul>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
      <p>Fill them in manually, or run from the repo root:</p>
      <pre style={{ background: '#f5f5f5', padding: '1rem', overflowX: 'auto' }}>
        node scripts/fill-env.js ceevie &lt;supabase-project-ref&gt;
      </pre>
      <p>Then restart the dev server.</p>
    </main>
  );
}
