'use client';

import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Bell, Search, Command, Sun, Moon, User, LogOut, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/':             { title: 'Dashboard',    subtitle: 'Overview of your social presence' },
  '/social':       { title: 'Social Media', subtitle: 'Create and publish posts' },
  '/ads':          { title: 'Ad Campaigns', subtitle: 'Manage your paid campaigns' },
  '/leads':        { title: 'CRM Leads',    subtitle: 'Track and manage your leads' },
  '/analytics':    { title: 'Analytics',    subtitle: 'Performance insights' },
  '/audience':     { title: 'Audience',     subtitle: 'Connected accounts & reach' },
  '/integrations': { title: 'Integrations', subtitle: 'Connect platforms & tools' },
  '/settings':     { title: 'Settings',     subtitle: 'Account and team settings' },
};

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const { theme, toggle } = useTheme();

  const [email,    setEmail]    = useState('');
  const [initials, setInitials] = useState('U');
  const [search,   setSearch]   = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email);
        setInitials(user.email.charAt(0).toUpperCase());
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const pageInfo = Object.entries(pageTitles).find(([path]) =>
    path === pathname || (path !== '/' && pathname.startsWith(path))
  )?.[1] ?? { title: 'Dashboard', subtitle: '' };

  return (
    <header className="topbar">
      {/* Left: Page Title */}
      <div className="topbar-left">
        <button 
          className="topbar-icon-btn mobile-menu-btn" 
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="topbar-title">
            {pageInfo.title}
          </div>
          <div className="topbar-subtitle">
            {pageInfo.subtitle}
          </div>
        </div>
      </div>

      {/* Right: Search + Actions */}
      <div className="topbar-right">
        {/* Search */}
        <div className="search-bar">
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '2px',
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            borderRadius: '5px', padding: '2px 6px',
            color: 'var(--text-muted)', fontSize: '0.68rem',
          }}>
            <Command size={10} />&nbsp;K
          </div>
        </div>

        {/* ── Theme Toggle ── */}
        <button
          className="topbar-icon-btn theme-toggle-btn"
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun  size={17} style={{ color: '#f59e0b' }} />
            : <Moon size={17} style={{ color: '#6366f1' }} />
          }
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button 
            className="topbar-icon-btn" 
            title="Notifications" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={17} />
          </button>
          
          {showNotifications && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '10px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '16px', minWidth: '240px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 50
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Notifications</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>No new notifications.</p>
            </div>
          )}
        </div>

        {/* User */}
        <div style={{ position: 'relative' }}>
          <div
            className="topbar-user"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Profile Menu"
            style={{ cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)', color: 'white', borderRadius: '50%', width: '32px', height: '32px' }}>
              <User size={18} />
            </div>
          </div>

          {showProfileMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '10px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '12px', minWidth: '200px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 50,
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Signed in as</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{email || 'User'}</p>
              </div>
              <button 
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                  borderRadius: '8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                  width: '100%'
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
