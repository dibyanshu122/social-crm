'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Megaphone, BarChart3, Users, Settings, Activity, User, LogOut, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { label: 'Social Media', path: '/social', icon: <Megaphone size={20} /> },
    { label: 'Ad Campaigns', path: '/ads', icon: <Activity size={20} /> },
    { label: 'CRM Leads', path: '/leads', icon: <UserCheck size={20} /> },
    { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={20} /> },
    { label: 'Accounts', path: '/audience', icon: <Users size={20} /> },
    { label: 'Integrations', path: '/integrations', icon: <Settings size={20} /> },
    { label: 'Settings', path: '/settings', icon: <User size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Activity size={24} />
        <span>Dot domino</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={isActive ? 'active' : ''}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={handleLogout} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent', border: 'none', color: 'var(--sidebar-text-muted)', cursor: 'pointer', padding: '12px 16px', width: '100%', textAlign: 'left', fontSize: '1rem', fontWeight: 500 }}
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  );
}
