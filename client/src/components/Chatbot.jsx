import { useState, useRef, useEffect } from 'react';
import api from '../api';

function Chatbot() {
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hello! I am the CareConnect assistant. Ask me about booking, your queue status, your appointments, or doctors in a department.' }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || sending) return;

    setMessages((prev) => [...prev, { from: 'me', text: msg }]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/chatbot', { message: msg });
      setMessages((prev) => [...prev, { from: 'bot', text: res.data.reply }]);
    } catch (err) {
      const errorText = err.response?.data?.message || `Something went wrong: ${err.message}`;
      setMessages((prev) => [...prev, { from: 'bot', text: errorText }]);
    }
    setSending(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const quickQuestions = [
    'How do I book an appointment?',
    'How many patients are ahead of me?',
    'What is my next appointment?',
    'How can I cancel?',
  ];

  return (
    <div className="card">
      <h3>Hospital Assistant</h3>

      <div style={{ height: 320, overflowY: 'auto', background: '#f4f7f6', padding: 10, borderRadius: 8, marginBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
            <div
              style={{
                maxWidth: '75%',
                padding: '8px 12px',
                borderRadius: 12,
                whiteSpace: 'pre-line',
                background: m.from === 'me' ? '#00a896' : 'white',
                color: m.from === 'me' ? 'white' : '#1f2d2b',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {quickQuestions.map((q) => (
          <button key={q} className="secondary" style={{ fontSize: 12, padding: '6px 10px' }} onClick={() => send(q)}>
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          style={{ margin: 0 }}
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={sending}>Send</button>
      </form>
    </div>
  );
}

export default Chatbot;