export default function Home() {
  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
      <h1>🏨 {process.env.HOTEL_NAME ?? 'Life Hotel'} LINE Bot</h1>
      <p>LINE OA Chatbot — powered by Gemini AI</p>
      <hr />
      <h2>Webhook</h2>
      <code>POST /api/webhook</code>
      <p>Set this URL in your LINE Developers console as the Webhook URL.</p>
      <h2>Setup</h2>
      <code>GET /api/setup?secret=YOUR_SETUP_SECRET</code>
      <p>Run once to create the Rich Menu. Requires <code>SETUP_SECRET</code> env var.</p>
    </main>
  );
}
