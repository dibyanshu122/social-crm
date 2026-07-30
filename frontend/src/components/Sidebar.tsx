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

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
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

      {/* User Footer with Toggle */}
      <div className="sidebar-user" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <button
          className="btn-ghost"
          onClick={onToggle}
          title="Toggle Sidebar"
          style={{ padding: '8px', border: 'none', background: 'transparent', width: '100%' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>
    </aside>
  );
}
