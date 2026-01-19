import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            💰 Money Tracker
          </Link>
          <div className="nav-links">
            <Link
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              Dashboard
            </Link>
            <Link
              to="/movements"
              className={location.pathname === '/movements' ? 'active' : ''}
            >
              Movimientos
            </Link>
            <Link
              to="/reports"
              className={location.pathname === '/reports' ? 'active' : ''}
            >
              Informes
            </Link>
          </div>
          <div className="user-menu">
            <span className="user-name">Hola, {user?.name}</span>
            <button onClick={logout} className="logout-btn">
              Salir
            </button>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
