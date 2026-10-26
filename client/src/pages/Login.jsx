import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function Login() {
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const roles = [
    { key: 'patient', label: 'Patient' },
    { key: 'doctor', label: 'Doctor' },
    { key: 'staff', label: 'Staff' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      const user = res.data.user;

      // The chosen role must match the account (admin may use the Staff option)
      const matches = user.role === role || (role === 'staff' && user.role === 'admin');
      if (!matches) {
        setError(`This account is registered as ${user.role}. Please choose "${user.role}" above.`);
        return;
      }

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || `Login failed: ${err.message}`);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 460, paddingTop: 60 }}>
      <div className="card">
        <div className="brand">
          <div className="brand-logo">C</div>
          <div>
            <div className="brand-name">CareConnect</div>
            <div className="brand-sub">SMART HOSPITAL CARE</div>
          </div>
        </div>

        <h2 style={{ margin: '0 0 4px' }}>Welcome back</h2>
        <p style={{ marginTop: 0, color: '#6b8294' }}>Choose your role and sign in to your dashboard.</p>

        <div className="role-pills">
          {roles.map((r) => (
            <button
              type="button"
              key={r.key}
              className={role === r.key ? '' : 'secondary'}
              onClick={() => { setRole(r.key); setError(''); }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

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

          <button type="submit" style={{ width: '100%' }}>Sign in as {role}</button>
        </form>

        <p style={{ marginBottom: 0 }}>New here? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}

export default Login;