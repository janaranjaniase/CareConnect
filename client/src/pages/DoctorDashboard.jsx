import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';

function DoctorDashboard({ user }) {
  const today = new Date().toLocaleDateString('en-CA');
  const emptyForm = { visitReason: '', notes: '', diagnosis: '', prescription: '', followUpDate: '' };

  const [date, setDate] = useState(today);
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [recordFor, setRecordFor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [history, setHistory] = useState(null);

  // Find which doctor profile belongs to the logged-in user (once)
  useEffect(() => {
    api.get('/doctors')
      .then((res) => {
        const mine = res.data.find((d) => d.user?._id === user.id);
        if (mine) setDoctor(mine);
        else setError('No doctor profile is linked to this account. Ask the admin to create one.');
      })
      .catch((err) => setError(`Could not load doctor profile: ${err.message}`));
  }, [user.id]);

  const load = async () => {
    if (!doctor) return;
    try {
      const res = await api.get(`/appointments/day?date=${date}&doctorId=${doctor._id}`);
      setAppointments(res.data);
    } catch (err) {
      setError(err.response?.data?.message || `Could not load appointments: ${err.message}`);
    }
  };

  // Load now, then refresh every 10 seconds
  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor, date]);

  // One helper for Start / Complete / No-show
  const act = async (path, successText) => {
    setMessage('');
    setError('');
    try {
      await api.patch(path, {});
      setMessage(successText);
      load();
    } catch (err) {
      setError(err.response?.data?.message || `Action failed: ${err.message}`);
    }
  };

  const changeStatus = async (status) => {
    setMessage('');
    setError('');
    try {
      const res = await api.patch('/doctors/status', { status });
      setDoctor({ ...doctor, status: res.data.status });
      setMessage(`Your status is now "${status}"`);
    } catch (err) {
      setError(err.response?.data?.message || `Could not change status: ${err.message}`);
    }
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.post(`/appointments/${recordFor._id}/record`, form);
      setMessage('Medical record saved');
      setRecordFor(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.response?.data?.message || `Could not save record: ${err.message}`);
    }
  };

  const showHistory = async (a) => {
    setError('');
    try {
      const res = await api.get(`/appointments/history/patient/${a.patient._id}`);
      setHistory({ name: a.patient.name, records: res.data });
    } catch (err) {
      setError(err.response?.data?.message || `Could not load history: ${err.message}`);
    }
  };

  // Order: in consultation first, then waiting (priority, then token), then confirmed, then the rest
  const order = { 'in-consultation': 0, waiting: 1, confirmed: 2 };
  const rank = { emergency: 0, urgent: 1, high: 2, normal: 3 };
  const sorted = [...appointments].sort((a, b) => {
    const oa = order[a.status] ?? 3;
    const ob = order[b.status] ?? 3;
    if (oa !== ob) return oa - ob;
    if (a.status === 'waiting') {
      if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
      return parseInt(a.tokenNumber.slice(1)) - parseInt(b.tokenNumber.slice(1));
    }
    return a.time.localeCompare(b.time);
  });

  const count = (status) => appointments.filter((a) => a.status === status).length;
  const serving = appointments.find((a) => a.status === 'in-consultation');

  const stats = [
    { label: 'Now serving', value: serving ? serving.tokenNumber : '-' },
    { label: 'Waiting', value: count('waiting') },
    { label: 'Confirmed', value: count('confirmed') },
    { label: 'Completed', value: count('completed') },
    { label: 'No-show', value: count('no-show') },
  ];

  const updateForm = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const items = [{ key: 'queue', label: "Today's Queue" }];
  const subtitle = doctor
    ? `${doctor.specialization} · ${doctor.department?.name}. Call patients, write records and manage your status.`
    : 'Loading your doctor profile...';

  return (
    <Layout user={user} items={items} active="queue" onSelect={() => {}} subtitle={subtitle}>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      {doctor && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <strong>My availability</strong>
            <div style={{ color: '#6b8294', fontSize: 14 }}>Patients see this status when they book.</div>
          </div>
          <select style={{ margin: 0, maxWidth: 220 }} value={doctor.status} onChange={(e) => changeStatus(e.target.value)}>
            <option value="available">available</option>
            <option value="busy">busy</option>
            <option value="on_break">on_break</option>
            <option value="offline">offline</option>
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {stats.map((s) => (
          <div className="card" key={s.label} style={{ flex: 1, minWidth: 120, marginBottom: 0, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1b4965' }}>{s.value}</div>
            <div>{s.label}</div>
          </div>
        ))}
      </div>

      {recordFor && (
        <div className="card">
          <h3>Medical record for {recordFor.patient?.name} ({recordFor.time})</h3>
          <form onSubmit={saveRecord}>
            <label>Visit reason</label>
            <input value={form.visitReason} onChange={updateForm('visitReason')} />
            <label>Doctor notes</label>
            <textarea rows={3} value={form.notes} onChange={updateForm('notes')} />
            <label>Diagnosis</label>
            <input value={form.diagnosis} onChange={updateForm('diagnosis')} />
            <label>Prescription</label>
            <textarea rows={2} value={form.prescription} onChange={updateForm('prescription')} />
            <label>Follow-up date</label>
            <input type="date" value={form.followUpDate} onChange={updateForm('followUpDate')} />
            <button type="submit" style={{ marginRight: 8 }}>Save record</button>
            <button type="button" className="secondary" onClick={() => { setRecordFor(null); setForm(emptyForm); }}>Cancel</button>
          </form>
        </div>
      )}

      {history && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>History of {history.name}</h3>
            <button className="secondary" onClick={() => setHistory(null)}>Close</button>
          </div>
          {history.records.length === 0 && <p>No previous records.</p>}
          {history.records.map((r) => (
            <div key={r._id} style={{ borderTop: '1px solid #e1ecea', marginTop: 10, paddingTop: 10 }}>
              <strong>{r.appointment?.date} {r.appointment?.time}</strong> with {r.doctor?.user?.name}
              <p>Reason: {r.visitReason || '-'}</p>
              <p>Notes: {r.notes || '-'}</p>
              <p>Diagnosis: {r.diagnosis || '-'}</p>
              <p>Prescription: {r.prescription || '-'}</p>
              <p>Follow-up: {r.followUpDate || '-'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 220 }} />

        {sorted.length === 0 ? (
          <p>No appointments on this date.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e1ecea' }}>
                  <th style={{ padding: 8 }}>Token</th>
                  <th style={{ padding: 8 }}>Time</th>
                  <th style={{ padding: 8 }}>Patient</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Priority</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => (
                  <tr key={a._id} style={{ borderBottom: '1px solid #e1ecea' }}>
                    <td style={{ padding: 8 }}>{a.tokenNumber || '-'}</td>
                    <td style={{ padding: 8 }}>{a.time}</td>
                    <td style={{ padding: 8 }}>{a.patient?.name}</td>
                    <td style={{ padding: 8 }}><span className="badge">{a.status}</span></td>
                    <td style={{ padding: 8 }}>{a.priority}</td>
                    <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                      {a.status === 'waiting' && (
                        <button style={{ marginRight: 6 }} onClick={() => act(`/appointments/${a._id}/start`, 'Consultation started')}>
                          Start
                        </button>
                      )}
                      {a.status === 'in-consultation' && (
                        <button style={{ marginRight: 6 }} onClick={() => act(`/appointments/${a._id}/complete`, 'Consultation completed')}>
                          Complete
                        </button>
                      )}
                      {(a.status === 'in-consultation' || a.status === 'completed') && (
                        <button className="secondary" style={{ marginRight: 6 }} onClick={() => setRecordFor(a)}>
                          Add record
                        </button>
                      )}
                      {(a.status === 'confirmed' || a.status === 'waiting') && (
                        <button className="danger" style={{ marginRight: 6 }} onClick={() => act(`/appointments/${a._id}/no-show`, 'Marked as no-show')}>
                          No-show
                        </button>
                      )}
                      <button className="secondary" onClick={() => showHistory(a)}>History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default DoctorDashboard;