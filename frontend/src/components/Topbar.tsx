'use client';

import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Bell, Search, Command, Sun, Moon, User } from 'lucide-react';
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

export default function Topbar() {
  const router    = useRouter();
  const pathname  = usePathname();
  const { theme, toggle } = useTheme();

  const [email,    setEmail]    = useState('');
  const [initials, setInitials] = useState('U');
  const [search,   setSearch]   = useState('');

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
        <div>
          <div style={{
            fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.015em',
            color: 'var(--text)', lineHeight: 1,
          }}>
            {pageInfo.title}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
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
        <button className="topbar-icon-btn" title="Notifications">
          <Bell size={17} />
          <span className="badge">3</span>
        </button>

        {/* User */}
        <div
          className="topbar-user"
          onClick={handleLogout}
          title="Click to logout"
          style={{ cursor: 'pointer', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--accent)', color: 'white', borderRadius: '50%', width: '28px', height: '28px' }}>
            <User size={16} />
          </div>
          <span className="topbar-email" style={{ fontWeight: 500, fontSize: '0.85rem' }}>{email || 'admin@socialcrm.com'}</span>
        </div>
      </div>
    </header>
  );
}
