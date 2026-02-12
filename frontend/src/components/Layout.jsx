import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';

function getAppName() {
  return (import.meta.env.VITE_APP_NAME ?? '').trim();
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className={`app-header${menuOpen ? ' menu-open' : ''}`}>
        <div className="app-header-inner">
          <div className="header-row">
            <h1>{getAppName()}</h1>
            <button
              type="button"
              className="nav-toggle"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span className="nav-toggle-wrap">
                <span className="nav-toggle-icon" />
              </span>
            </button>
          </div>
          <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/apply" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            New Application
          </NavLink>
          {hasRole([ROLE_IDS.PSO, ROLE_IDS.Manager]) && (
            <NavLink to="/supervisor" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Approvals
            </NavLink>
          )}
          {hasRole(ROLE_IDS.Director) && (
            <NavLink to="/director" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Director
            </NavLink>
          )}
          {hasRole(ROLE_IDS.Admin) && (
            <NavLink to="/admin" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              Admin
            </NavLink>
          )}
          <span className="app-user">{user?.full_name}</span>
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            Logout
          </button>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
