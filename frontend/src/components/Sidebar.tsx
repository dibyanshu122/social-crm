'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Megaphone, BarChart3, Users,
  Settings, Activity, UserCheck, Plug, LogOut,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

const menuGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    path: '/',            icon: LayoutDashboard },
      { label: 'Analytics',    path: '/analytics',   icon: BarChart3 },
    ]
  },
  {
    label: 'Publish',
    items: [
      { label: 'Social Media', path: '/social',      icon: Megaphone },
      { label: 'Ad Campaigns', path: '/ads',         icon: Activity },
    ]
  },
  {
    label: 'Manage',
    items: [
      { label: 'CRM Leads',    path: '/leads',       icon: UserCheck },
      { label: 'Audience',     path: '/audience',    icon: Users },
      { label: 'Integrations', path: '/integrations',icon: Plug },
      { label: 'Settings',     path: '/settings',    icon: Settings },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('U');

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

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Zap size={18} color="white" />
        </div>
        <div>
          <div className="sidebar-brand-text">Dot Domino</div>
          <div className="sidebar-brand-sub">Social CRM</div>
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {menuGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: '8px' }}>
            <div className="sidebar-section-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path ||
                (item.path !== '/' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={isActive ? 'active' : ''}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <hr className="sidebar-divider" />

      {/* User Footer */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name truncate">{email || 'Admin'}</div>
          <div className="sidebar-user-role">Administrator</div>
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
