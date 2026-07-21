'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Topbar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email ?? null);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="topbar">
      <div className="search-bar">
        <Search size={18} color="var(--text-muted)" />
        <input type="text" placeholder="Search campaigns, posts, or insights..." />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn">
          <Bell size={20} />
          <span className="badge"></span>
        </button>
        
        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <span className="user-email">{userEmail || 'Loading...'}</span>
        </div>
      </div>
    </header>
  );
}
