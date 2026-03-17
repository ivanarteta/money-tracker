import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const initials = useMemo(() => {
    const name = (user?.name || '').trim();
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'U';
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return (first + second).toUpperCase();
  }, [user?.name]);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!userMenuOpen) return;
      const el = menuRef.current;
      if (el && !el.contains(e.target)) setUserMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (!userMenuOpen) return;
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!navOpen) return;
      if (e.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  useEffect(() => {
    // Cierra el menú móvil al cambiar de ruta
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            Money Tracker
          </Link>
          <div className="nav-links" aria-label="Navegación">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
              Resumen
            </Link>
            <Link to="/movements" className={location.pathname === '/movements' ? 'active' : ''}>
              Movimientos
            </Link>
            <Link to="/reports" className={location.pathname === '/reports' ? 'active' : ''}>
              Informes
            </Link>
            <Link to="/storage" className={location.pathname === '/storage' ? 'active' : ''}>
              Archivos
            </Link>
          </div>
          <div className="nav-actions">
            <div className="nav-links-wrap">
              <button
                type="button"
                className="nav-toggle-btn"
                aria-label="Abrir menú"
                aria-haspopup="dialog"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((v) => !v)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M4 6h16M4 12h16M4 18h16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="sr-only">Menú</span>
              </button>
            </div>

            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-icon-btn"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((v) => !v)}
                title="Usuario"
              >
                <span className="user-avatar" aria-hidden="true">{initials}</span>
                <svg className="user-caret" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Abrir menú de usuario</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown" role="menu" aria-label="Menú de usuario">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-name">{user?.name || 'Usuario'}</div>
                    <div className="user-dropdown-email">{user?.email || ''}</div>
                  </div>
                  <Link
                    to="/settings"
                    role="menuitem"
                    className={location.pathname === '/settings' ? 'active' : ''}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Ajustes
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="user-logout"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {navOpen && (
        <div
          className="nav-drawer-overlay"
          role="presentation"
          aria-hidden="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNavOpen(false);
          }}
        >
          <div className="nav-drawer" role="dialog" aria-label="Navegación" aria-modal="true">
            <div className="nav-drawer-header">
              <div className="nav-drawer-title">Menú</div>
              <button type="button" className="nav-drawer-close" onClick={() => setNavOpen(false)} aria-label="Cerrar menú">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="nav-drawer-links" role="menu" aria-label="Enlaces">
              <Link to="/" role="menuitem" className={location.pathname === '/' ? 'active' : ''}>
                Resumen
              </Link>
              <Link to="/movements" role="menuitem" className={location.pathname === '/movements' ? 'active' : ''}>
                Movimientos
              </Link>
              <Link to="/reports" role="menuitem" className={location.pathname === '/reports' ? 'active' : ''}>
                Informes
              </Link>
              <Link to="/storage" role="menuitem" className={location.pathname === '/storage' ? 'active' : ''}>
                Archivos
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
