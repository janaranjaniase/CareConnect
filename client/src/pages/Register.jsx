import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Register() {
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  // Load departments so a doctor can choose one
  useEffect(() => {
    api.get('/departments')
      .then((res) => setDepartments(res.data))
      .catch(() => setError('Could not load departments'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const body = { name, email: email.trim().toLowerCase(), phone, password, role };
    if (role === 'doctor') {
      body.departmentId = departmentId;
      body.specialization = specialization;
    }

    try {
      await api.post('/auth/register', body);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || `Registration failed: ${err.message}`);
    }
  };

  const roles = [
    { key: 'patient', label: 'Patient' },
    { key: 'doctor', label: 'Doctor' },
    { key: 'staff', label: 'Staff' },
  ];

  return (
    <div className="container" style={{ maxWidth: 460 }}>
      <div className="card">
        <h2>Create your CareConnect account</h2>

        <label>I am a</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {roles.map((r) => (
            <button
              type="button"
              key={r.key}
              className={role === r.key ? '' : 'secondary'}
              onClick={() => setRole(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />

          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />

          {role === 'doctor' && (
            <>
              <label>Department</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>

              <label>Specialization</label>
              <input
                placeholder="e.g. Interventional Cardiology"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
              />
            </>
          )}

                    <label>Password</label>
          <div className="password-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button type="submit">Register as {role}</button>
        </form>

        <p>Already registered? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

export default Register;