import { useState, useEffect } from 'react';
import api from '../api';

function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [queueInfo, setQueueInfo] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Load my appointments, plus queue details for any I am waiting in
  const load = async () => {
    try {
      const res = await api.get('/appointments/my');
      setAppointments(res.data);

      const info = {};
      for (const a of res.data) {
        if (a.status === 'waiting') {
          try {
            const q = await api.get(`/appointments/${a._id}/queue`);
            info[a._id] = q.data;
          } catch {
            // ignore: queue info is optional
          }
        }
      }
      setQueueInfo(info);
    } catch (err) {
      setError(err.response?.data?.message || `Could not load appointments: ${err.message}`);
    }
  };

  // Load once, then refresh every 10 seconds
  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setMessage('');
    setError('');
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setMessage('Appointment cancelled');
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Cancel failed: ${err.message}`);
    }
  };

  return (
    <div>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      {appointments.length === 0 && <div className="card">You have no appointments yet.</div>}

      {appointments.map((a) => (
        <div className="card" key={a._id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{a.doctor?.user?.name} ({a.department?.name})</strong>
            <span className="badge">{a.status}</span>
          </div>
          <p>Date: {a.date} &nbsp; Time: {a.time}</p>
          {a.tokenNumber && <p>Token: <strong>{a.tokenNumber}</strong></p>}

          {queueInfo[a._id] && (
            <div style={{ background: '#e8f6f4', padding: 10, borderRadius: 6, marginBottom: 10 }}>
              <div>Your position: <strong>{queueInfo[a._id].position}</strong></div>
              <div>Patients ahead: <strong>{queueInfo[a._id].patientsAhead}</strong></div>
              <div>Estimated wait: <strong>{queueInfo[a._id].estimatedWaitMinutes} minutes</strong></div>
            </div>
          )}

          {a.status === 'in-consultation' && <p>You are with the doctor now.</p>}

          {a.status === 'confirmed' && (
            <button className="danger" onClick={() => cancel(a._id)}>Cancel</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default MyAppointments;