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
  const [hoveredTooltip, setHoveredTooltip] = useState<{ text: string, top: number } | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'transparent',
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center',
            padding: '4px', gap: '2px'
          }}>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6' }}></div>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6' }}></div>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e' }}></div>
            <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e' }}></div>
          </div>
        </div>
        <div className="sidebar-brand-text-container">
          <div className="sidebar-brand-text">
            <span style={{ color: '#3b82f6' }}>DOT</span> <span style={{ color: '#22c55e' }}>DOMINO</span>
          </div>
          <div className="sidebar-brand-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOCIAL CRM PLATFORM</div>
        </div>
      </div>

      {/* Nav Groups */}
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {menuGroups.map((group) => (
          <div key={group.label} className="sidebar-group" style={{ marginBottom: '4px' }}>
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
                  onMouseEnter={(e) => {
                    if (collapsed) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredTooltip({ text: item.label, top: rect.top + rect.height / 2 });
                    }
                  }}
                  onMouseLeave={() => setHoveredTooltip(null)}
                >
                  <Icon size={17} style={{ minWidth: '17px' }} />
                  <span className="sidebar-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-toggle-container" style={{ 
        marginTop: 'auto',
        background: '#1b1844',
        padding: '16px 0',
        width: '100%',
        zIndex: 10
      }}>
        <hr className="sidebar-divider" style={{ margin: '0 0 16px 0' }} />
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '11px',
            width: '100%', padding: collapsed ? '11px' : '11px 12px', borderRadius: '10px',
            background: 'transparent', border: 'none', position: 'relative',
            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
            fontSize: '0.88rem', fontWeight: 500, textAlign: 'left',
            justifyContent: collapsed ? 'center' : 'flex-start'
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; 
            e.currentTarget.style.color = 'var(--text)';
            if (collapsed) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTooltip({ text: "Expand", top: rect.top + rect.height / 2 });
            }
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.background = 'transparent'; 
            e.currentTarget.style.color = 'var(--text-muted)';
            setHoveredTooltip(null);
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: '17px', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
            <path d="m15 18-6-6 6-6"/>
          </svg>
          <span className="sidebar-nav-label">Collapse</span>
        </button>
      </div>

      {hoveredTooltip && collapsed && (
        <div style={{
          position: 'fixed',
          left: '88px', /* pushed slightly right so it breathes */
          top: `${hoveredTooltip.top}px`,
          transform: 'translateY(-50%)',
          background: '#2d2859', /* dark purple matching sidebar */
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '6px',
          zIndex: 9999,
          fontSize: '0.8rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none'
        }}>
          {hoveredTooltip.text}
        </div>
      )}
    </aside>
  );
}
