import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, PlusCircle, LayoutDashboard, LogOut, User } from 'lucide-react';
import { authService } from '../services/auth';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '10px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
          }}>
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            FEEDBACK<span style={{ color: '#10b981' }}>PRO</span>
          </span>
        </Link>

        {isAuthenticated && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/dashboard" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated ? (
          <>
            <Link to="/wizard" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <PlusCircle size={16} />
              New Project
            </Link>
            <button
              onClick={handleLogout}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              title="Log Out"
            >
              <LogOut size={16} />
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Sign In
            </Link>
            <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
