import { useState, useEffect } from 'react';
import api from '../api';

const statusLabel = {
  available: 'Available',
  busy: 'Busy',
  on_break: 'On Break',
  offline: 'Offline',
};

function BookAppointment() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departmentId, setDepartmentId] = useState(''); // empty = all departments
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('en-CA');
  const selectedDoctor = doctors.find((d) => d._id === doctorId);

  const fetchDoctors = async (deptId) => {
    const url = deptId ? `/doctors?department=${deptId}` : '/doctors';
    const res = await api.get(url);
    setDoctors(res.data);
  };

  // On page open: load departments and ALL doctors
  useEffect(() => {
    api.get('/departments')
      .then((res) => setDepartments(res.data))
      .catch(() => setError('Could not load departments'));
    fetchDoctors('').catch(() => setError('Could not load doctors'));
  }, []);

  // Refresh the doctor list every 10 seconds so statuses stay current
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDoctors(departmentId).catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [departmentId]);

  const changeDepartment = async (id) => {
    setDepartmentId(id);
    setDoctorId('');
    setSlots([]);
    setMessage('');
    setError('');
    try {
      await fetchDoctors(id);
    } catch {
      setError('Could not load doctors');
    }
  };

  const loadSlots = async (docId, day) => {
    if (!docId || !day) {
      setSlots([]);
      return;
    }
    const res = await api.get(`/appointments/slots?doctorId=${docId}&date=${day}`);
    setSlots(res.data.slots);
  };

  const book = async (time) => {
    setMessage('');
    setError('');
    try {
      await api.post('/appointments', { doctorId, date, time });
      setMessage(`Appointment booked for ${date} at ${time}`);
    } catch (err) {
      setError(err.response?.data?.message || `Booking failed: ${err.message}`);
    }
    loadSlots(doctorId, date);
  };

  return (
    <div className="card">
      <h3>Book Appointment</h3>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <label>Department (optional)</label>
      <select value={departmentId} onChange={(e) => changeDepartment(e.target.value)}>
        <option value="">All departments (general check-up)</option>
        {departments.map((d) => (
          <option key={d._id} value={d._id}>{d.name}</option>
        ))}
      </select>

      <label>Doctor</label>
      <select
        value={doctorId}
        onChange={(e) => { setDoctorId(e.target.value); loadSlots(e.target.value, date); }}
      >
        <option value="">Select doctor</option>
        {doctors.map((d) => (
          <option key={d._id} value={d._id}>
            {d.user.name} - {d.department?.name} ({d.specialization}) - {statusLabel[d.status]}
          </option>
        ))}
      </select>

      {doctors.length === 0 && <p>No doctors found in this department.</p>}

      {selectedDoctor && (
        <p style={{ marginTop: 0 }}>
          Doctor status right now: <span className="badge">{statusLabel[selectedDoctor.status]}</span>
          <br />
          <small>The time slots below show open appointment times. They are separate from the doctor's live status.</small>
        </p>
      )}

      <label>Date</label>
      <input
        type="date"
        min={today}
        value={date}
        onChange={(e) => { setDate(e.target.value); loadSlots(doctorId, e.target.value); }}
      />

      {doctorId && date && slots.length === 0 && (
        <p>No slots on this date. The doctor may not work on this day.</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {slots.map((s) => (
          <button
            key={s.time}
            disabled={!s.available}
            onClick={() => book(s.time)}
            className={s.available ? '' : 'secondary'}
            style={s.available ? {} : { opacity: 0.5, cursor: 'not-allowed' }}
          >
            {s.time}
          </button>
        ))}
      </div>
    </div>
  );
}

export default BookAppointment;