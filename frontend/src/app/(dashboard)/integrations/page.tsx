'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link as LinkIcon, CheckCircle, XCircle, AlertCircle, Loader2, Facebook, Twitter, Linkedin, Instagram, LogOut, RefreshCw, Zap } from 'lucide-react';
import { fetchAPI, getBackendUrl } from '@/lib/apiClient';
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
const SOCIAL_PLATFORMS = [
  {
    id: 'facebook',
    label: 'Facebook Pages',
    description: 'Connect your Facebook Pages to post content and view insights.',
    icon: Facebook,
    color: '#1877F2',
    oauthPath: 'facebook',
    adNote: 'Also automatically connects Meta Ads account',
  },
  {
    id: 'instagram',
    label: 'Instagram Business',
    description: 'Connected automatically with Facebook Pages — no extra step needed.',
    icon: Instagram,
    color: '#E1306C',
    oauthPath: null,
    via: 'facebook',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Profile',
    description: 'Connect your LinkedIn to publish posts and manage LinkedIn Ads.',
    icon: Linkedin,
    color: '#0A66C2',
    oauthPath: 'linkedin',
    adNote: 'Also automatically connects LinkedIn Ads account',
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    description: 'Connect your X account to post tweets and manage your presence.',
    icon: Twitter,
    color: '#000000',
    oauthPath: 'twitter',
  },
];

const AD_PLATFORMS = [
  {
    id: 'facebook',
    label: 'Meta Ads (Facebook / Instagram)',
    description: 'Automatically connected when you connect your Facebook Pages above.',
    color: '#1877F2',
    icon: Facebook,
    auto: true,
    via: 'facebook',
  },
  {
    id: 'google',
    label: 'Google Ads',
    description: 'Connect via Google OAuth to manage your Google Ads campaigns.',
    color: '#4285F4',
    icon: null,
    auto: false,
    oauthPath: 'google',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Ads',
    description: 'Automatically connected when you connect your LinkedIn profile above.',
    color: '#0A66C2',
    icon: Linkedin,
    auto: true,
    via: 'linkedin',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [socialAccounts, setSocialAccounts] = useState<ConnectedAccount[]>([]);
  const [adAccounts,     setAdAccounts]     = useState<ConnectedAccount[]>([]);
  const [currentUserId,  setCurrentUserId]  = useState<string>('');
  const [loading,        setLoading]        = useState(true);
  const [disconnecting,  setDisconnecting]  = useState<string | null>(null);
  const [connecting,     setConnecting]     = useState<string | null>(null);
  const [toast,          setToast]          = useState<Toast | null>(null);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || '');
    });
    loadAccounts();

    // Handle OAuth callback result in URL params
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error   = params.get('error');
    const account = params.get('account');

    if (success) {
      const accountStr = account ? ` as "${decodeURIComponent(account)}"` : '';
      showToast('success', `Account connected successfully${accountStr}! ✓`);
      window.history.replaceState({}, '', '/integrations');
      loadAccounts();
    }
    if (error) {
      const msg = decodeURIComponent(error).replace(/_/g, ' ');
      showToast('error', `Connection failed: ${msg}`);
      window.history.replaceState({}, '', '/integrations');
    }
  }, []);

  // ── OAuth Redirect ─────────────────────────────────────────────────────────
  const handleConnect = (oauthPath: string) => {
    if (!currentUserId) { showToast('error', 'User not authenticated. Please log in again.'); return; }
    setConnecting(oauthPath);
    window.location.href = `${getBackendUrl()}/api/v1/oauth/${oauthPath}?userId=${currentUserId}`;
  };

  // ── Disconnect ─────────────────────────────────────────────────────────────
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

  const getSocialAccount  = (platform: string) => socialAccounts.find(a => a.platform === platform);
  const getAdAccount      = (platform: string) => adAccounts.find(a => a.platform === platform);

  const totalConnected = socialAccounts.length + adAccounts.length;

  return (
    <>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#2563eb',
          color: 'white', padding: '14px 22px', borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontSize: '0.93rem',
          animation: 'slideIn 0.3s ease', maxWidth: '420px',
        }}>
          {toast.type === 'success' && <CheckCircle size={18} />}
          {toast.type === 'error'   && <XCircle size={18} />}
          {toast.type === 'info'    && <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Integrations</h1>
          <p>Connect your social media and ad accounts — everything runs automatically from here.</p>
        </div>
        {totalConnected > 0 && (
          <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '10px 18px', fontSize: '0.85rem', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Zap size={15} style={{ color: '#10b981' }} />
            <strong style={{ color: '#10b981' }}>{totalConnected}</strong> active connections
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/*  SECTION 1 — Social Accounts                                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2>Social Media Accounts</h2>
              <div className="card-icon"><Facebook size={18} /></div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Connect platforms to publish posts, stories, and reels directly from the CRM.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {SOCIAL_PLATFORMS.map((platform, idx) => {
                const Icon = platform.icon;
                const connected = getSocialAccount(platform.id);
                const isLast = idx === SOCIAL_PLATFORMS.length - 1;

                return (
                  <div key={platform.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 4px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  }}>
                    {/* Left: Icon + Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: `${platform.color}18`, border: `1px solid ${platform.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={22} style={{ color: platform.color }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.93rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {platform.label}
                          {platform.adNote && (
                            <span style={{ fontSize: '0.68rem', background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: '20px', fontWeight: 500 }}>
                              + Ads
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {connected ? (
                            <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> {connected.accountName}
                            </span>
                          ) : platform.description}
                        </div>
                      </div>
                    </div>

                    {/* Right: Button */}
                    <div style={{ flexShrink: 0 }}>
                      {platform.via ? (
                        // Instagram — auto via Facebook
                        connected ? (
                          <span style={{ fontSize: '0.78rem', color: '#16a34a', background: '#16a34a15', padding: '6px 14px', borderRadius: '8px', border: '1px solid #16a34a30' }}>
                            ✓ Connected
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '8px' }}>
                            Via {platform.via}
                          </span>
                        )
                      ) : connected ? (
                        <button
                          onClick={() => handleDisconnect(platform.id)}
                          disabled={!!disconnecting}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 16px', borderRadius: '8px',
                            border: '1px solid #dc262630', background: '#dc262610',
                            color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                            opacity: disconnecting === platform.id ? 0.6 : 1,
                          }}
                        >
                          {disconnecting === platform.id
                            ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            : <LogOut size={13} />}
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform.oauthPath!)}
                          disabled={connecting === platform.oauthPath}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 20px', borderRadius: '8px',
                            border: `1px solid ${platform.color}`,
                            background: `${platform.color}12`, color: platform.color,
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            transition: 'all 0.2s',
                            opacity: connecting === platform.oauthPath ? 0.7 : 1,
                          }}
                        >
                          {connecting === platform.oauthPath
                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Connecting...</>
                            : <><Icon size={14} /> Connect</>}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/*  SECTION 2 — Ad Accounts                                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="card">
            <div className="card-header">
              <h2>Ad Account Connections</h2>
              <div className="card-icon" style={{ background: '#f59e0b18', color: '#f59e0b' }}>
                <Zap size={18} />
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Ad accounts are linked to your campaigns in the Ads Manager.
              Meta Ads and LinkedIn Ads connect automatically when you connect social accounts above.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {AD_PLATFORMS.map((platform, idx) => {
                const connected = getAdAccount(platform.id);
                const Icon = platform.icon;
                const isLast = idx === AD_PLATFORMS.length - 1;

                return (
                  <div key={platform.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 4px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  }}>
                    {/* Left: Icon + Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: `${platform.color}18`, border: `1px solid ${platform.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {Icon
                          ? <Icon size={22} style={{ color: platform.color }} />
                          : <span style={{ color: platform.color, fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.5px' }}>G ADS</span>
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.93rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {platform.label}
                          {platform.auto && (
                            <span style={{ fontSize: '0.68rem', background: '#6366f115', color: '#6366f1', padding: '2px 8px', borderRadius: '20px', fontWeight: 500 }}>
                              Auto
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                          {connected ? (
                            <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> {connected.accountName}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>{platform.description}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Status / Button */}
                    <div style={{ flexShrink: 0 }}>
                      {connected ? (
                        <span style={{
                          fontSize: '0.8rem', color: '#16a34a', background: '#16a34a15',
                          padding: '7px 16px', borderRadius: '8px', border: '1px solid #16a34a30',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                          <CheckCircle size={13} /> Connected
                        </span>
                      ) : platform.auto ? (
                        // Auto-connect platforms — show which social account to connect first
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: '8px', display: 'block', marginBottom: '4px' }}>
                            Auto via {platform.via}
                          </span>
                          {!getSocialAccount(platform.via!) && (
                            <button
                              onClick={() => handleConnect(platform.via!)}
                              style={{
                                fontSize: '0.75rem', color: platform.color,
                                background: `${platform.color}10`, border: `1px solid ${platform.color}30`,
                                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                              }}
                            >
                              → Connect {platform.via} first
                            </button>
                          )}
                        </div>
                      ) : (
                        // Google Ads — needs its own OAuth
                        <button
                          onClick={() => handleConnect(platform.oauthPath!)}
                          disabled={connecting === platform.oauthPath}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 20px', borderRadius: '8px',
                            border: `1px solid ${platform.color}`,
                            background: `${platform.color}12`, color: platform.color,
                            cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                            transition: 'all 0.2s',
                            opacity: connecting === platform.oauthPath ? 0.7 : 1,
                          }}
                        >
                          {connecting === platform.oauthPath
                            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Connecting...</>
                            : <><RefreshCw size={14} /> Connect via OAuth</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info banner */}
            <div style={{
              marginTop: '20px', padding: '14px 16px', borderRadius: '10px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6,
              display: 'flex', gap: '10px', alignItems: 'flex-start'
            }}>
              <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
              <span>
                <strong style={{ color: 'var(--text-main)' }}>How it works:</strong>{' '}
                When you click "Connect" on Facebook or LinkedIn above, the OAuth flow automatically saves your <strong>social account</strong> (for posting) <strong>and</strong> your <strong>ad account</strong> (for campaigns) at the same time. Google Ads requires a separate OAuth connection using your Google Ads Manager credentials.
              </span>
            </div>
          </div>
        </>
      )}

      <style>{`
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
