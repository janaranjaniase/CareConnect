import { Navigate, useNavigate } from 'react-router-dom';
import PatientDashboard from './PatientDashboard';
import StaffDashboard from './StaffDashboard';
import DoctorDashboard from './DoctorDashboard';

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!user) return <Navigate to="/login" />;

  // Each role gets its own dashboard
  if (user.role === 'patient') return <PatientDashboard user={user} />;
  if (user.role === 'doctor') return <DoctorDashboard user={user} />;
  if (user.role === 'staff' || user.role === 'admin') return <StaffDashboard user={user} />;

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="container">
      <div className="card">
        <h2>Welcome, {user.name}</h2>
        <p>No dashboard is available for the role "{user.role}".</p>
        <button className="secondary" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

export default Dashboard;