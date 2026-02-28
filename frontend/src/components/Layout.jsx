/**
 * Author: Igor Michel
 * Purpose: Provide app shell layout, sidebar navigation, and global footer.
 * Last updated: 2026-02-28
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/apply': 'New application',
  '/supervisor': 'Approvals',
  '/director': 'Director',
  '/admin': 'Admin',
};

function getAppName() {
  return (import.meta.env.VITE_APP_NAME ?? '').trim();
}

function getCurrentYear() {
  return new Date().getFullYear();
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const base = getAppName();
    const path = location.pathname;
    let title = ROUTE_TITLES[path];
    if (!title && path.startsWith('/application/')) title = 'Application';
    document.title = title ? `${title}${base ? ` · ${base}` : ''}` : base || 'Leave application';
  }, [location.pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeMenu]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="header-row">
            <NavLink to="/" className="app-header-brand" end>
              <span className="app-header-logo-wrap">
                <img src="/vmgd-logo.png" alt="VMGD logo" className="app-header-logo" />
              </span>
              <h1>{getAppName()}</h1>
            </NavLink>
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
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar" aria-label="Main navigation">
          <NavLink to="/" className="app-sidebar-brand" end>
            <span className="app-header-logo-wrap">
              <img src="/vmgd-logo.png" alt="VMGD logo" className="app-header-logo" />
            </span>
            <span className="app-sidebar-brand-text">{getAppName()}</span>
          </NavLink>

          <nav className="app-nav app-nav-sidebar">
            <div className="app-nav-links">
              <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                Dashboard
              </NavLink>
              <NavLink to="/apply" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                New application
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
            </div>
            <div className="app-nav-user">
              <span className="app-user">{user?.full_name}</span>
              <button type="button" className="nav-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </nav>
        </aside>

        <main className="app-main">
          <Outlet />
          <footer className="app-footer" aria-label="Application footer">
            <span className="app-footer-text">&copy; VMGD {getCurrentYear()} · For internal use · Author: Igor Michel</span>
          </footer>
        </main>
      </div>

      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Close navigation menu"
        onClick={closeMenu}
      />
    </div>
  );
}
