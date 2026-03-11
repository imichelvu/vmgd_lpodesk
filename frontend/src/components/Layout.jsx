/**
 * Author: Igor Michel
 * Purpose: Provide app shell layout, sidebar navigation, and global footer for LPODesk.
 * Last updated: 2026-03-11
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import TopBanner from './TopBanner';

const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/profile': 'My Profile',
  '/requests/new': 'New Request',
  '/requests': 'My Requests',
  '/approvals': 'Pending Approvals',
  '/faq': 'FAQ',
  '/settings': 'Settings',
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
    if (!title && path.startsWith('/requests/')) title = 'Request Details';
    document.title = title ? `${title}${base ? ` · ${base}` : ''}` : base || 'LPODesk';
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

  const isApprover = hasRole([ROLE_IDS.Manager, ROLE_IDS.ICTManager, ROLE_IDS.Procurement, ROLE_IDS.Director]);

  return (
    <div className={`app-shell${menuOpen ? ' menu-open' : ''}`}>
      <TopBanner title={getAppName()} />
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
                <span className="nav-icon">🏠</span> Dashboard
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="nav-icon">👤</span> My Profile
              </NavLink>
              <NavLink to="/requests/new" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="nav-icon">📝</span> New Request
              </NavLink>
              <NavLink to="/requests" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="nav-icon">📋</span> My Requests
              </NavLink>
              <NavLink to="/faq" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                <span className="nav-icon">❓</span> FAQ
              </NavLink>
              {isApprover && (
                <NavLink to="/approvals" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  <span className="nav-icon">✔️</span> Approvals
                </NavLink>
              )}
              {hasRole(ROLE_IDS.Admin) && (
                <NavLink to="/settings" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
                  <span className="nav-icon">⚙️</span> Settings
                </NavLink>
              )}
            </div>
            <div className="app-nav-user">
              <NavLink to="/profile" className="app-user" title="My Profile">
                {user?.full_name}
              </NavLink>
              <button type="button" className="nav-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </nav>
        </aside>

        <main className="app-main">
          <Outlet />
          <footer className="app-footer" aria-label="Application footer">
            <div className="app-footer-banner">
              <div className="app-footer-accent app-footer-accent-top" aria-hidden="true" />
              <div className="app-footer-main-bar">
                <span className="app-footer-main-title">&copy; VMGD {getCurrentYear()}</span>
              </div>
              <div className="app-footer-sub-bar">
                <span className="app-footer-sub-title">For internal use</span>
              </div>
              <div className="app-footer-accent app-footer-accent-bottom" aria-hidden="true" />
            </div>
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
