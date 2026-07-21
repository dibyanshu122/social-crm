'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link as LinkIcon, CheckCircle, XCircle, AlertCircle, Loader2, Facebook, Twitter, Linkedin, Instagram, LogOut } from 'lucide-react';
import { fetchAPI } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ConnectedAccount {
  id: string;
  platform: string;
  accountName: string;
  platformAccountId: string;
}

interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

// ─── Platform Config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'facebook',
    label: 'Facebook Pages',
    description: 'Connect your Facebook Pages to post content and view insights.',
    icon: Facebook,
    color: '#1877F2',
    oauthPath: 'facebook',
  },
  {
    id: 'instagram',
    label: 'Instagram Business',
    description: 'Instagram Business accounts are connected automatically via Facebook.',
    icon: Instagram,
    color: '#E1306C',
    oauthPath: null, // Connected via Facebook
    via: 'facebook',
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    description: 'Connect your X account to post tweets and manage your presence.',
    icon: Twitter,
    color: '#000000',
    oauthPath: 'twitter',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Connect your LinkedIn profile to publish professional posts.',
    icon: Linkedin,
    color: '#0A66C2',
    oauthPath: 'linkedin',
  },
];

const AD_PLATFORMS = [
  { id: 'facebook', label: 'Meta Ads (Facebook / Instagram)', color: '#1877F2', icon: Facebook },
  { id: 'google',   label: 'Google Ads', color: '#4285F4', icon: null },
  { id: 'linkedin', label: 'LinkedIn Ads', color: '#0A66C2', icon: Linkedin },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [socialAccounts, setSocialAccounts] = useState<ConnectedAccount[]>([]);
  const [adAccounts, setAdAccounts] = useState<ConnectedAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadAccounts = useCallback(async () => {
    try {
      const [socialRes, adRes] = await Promise.all([
        fetchAPI('/social/accounts'),
        fetchAPI('/ads/accounts'),
      ]);
      setSocialAccounts(socialRes.accounts || []);
      setAdAccounts(adRes.accounts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch the current user ID from Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || '57bc2705-e440-4a59-93aa-29fb952eb96f');
    });

    loadAccounts();

    // Handle OAuth callback result in URL params
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error   = params.get('error');
    const account = params.get('account');

    if (success) {
      const accountStr = account ? ` as ${decodeURIComponent(account)}` : '';
      showToast('success', `Account connected successfully${accountStr}! ✓`);
      window.history.replaceState({}, '', '/settings');
      loadAccounts(); // Refresh list after connect
    }
    if (error) {
      const msg = decodeURIComponent(error).replace(/_/g, ' ');
      showToast('error', `Connection failed: ${msg}`);
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const handleConnect = (oauthPath: string) => {
    if (!currentUserId) {
      showToast('error', 'User not authenticated. Please log in again.');
      return;
    }
    window.location.href = `http://localhost:5000/api/v1/oauth/${oauthPath}?userId=${currentUserId}`;
  };

  const handleDisconnect = async (platform: string) => {
    setDisconnecting(platform);
    try {
      await fetchAPI(`/oauth/disconnect/${platform}`, { method: 'DELETE' });
      showToast('success', `${platform} account disconnected.`);
      await loadAccounts();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to disconnect account');
    } finally {
      setDisconnecting(null);
    }
  };

  const getConnectedAccount = (platform: string) =>
    socialAccounts.find(a => a.platform === platform);

  const getConnectedAdAccount = (platform: string) =>
    adAccounts.find(a => a.platform === platform);

  const handleConnectAd = (platformId: string) => {
    if (platformId === 'google') {
      if (!currentUserId) {
        showToast('error', 'User not authenticated. Please log in again.');
        return;
      }
      window.location.href = `http://localhost:5000/api/v1/oauth/google?userId=${currentUserId}`;
    } else if (platformId === 'facebook') {
      showToast('info', 'Meta Ads are connected automatically when you connect Facebook Pages above.');
    } else if (platformId === 'linkedin') {
      showToast('info', 'LinkedIn Ads are connected automatically when you connect LinkedIn above.');
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#2563eb',
          color: 'white', padding: '14px 20px', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', fontSize: '0.95rem',
          animation: 'slideIn 0.3s ease',
          maxWidth: '400px',
        }}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error'   && <XCircle size={20} />}
          {toast.type === 'info'    && <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="page-header">
        <h1>Integrations</h1>
        <p>Connect your social media and advertising accounts to manage everything from one place.</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        </div>
      ) : (
        <>
          {/* ── Connected Accounts Section ── */}
          {socialAccounts.length > 0 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-header">
                <h2>Your Connected Accounts</h2>
                <div className="card-icon" style={{ background: '#16a34a18', color: '#16a34a' }}><CheckCircle size={20} /></div>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Accounts that are currently active and ready for publishing.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {socialAccounts.map(account => {
                  const platformConfig = PLATFORMS.find(p => p.id === account.platform);
                  const PlatformIcon = platformConfig?.icon || LinkIcon;
                  const color = platformConfig?.color || 'var(--accent)';

                  return (
                    <div key={account.id} style={{
                      padding: '16px', borderRadius: '12px', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg-secondary)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <PlatformIcon size={20} style={{ color }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {account.accountName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {account.platform}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDisconnect(account.platform)}
                        disabled={disconnecting === account.platform}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 12px', borderRadius: '8px', border: '1px solid #dc262630',
                          background: '#dc262610', color: '#dc2626', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: '500',
                          opacity: disconnecting === account.platform ? 0.7 : 1,
                        }}
                      >
                        {disconnecting === account.platform
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : <LogOut size={14} />
                        }
                        Disconnect
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Add New Connection Section ── */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2>Add New Connection</h2>
              <div className="card-icon"><LinkIcon size={20} /></div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {PLATFORMS.map((platform, idx) => {
                const PlatformIcon = platform.icon;
                const isLast = idx === PLATFORMS.length - 1;

                return (
                  <div key={platform.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: `${platform.color}18`, border: `1px solid ${platform.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <PlatformIcon size={22} style={{ color: platform.color }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {platform.label}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {platform.description}
                        </div>
                      </div>
                    </div>

                    <div>
                      {platform.via ? (
                        <span style={{
                          fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)',
                          padding: '6px 14px', borderRadius: '8px',
                        }}>
                          Connect via {platform.via}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform.oauthPath!)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 20px', borderRadius: '8px', border: `1px solid ${platform.color}`,
                            background: `${platform.color}12`, color: platform.color, cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: '600',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = `${platform.color}22`)}
                          onMouseOut={e  => (e.currentTarget.style.background = `${platform.color}12`)}
                        >
                          <PlatformIcon size={14} />
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Ad Accounts ── */}
      <div className="card">
        <div className="card-header">
          <h2>Ad Account Integrations</h2>
          <div className="card-icon"><LinkIcon size={20} /></div>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          Connect ad accounts to create and manage campaigns directly from the CRM. Note: Meta Ads and LinkedIn Ads connect automatically when you connect their respective Pages/Profiles above.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {AD_PLATFORMS.map((platform, idx) => {
            const connected = getConnectedAdAccount(platform.id);
            const AdIcon = platform.icon;
            const isLast = idx === AD_PLATFORMS.length - 1;

            return (
              <div key={platform.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 0',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: `${platform.color}18`, border: `1px solid ${platform.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {AdIcon ? <AdIcon size={22} style={{ color: platform.color }} /> : (
                      <span style={{ color: platform.color, fontWeight: '700', fontSize: '0.7rem' }}>G ADS</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {platform.label}
                    </div>
                    {connected ? (
                      <div style={{ fontSize: '0.82rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <CheckCircle size={13} />
                        Connected: {connected.accountName}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Not connected
                      </div>
                    )}
                  </div>
                </div>

                {connected ? (
                  <span style={{
                    fontSize: '0.8rem', color: '#16a34a', background: '#16a34a18',
                    padding: '6px 14px', borderRadius: '8px', border: '1px solid #16a34a30',
                  }}>
                    ✓ Connected
                  </span>
                ) : (
                  <button
                    style={{
                      padding: '8px 20px', borderRadius: '8px', border: `1px solid ${platform.color}`,
                      background: `${platform.color}12`, color: platform.color, cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: '600',
                    }}
                    onClick={() => handleConnectAd(platform.id)}
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
