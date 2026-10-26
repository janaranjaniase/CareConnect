import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';

const statusLabel = {
  available: 'Available',
  busy: 'Busy',
  on_break: 'On Break',
  offline: 'Offline',
};

function StaffDashboard({ user }) {
  const today = new Date().toLocaleDateString('en-CA');
  const [tab, setTab] = useState('appointments');
  const [date, setDate] = useState(today);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/appointments/day?date=${date}`);
      setAppointments(res.data);
    } catch (err) {
      setError(err.response?.data?.message || `Could not load appointments: ${err.message}`);
    }
  };

  const loadDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data);
    } catch (err) {
      setError(err.response?.data?.message || `Could not load doctors: ${err.message}`);
    }
  };

  // Appointments: load now, refresh every 10 seconds, reload when the date changes
  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Doctor status: load now, refresh every 10 seconds
  useEffect(() => {
    loadDoctors();
    const timer = setInterval(loadDoctors, 10000);
    return () => clearInterval(timer);
  }, []);

  // One helper for check-in, priority and no-show
  const act = async (path, body, successText) => {
    setMessage('');
    setError('');
    try {
      await api.patch(path, body);
      setMessage(successText);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Action failed: ${err.message}`);
    }
  };

  const count = (status) => appointments.filter((a) => a.status === status).length;

  const stats = [
    { label: 'Total', value: appointments.length },
    { label: 'Confirmed', value: count('confirmed') },
    { label: 'Waiting', value: count('waiting') },
    { label: 'In consultation', value: count('in-consultation') },
    { label: 'Completed', value: count('completed') },
  ];

  const items = [
    { key: 'appointments', label: 'Appointments' },
    { key: 'doctors', label: 'Doctor Status' },
  ];

  const subtitles = {
    appointments: 'Check patients in, set priority and manage the live queue.',
    doctors: 'See which doctors are available, busy, on a break or offline.',
  };

  return (
    <Layout user={user} items={items} active={tab} onSelect={setTab} subtitle={subtitles[tab]}>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      {tab === 'appointments' && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {stats.map((s) => (
              <div className="card" key={s.label} style={{ flex: 1, minWidth: 120, marginBottom: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1b4965' }}>{s.value}</div>
                <div>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 220 }} />

            {appointments.length === 0 ? (
              <p>No appointments on this date.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #e1ecea' }}>
                      <th style={{ padding: 8 }}>Time</th>
                      <th style={{ padding: 8 }}>Patient</th>
                      <th style={{ padding: 8 }}>Doctor</th>
                      <th style={{ padding: 8 }}>Token</th>
                      <th style={{ padding: 8 }}>Status</th>
                      <th style={{ padding: 8 }}>Priority</th>
                      <th style={{ padding: 8 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => {
                      const canChange = a.status === 'confirmed' || a.status === 'waiting';
                      return (
                        <tr key={a._id} style={{ borderBottom: '1px solid #e1ecea' }}>
                          <td style={{ padding: 8 }}>{a.time}</td>
                          <td style={{ padding: 8 }}>{a.patient?.name}</td>
                          <td style={{ padding: 8 }}>{a.doctor?.user?.name}</td>
                          <td style={{ padding: 8 }}>{a.tokenNumber || '-'}</td>
                          <td style={{ padding: 8 }}><span className="badge">{a.status}</span></td>
                          <td style={{ padding: 8 }}>
                            {canChange ? (
                              <select
                                style={{ margin: 0, padding: 6 }}
                                value={a.priority}
                                onChange={(e) => act(`/appointments/${a._id}/priority`, { priority: e.target.value }, 'Priority updated')}
                              >
                                <option value="normal">normal</option>
                                <option value="high">high</option>
                                <option value="urgent">urgent</option>
                                <option value="emergency">emergency</option>
                              </select>
                            ) : (
                              a.priority
                            )}
                          </td>
                          <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                            {a.status === 'confirmed' && (
                              <button
                                style={{ marginRight: 6 }}
                                onClick={() => act(`/appointments/${a._id}/check-in`, {}, 'Patient checked in')}
                              >
                                Check in
                              </button>
                            )}
                            {canChange && (
                              <button
                                className="danger"
                                onClick={() => act(`/appointments/${a._id}/no-show`, {}, 'Marked as no-show')}
                              >
                                No-show
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'doctors' && (
        <div className="card">
          {doctors.length === 0 ? (
            <p>No doctors registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e1ecea' }}>
                    <th style={{ padding: 8 }}>Doctor</th>
                    <th style={{ padding: 8 }}>Department</th>
                    <th style={{ padding: 8 }}>Specialization</th>
                    <th style={{ padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((d) => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #e1ecea' }}>
                      <td style={{ padding: 8 }}>{d.user?.name}</td>
                      <td style={{ padding: 8 }}>{d.department?.name}</td>
                      <td style={{ padding: 8 }}>{d.specialization}</td>
                      <td style={{ padding: 8 }}><span className="badge">{statusLabel[d.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default StaffDashboard;