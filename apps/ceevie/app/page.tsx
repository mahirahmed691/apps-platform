export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>It's alive.</h1>
      <p>This is the placeholder home page. API routes are live at:</p>
      <ul>
        <li><code>/api/ai/generate</code></li>
        <li><code>/api/stripe/webhook</code></li>
        <li><code>/api/stripe/checkout</code></li>
      </ul>
      <p>Replace this page with the actual product UI.</p>
    </main>
  );
}
