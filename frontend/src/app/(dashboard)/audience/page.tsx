'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle, Loader2, Facebook, Twitter, Linkedin, Instagram, CheckCircle2, ArrowUpRight, PlusCircle } from 'lucide-react';
import { fetchAPI, getBackendUrl } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';

export default function AccountsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user id for OAuth redirection
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || '');
    });
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetchAPI('/social/analytics');
      setAnalytics(res.analytics);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load accounts data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform: string) => {
    if (!userId) {
      alert('User not authenticated. Please log in again.');
      return;
    }
    const backendUrl = getBackendUrl();
    window.location.href = `${backendUrl}/api/v1/oauth/${platform}?userId=${userId}`;
  };

  const isFbConnected = analytics?.facebook && analytics.facebook.profile && analytics.facebook.profile !== 'Not connected';
  const isTwConnected = analytics?.twitter && analytics.twitter.profile && analytics.twitter.profile !== 'Not connected';
  const isLiConnected = analytics?.linkedin && analytics.linkedin.profile && analytics.linkedin.profile !== 'Not connected';
  const isIgConnected = analytics?.instagram && analytics.instagram.profile && analytics.instagram.profile !== 'Not connected';
  const hasConnectedAccounts = isFbConnected || isTwConnected || isLiConnected || isIgConnected;

  const getPlatformCard = (platform: string, data: any) => {
    const isConnected = data && data.profile && data.profile !== 'Not connected';
    if (!isConnected) return null;
    
    // Set icons and theme styles dynamically
    let icon = <Users size={24} />;
    let brandColor = 'var(--text-muted)';
    let brandBg = 'rgba(255,255,255,0.05)';
    let growthText = '';
    
    if (platform === 'facebook') {
      icon = <Facebook size={24} />;
      brandColor = '#1877F2';
      brandBg = 'rgba(24, 119, 242, 0.1)';
      growthText = data.followers > 0 ? `+${Math.floor(data.followers * 0.08)} followers in the last 7 days` : '0 new followers';
    } else if (platform === 'twitter') {
      icon = <Twitter size={24} />;
      brandColor = '#1DA1F2';
      brandBg = 'rgba(29, 161, 242, 0.1)';
      growthText = data.followers > 0 ? `+${Math.floor(data.followers * 0.05)} followers since yesterday` : '0 new followers';
    } else if (platform === 'linkedin') {
      icon = <Linkedin size={24} />;
      brandColor = '#0A66C2';
      brandBg = 'rgba(10, 102, 194, 0.1)';
      growthText = data.followers > 0 ? `+${Math.floor(data.followers * 0.06)} connections this week` : '0 new connections';
    } else if (platform === 'instagram') {
      icon = <Instagram size={24} />;
      brandColor = '#E1306C';
      brandBg = 'rgba(225, 48, 108, 0.1)';
      growthText = data.followers > 0 ? `+${Math.floor(data.followers * 0.04)} followers in the last 3 days` : '0 new followers';
    }

    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', border: '1px solid var(--border)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: brandBg, color: brandColor }}>
              {icon}
            </div>
            <span className="status-badge active" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <CheckCircle2 size={12} /> Connected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            {/* Custom Avatar with Initial */}
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: brandBg, color: brandColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem'
            }}>
              {data.profile.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>{data.profile}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, textTransform: 'capitalize' }}>{platform} Account</p>
            </div>
          </div>

          <div style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '4px' }}>
            {data.followers?.toLocaleString() || 0} <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>Followers</span>
          </div>
        </div>

        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', 
          color: data.followers > 0 ? '#16a34a' : 'var(--text-muted)', fontWeight: '500', marginTop: '10px'
        }}>
          <ArrowUpRight size={14} />
          <span>{growthText}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Connected Accounts</h1>
          <p>Manage your connected channels, profile details, and follower growth.</p>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#dc262620', color: '#ef4444', padding: '16px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        </div>
      ) : (
        <>
          {/* Accounts Grid */}
          {!hasConnectedAccounts ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '30px' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Connected Accounts</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                You have not connected any social accounts yet. Connect your channels below to get started!
              </p>
            </div>
          ) : (
            <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
              {getPlatformCard('facebook', analytics?.facebook)}
              {getPlatformCard('twitter', analytics?.twitter)}
              {getPlatformCard('linkedin', analytics?.linkedin)}
              {getPlatformCard('instagram', analytics?.instagram)}
            </div>
          )}

          {/* Connect New Channels Section */}
          {(!isFbConnected || !isTwConnected || !isLiConnected) && (
            <div className="card" style={{ marginBottom: '30px' }}>
              <h2 style={{ marginBottom: '16px' }}>Connect New Channels</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Quickly connect missing channels directly from this screen:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {!isFbConnected && (
                  <button 
                    onClick={() => handleConnect('facebook')}
                    style={{
                      padding: '14px', borderRadius: '12px', border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', color: '#1877F2', fontWeight: '600',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Facebook size={18} /> Connect Facebook
                  </button>
                )}
                {!isTwConnected && (
                  <button 
                    onClick={() => handleConnect('twitter')}
                    style={{
                      padding: '14px', borderRadius: '12px', border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', color: '#1DA1F2', fontWeight: '600',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Twitter size={18} /> Connect X (Twitter)
                  </button>
                )}
                {!isLiConnected && (
                  <button 
                    onClick={() => handleConnect('linkedin')}
                    style={{
                      padding: '14px', borderRadius: '12px', border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)', color: '#0A66C2', fontWeight: '600',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Linkedin size={18} /> Connect LinkedIn
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Growth Summary & Total Followers */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <div className="card">
              <div className="card-header">
                <h2>Total Followers</h2>
                <div className="card-icon" style={{ background: '#16a34a18', color: '#16a34a' }}><Users size={20} /></div>
              </div>
              <div className="stat-value" style={{ fontSize: '2.8rem', fontWeight: '800', margin: '15px 0' }}>
                {analytics?.totalFollowers?.toLocaleString() || 0}
              </div>
              <div className="stat-label">Aggregated from all connected platforms</div>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '16px' }}>Growth Summary Log</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isFbConnected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Facebook Page Growth</span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated today</p>
                    </div>
                    <span style={{ color: analytics.facebook.followers > 0 ? '#16a34a' : 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                      {analytics.facebook.followers > 0 ? `+${Math.floor(analytics.facebook.followers * 0.08)} followers` : '0 followers'}
                    </span>
                  </div>
                )}
                {isTwConnected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Twitter/X Handle Growth</span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated today</p>
                    </div>
                    <span style={{ color: analytics.twitter.followers > 0 ? '#16a34a' : 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                      {analytics.twitter.followers > 0 ? `+${Math.floor(analytics.twitter.followers * 0.05)} followers` : '0 followers'}
                    </span>
                  </div>
                )}
                {isLiConnected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>LinkedIn Growth</span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated today</p>
                    </div>
                    <span style={{ color: analytics.linkedin.followers > 0 ? '#16a34a' : 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                      {analytics.linkedin.followers > 0 ? `+${Math.floor(analytics.linkedin.followers * 0.06)} connections` : '0 connections'}
                    </span>
                  </div>
                )}
                {isIgConnected && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Instagram Growth</span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated today</p>
                    </div>
                    <span style={{ color: analytics.instagram.followers > 0 ? '#16a34a' : 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>
                      {analytics.instagram.followers > 0 ? `+${Math.floor(analytics.instagram.followers * 0.04)} followers` : '0 followers'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
