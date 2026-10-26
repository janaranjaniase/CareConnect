import { useNavigate } from 'react-router-dom';

// Shared page frame: sidebar + header. Every role's dashboard sits inside it.
function Layout({ user, items, active, onSelect, subtitle, children }) {
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const current = items.find((i) => i.key === active);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">C</div>
          <div>
            <div className="brand-name">CareConnect</div>
            <div className="brand-sub">SMART HOSPITAL CARE</div>
          </div>
        </div>

        <nav>
          {items.map((i) => (
            <button
              key={i.key}
              className={'nav-item' + (active === i.key ? ' active' : '')}
              onClick={() => onSelect(i.key)}
            >
              <span className="nav-dot" />
              {i.label}
            </button>
          ))}
        </nav>

        <div className="status-card">
          <div className="status-title"><span className="live-dot" /> SYSTEM STATUS</div>
          <div>All systems online. Queue data refreshes every 10 seconds.</div>
        </div>
      </aside>

      <main className="main">
        <div className="page-header">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> {user.role} · {current?.label}
            </div>
            <h1>{greeting}, {user.name}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="header-right">
            <button className="secondary" onClick={logout}>Logout</button>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

export default Layout;