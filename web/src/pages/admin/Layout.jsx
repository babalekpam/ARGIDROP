import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const C = { cream: '#F7F3EB', paper: '#FDFBF6', forest: '#1B4332', bronze: '#8B6F47', ink: '#1A1A1A', muted: '#6B6560', subtle: '#9A9489', border: '#E4DCC9', borderSoft: '#EFE8D7' };

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/live-map', label: 'Live map' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/drivers', label: 'Drivers' },
  { to: '/admin/driver-approval', label: 'Driver verification' },
  { to: '/admin/business-approval', label: 'Business KYC' },
  { to: '/admin/jobs', label: 'Jobs' },
  { to: '/admin/disputes', label: 'Disputes' },
  { to: '/admin/scan-analytics', label: 'Scan analytics' },
  { to: '/admin/zones', label: 'Delivery zones' },
  { to: '/admin/analytics', label: 'Platform metrics' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.cream, fontFamily: 'Inter, sans-serif', color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .a-nav { display: block; padding: 9px 12px; border-radius: 4px; color: ${C.muted}; font-size: 13px; font-weight: 400; text-decoration: none; transition: all 0.12s; }
        .a-nav:hover { background: ${C.cream}; color: ${C.ink}; }
        .a-nav.active { background: ${C.forest}; color: ${C.paper}; font-weight: 500; }
      `}</style>

      <div style={{ width: 220, position: 'fixed', top: 0, left: 0, height: '100vh', background: C.paper, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', zIndex: 100 }}>
        <div style={{ padding: '20px 18px', borderBottom: `1px solid ${C.borderSoft}` }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 600, fontSize: 18, color: C.forest, letterSpacing: '-0.01em' }}>ArgiDrop</div>
          <div style={{ fontSize: 10, color: C.bronze, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 500, marginTop: 3 }}>Administration</div>
        </div>
        <nav style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `a-nav${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ borderTop: `1px solid ${C.borderSoft}`, padding: 12 }}>
          <div style={{ padding: '8px 12px', marginBottom: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 11, color: C.subtle }}>Platform Admin</div>
          </div>
          <button onClick={() => { logout(); nav('/'); }} className="a-nav"
            style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
            Sign out
          </button>
        </div>
      </div>
      <div style={{ marginLeft: 220, flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}
