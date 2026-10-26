import { useState, useEffect } from 'react';
import api from '../api';

function MedicalHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/appointments/history/my')
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err.response?.data?.message || `Could not load history: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading...</div>;

  return (
    <div>
      {error && <div className="error">{error}</div>}

      {!error && records.length === 0 && (
        <div className="card">You have no medical records yet.</div>
      )}

      {records.map((r) => (
        <div className="card" key={r._id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{r.doctor?.user?.name}</strong>
            <span className="badge">{r.appointment?.date} {r.appointment?.time}</span>
          </div>
          <p><strong>Visit reason:</strong> {r.visitReason || '-'}</p>
          <p><strong>Doctor notes:</strong> {r.notes || '-'}</p>
          <p><strong>Diagnosis:</strong> {r.diagnosis || '-'}</p>
          <p><strong>Prescription:</strong> {r.prescription || '-'}</p>
          <p><strong>Follow-up date:</strong> {r.followUpDate || '-'}</p>
        </div>
      ))}
    </div>
  );
}

export default MedicalHistory;