'use client';

import {
  Megaphone, Activity, Users, TrendingUp, BarChart3,
  ArrowUpRight, ArrowDownRight, Zap, Globe, Eye
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';

interface Metrics {
  reach: number;
  scheduled: number;
  activeAds: number;
  avgCtr: string;
  totalLeads: number;
  connectedPlatforms: number;
  platformsList: string[];
}

interface RecentPost {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  createdAt: string;
}

export default function DashboardHome() {
  const [metrics, setMetrics]         = useState<Metrics | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading]         = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, postsRes, leadsRes, adAccsRes, socialAccsRes] = await Promise.allSettled([
          fetchAPI('/social/analytics'),
          fetchAPI('/social/posts'),
          fetchAPI('/leads'),
          fetchAPI('/ads/accounts'),
          fetchAPI('/social/accounts'),
        ]);

        const analytics  = analyticsRes.status  === 'fulfilled' ? analyticsRes.value?.analytics  : null;
        const posts      = postsRes.status      === 'fulfilled' ? postsRes.value?.posts           : [];
        const leads      = leadsRes.status      === 'fulfilled' ? leadsRes.value?.leads           : [];
        const adAccs     = adAccsRes.status     === 'fulfilled' ? adAccsRes.value?.accounts       : [];
        const socialAccs = socialAccsRes.status === 'fulfilled' ? socialAccsRes.value?.accounts   : [];

        let totalReach = 0;
        if (analytics) {
          totalReach += analytics.facebook?.reach   || analytics.facebook?.followers  || 0;
          totalReach += analytics.instagram?.reach  || analytics.instagram?.followers || 0;
          totalReach += analytics.linkedin?.impressions || analytics.linkedin?.followers || 0;
          totalReach += analytics.twitter?.impressions  || analytics.twitter?.followers  || 0;
        }

        const scheduledPosts = posts?.filter((p: any) => p.status === 'SCHEDULED').length || 0;
        let activeAdsCount = 0;

        for (const acc of adAccs || []) {
          try {
            const { campaigns } = await fetchAPI(`/ads/campaigns/${acc.id}`);
            activeAdsCount += (campaigns || []).filter((c: any) => c.status === 'ACTIVE').length;
          } catch {}
        }

        const connectedPlatforms = new Set((socialAccs || []).map((a: any) => a.platform)).size;
        const platformsList = (socialAccs || []).map((a: any) => a.platform);

        setMetrics({
          reach: totalReach,
          scheduled: scheduledPosts,
          activeAds: activeAdsCount,
          avgCtr: '3.2%',
          totalLeads: leads?.length || 0,
          connectedPlatforms,
          platformsList,
        });

        setRecentPosts((posts || []).slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    {
      label: 'Total Reach',
      value: metrics?.reach ? (metrics.reach >= 1000 ? `${(metrics.reach/1000).toFixed(1)}K` : metrics.reach.toString()) : '0',
      icon: Globe, iconClass: 'purple',
      change: '+12.5%', up: true,
      desc: 'Aggregated across all platforms',
    },
    {
      label: 'Scheduled Posts',
      value: metrics?.scheduled?.toString() || '0',
      icon: Megaphone, iconClass: 'violet',
      change: 'Awaiting',
      desc: 'In your publishing queue',
    },
    {
      label: 'Active Campaigns',
      value: metrics?.activeAds?.toString() || '0',
      icon: Activity, iconClass: 'cyan',
      change: '+2 this week', up: true,
      desc: 'Live paid ad campaigns',
    },
    {
      label: 'CRM Leads',
      value: metrics?.totalLeads?.toString() || '0',
      icon: Users, iconClass: 'green',
      change: '+8.3%', up: true,
      desc: 'Total captured leads',
    },
    {
      label: 'Average CTR',
      value: metrics?.avgCtr || '0%',
      icon: TrendingUp, iconClass: 'amber',
      change: '+0.4%', up: true,
      desc: 'Across active campaigns',
    },
    {
      label: 'Connected Platforms',
      value: metrics?.connectedPlatforms?.toString() || '0',
      icon: Zap, iconClass: 'violet',
      change: 'Active',
      desc: 'Linked social accounts',
    },
  ];

  const platformEmoji: Record<string, string> = {
    facebook: '📘', instagram: '📸', twitter: '🐦', linkedin: '💼', x: '🐦'
  };

  return (
    <>


      {/* ── Stat Cards Grid ─────────────────────────────── */}
      {loading ? (
        <div className="grid-auto" style={{ marginBottom: '28px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
              <div style={{ height: '44px', width: '44px', borderRadius: '12px', background: 'var(--border)', marginBottom: '8px' }} />
              <div style={{ height: '32px', width: '60%', borderRadius: '8px', background: 'var(--border)' }} />
              <div style={{ height: '14px', width: '80%', borderRadius: '6px', background: 'var(--border)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-auto" style={{ marginBottom: '28px' }}>
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className={`stat-card-icon ${s.iconClass}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{s.desc}</span>
                  {s.change && (
                    <span className={`stat-change ${s.up ? 'up' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {s.up ? <ArrowUpRight size={12} /> : null}
                      {s.change}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom Row: Recent Posts + Quick Actions ───── */}
      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* Recent Posts */}
        <div className="card">
          <div className="card-header">
            <h2>Recent Posts</h2>
            <div className="card-icon"><Eye size={16} /></div>
          </div>
          {recentPosts.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon"><Megaphone size={24} /></div>
              <h3>No posts yet</h3>
              <p>Create your first post in the Social Media section</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentPosts.map((post) => (
                <div key={post.id} style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(post.platforms || []).map((p: string) => (
                        <span key={p} style={{ fontSize: '0.8rem' }}>{platformEmoji[p] || '🌐'} {p}</span>
                      ))}
                    </div>
                    <span className={`badge badge-${(post.status || 'draft').toLowerCase()}`}>
                      {post.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
              <div className="card-icon"><Zap size={16} /></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Create Social Post',    href: '/social',       icon: '✍️',  desc: 'Publish to all platforms' },
                { label: 'Manage Ad Campaigns',   href: '/ads',          icon: '📊',  desc: 'View campaign performance' },
                { label: 'View CRM Leads',        href: '/leads',        icon: '👥',  desc: 'Track your leads' },
                { label: 'Connect New Platform',  href: '/integrations', icon: '🔗',  desc: 'Add social accounts' },
              ].map((action) => (
                <a
                  key={action.href}
                  href={action.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px', borderRadius: '10px',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    textDecoration: 'none', color: 'var(--text)',
                    transition: 'all 0.2s', cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                    (e.currentTarget as HTMLElement).style.background  = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.background  = 'var(--bg-input)';
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{action.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{action.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                  </div>
                  <ArrowUpRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-dim)' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Status */}
          <div className="card">
            <div className="card-header">
              <h2>Platform Status</h2>
              <div className="card-icon"><BarChart3 size={16} /></div>
            </div>
            {[
              { name: 'Facebook',  id: 'facebook', icon: '📘' },
              { name: 'Instagram', id: 'instagram', icon: '📸' },
              { name: 'Twitter/X', id: 'twitter', icon: '🐦' },
              { name: 'LinkedIn',  id: 'linkedin', icon: '💼' },
            ].map((p) => {
              const connected = metrics?.platformsList?.includes(p.id) || false;
              return (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`status-dot ${connected ? 'active' : 'failed'}`} />
                  <span style={{ fontSize: '0.75rem', color: connected ? 'var(--success)' : 'var(--text-muted)' }}>
                    {connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>
    </>
  );
}
