'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, ChevronRight, Play, Pause, Plus, Loader2, X,
  Lock, ShieldAlert, Trash2, UploadCloud, TrendingUp, DollarSign,
  BarChart2, Target, Image, Edit2, Layers
} from 'lucide-react';
import { fetchAPI, getBackendUrl } from '@/lib/apiClient';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdAccount { id: string; platform: string; accountName: string; userRole: string; adAccountId: string; }
interface Campaign  { id: string; name: string; status: string; budget: number; spend: number; impressions: number; clicks: number; cpc: number; ctr: number; conversions: number; accountId: string; accountName: string; platform: string; userRole: string; }
interface AdSet     { id: string; adSetId: string; name: string; status: string; budget: number; targetLocation: string; targetAgeMin: number; targetAgeMax: number; targetGender: string; ads?: Ad[]; }
interface Ad        { id: string; adId: string; name: string; status: string; headline: string; text: string; mediaUrl: string; linkUrl: string; }

type ModalType = 'campaign' | 'adset' | 'ad' | null;

export default function AdsManagerPage() {
  const [accounts, setAccounts]       = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns]     = useState<Campaign[]>([]);
  const [loading, setLoading]         = useState(true);
  const [totals, setTotals]           = useState({ spend: 0, conversions: 0, clicks: 0, impressions: 0 });
  const [activeTab, setActiveTab]     = useState<'campaigns' | 'analytics'>('campaigns');

  // Expanded state
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
  const [expandedAdSets, setExpandedAdSets]       = useState<Record<string, boolean>>({});
  const [adSetsMap, setAdSetsMap]                 = useState<Record<string, AdSet[]>>({});
  const [loadingAdSets, setLoadingAdSets]         = useState<Record<string, boolean>>({});

  // Modal state
  const [modalType, setModalType]                 = useState<ModalType>(null);
  const [activeCampaign, setActiveCampaign]       = useState<Campaign | null>(null);
  const [activeAdSet, setActiveAdSet]             = useState<AdSet | null>(null);
  const [submitting, setSubmitting]               = useState(false);

  // Campaign form
  const [campName, setCampName]       = useState('');
  const [campBudget, setCampBudget]   = useState('50');
  const [campAccount, setCampAccount] = useState('');

  // Ad Set form
  const [asName, setAsName]               = useState('');
  const [asBudget, setAsBudget]           = useState('10');
  const [asLocation, setAsLocation]       = useState('Worldwide');
  const [asAgeMin, setAsAgeMin]           = useState('18');
  const [asAgeMax, setAsAgeMax]           = useState('65');
  const [asGender, setAsGender]           = useState('ALL');
  const [asInterests, setAsInterests]     = useState('');

  // Ad form
  const [adName, setAdName]       = useState('');
  const [adHeadline, setAdHeadline] = useState('');
  const [adText, setAdText]       = useState('');
  const [adLink, setAdLink]       = useState('');
  const [adMediaFile, setAdMediaFile] = useState<File | null>(null);
  const [adMediaPreview, setAdMediaPreview] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load accounts + campaigns ──────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const { accounts: accs } = await fetchAPI('/ads/accounts');
      const adAccs: AdAccount[] = accs || [];
      setAccounts(adAccs);
      if (adAccs.length > 0) setCampAccount(prev => prev || adAccs[0].id);

      let allCamps: Campaign[] = [];
      let totalSpend = 0, totalConversions = 0, totalClicks = 0, totalImpressions = 0;

      await Promise.all(adAccs.map(async (acc) => {
        try {
          const [campRes, analyticsRes] = await Promise.all([
            fetchAPI(`/ads/accounts/${acc.id}/campaigns`).catch(() => ({ campaigns: [] })),
            fetchAPI(`/ads/accounts/${acc.id}/analytics`).catch(() => ({ analytics: null }))
          ]);

          const camps: Campaign[] = (campRes.campaigns || []).map((c: any) => ({
            ...c,
            platform: acc.platform,
            accountId: acc.id,
            accountName: acc.accountName,
            userRole: acc.userRole || 'EMPLOYEE',
            impressions: c.impressions || 0,
            clicks: c.clicks || 0,
            cpc: c.cpc || 0,
            ctr: c.ctr || 0,
            conversions: c.conversions || 0,
          }));

          allCamps = [...allCamps, ...camps];
          totalSpend       += analyticsRes.analytics?.totalSpend || 0;
          totalConversions += analyticsRes.analytics?.conversions || 0;
          camps.forEach(c => { totalClicks += c.clicks; totalImpressions += c.impressions; });
        } catch (_) {}
      }));

      setCampaigns(allCamps);
      setTotals({ spend: totalSpend, conversions: totalConversions, clicks: totalClicks, impressions: totalImpressions });
    } catch (err) {
      console.error('Failed to load ads data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Toggle campaign expand → load ad sets ─────────────────────────────────
  const toggleCampaign = async (campaign: Campaign) => {
    const key = campaign.id;
    const isExpanded = expandedCampaigns[key];
    setExpandedCampaigns(prev => ({ ...prev, [key]: !isExpanded }));

    if (!isExpanded && !adSetsMap[key]) {
      setLoadingAdSets(prev => ({ ...prev, [key]: true }));
      try {
        const res = await fetchAPI(`/ads/accounts/${campaign.accountId}/campaigns/${campaign.id}/adsets`);
        setAdSetsMap(prev => ({ ...prev, [key]: res.adSets || [] }));
      } catch (_) {
        setAdSetsMap(prev => ({ ...prev, [key]: [] }));
      } finally {
        setLoadingAdSets(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  // ── Toggle adset expand (already loaded) ──────────────────────────────────
  const toggleAdSet = (adSetId: string) => {
    setExpandedAdSets(prev => ({ ...prev, [adSetId]: !prev[adSetId] }));
  };

  // ── Check admin ───────────────────────────────────────────────────────────
  const isAdmin = (campaign: Campaign) => campaign.userRole?.toUpperCase() === 'ADMIN';

  // ── Toggle campaign status ─────────────────────────────────────────────────
  const toggleStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await fetchAPI(`/ads/accounts/${campaign.accountId}/campaigns/${campaign.id}/status`, {
        method: 'PUT', body: JSON.stringify({ status: newStatus })
      });
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    } catch (err: any) { alert(err.message); }
  };

  // ── Delete campaign ────────────────────────────────────────────────────────
  const deleteCampaign = async (campaign: Campaign) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await fetchAPI(`/ads/accounts/${campaign.accountId}/campaigns/${campaign.id}`, { method: 'DELETE' });
      setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
    } catch (err: any) { alert(err.message); }
  };

  // ── Delete Ad Set ──────────────────────────────────────────────────────────
  const deleteAdSet = async (campaign: Campaign, adSet: AdSet) => {
    if (!confirm('Delete this Ad Set?')) return;
    try {
      await fetchAPI(`/ads/accounts/${campaign.accountId}/campaigns/${campaign.id}/adsets/${adSet.adSetId}`, { method: 'DELETE' });
      setAdSetsMap(prev => ({
        ...prev,
        [campaign.id]: (prev[campaign.id] || []).filter(a => a.adSetId !== adSet.adSetId)
      }));
    } catch (err: any) { alert(err.message); }
  };

  // ── Delete Ad ──────────────────────────────────────────────────────────────
  const deleteAdItem = async (campaign: Campaign, adSet: AdSet, ad: Ad) => {
    if (!confirm('Delete this Ad?')) return;
    try {
      await fetchAPI(`/ads/accounts/${campaign.accountId}/campaigns/${campaign.id}/adsets/${adSet.adSetId}/ads/${ad.adId}`, { method: 'DELETE' });
      setAdSetsMap(prev => ({
        ...prev,
        [campaign.id]: (prev[campaign.id] || []).map(as =>
          as.adSetId === adSet.adSetId ? { ...as, ads: (as.ads || []).filter(a => a.adId !== ad.adId) } : as
        )
      }));
    } catch (err: any) { alert(err.message); }
  };

  // ── Submit: Create Campaign ────────────────────────────────────────────────
  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName || !campBudget || !campAccount) return alert('Please fill all fields');
    setSubmitting(true);
    try {
      await fetchAPI(`/ads/accounts/${campAccount}/campaigns`, {
        method: 'POST', body: JSON.stringify({ name: campName, budget: Number(campBudget), status: 'PAUSED' })
      });
      setModalType(null); setCampName(''); setCampBudget('50');
      await loadData();
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  // ── Submit: Create Ad Set ─────────────────────────────────────────────────
  const submitAdSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asName || !activeCampaign) return;
    setSubmitting(true);
    try {
      const res = await fetchAPI(`/ads/accounts/${activeCampaign.accountId}/campaigns/${activeCampaign.id}/adsets`, {
        method: 'POST',
        body: JSON.stringify({
          name: asName, budget: Number(asBudget),
          targetLocation: asLocation, targetAgeMin: Number(asAgeMin),
          targetAgeMax: Number(asAgeMax), targetGender: asGender,
          targetInterests: asInterests.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      setAdSetsMap(prev => ({
        ...prev,
        [activeCampaign.id]: [...(prev[activeCampaign.id] || []), res.adSet]
      }));
      setModalType(null); setAsName(''); setAsBudget('10'); setAsInterests('');
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  // ── Submit: Create Ad ─────────────────────────────────────────────────────
  const submitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adName || !activeCampaign || !activeAdSet) return;
    setSubmitting(true);
    let uploadedMediaUrl = '';

    try {
      if (adMediaFile) {
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('media', adMediaFile);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';
        const uploadRes = await fetch(`${getBackendUrl()}/api/v1/social/upload`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        uploadedMediaUrl = uploadData.url;
        setUploadingMedia(false);
      }

      const res = await fetchAPI(
        `/ads/accounts/${activeCampaign.accountId}/campaigns/${activeCampaign.id}/adsets/${activeAdSet.adSetId}/ads`,
        { method: 'POST', body: JSON.stringify({ name: adName, headline: adHeadline, text: adText, linkUrl: adLink, mediaUrl: uploadedMediaUrl }) }
      );

      setAdSetsMap(prev => ({
        ...prev,
        [activeCampaign.id]: (prev[activeCampaign.id] || []).map(as =>
          as.adSetId === activeAdSet.adSetId ? { ...as, ads: [...(as.ads || []), res.ad] } : as
        )
      }));
      setModalType(null); setAdName(''); setAdHeadline(''); setAdText(''); setAdLink(''); setAdMediaFile(null); setAdMediaPreview('');
    } catch (err: any) { alert(err.message); }
    finally { setSubmitting(false); setUploadingMedia(false); }
  };

  const platformColor = (p: string) => {
    if (p === 'facebook' || p === 'meta') return '#1877F2';
    if (p === 'google') return '#EA4335';
    if (p === 'linkedin') return '#0A66C2';
    return '#6366f1';
  };

  const platformLabel = (p: string) => {
    if (p === 'facebook') return 'Meta';
    if (p === 'google') return 'Google';
    if (p === 'linkedin') return 'LinkedIn';
    return p;
  };

  if (loading) return <div className="loading-state">Loading Ads Manager...</div>;

  if (accounts.length === 0) return (
    <div className="page-header">
      <h1>Ads Manager</h1>
      <p>No Ad accounts connected. Go to <strong>Integrations</strong> to connect Meta or Google Ads.</p>
    </div>
  );

  const tabStyle = (tab: string) => ({
    padding: '10px 20px', background: 'none', border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: activeTab === tab ? '600' : '400',
    cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s'
  } as React.CSSProperties);

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Ads Manager</h1>
          <p>Campaign → Ad Set → Ad — full hierarchy for Meta &amp; Google</p>
        </div>
        <button className="btn-primary" onClick={() => setModalType('campaign')}>
          <Plus size={18} /> New Campaign
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '28px', borderBottom: '1px solid var(--border)' }}>
        <button style={tabStyle('campaigns')} onClick={() => setActiveTab('campaigns')}>
          <Layers size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Campaigns
        </button>
        <button style={tabStyle('analytics')} onClick={() => setActiveTab('analytics')}>
          <BarChart2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Analytics
        </button>
      </div>

      {activeTab === 'analytics' ? (
        /* ─── ANALYTICS TAB ─── */
        <>
          <div className="dashboard-grid" style={{ marginBottom: '28px' }}>
            {[
              { label: 'Total Ad Spend', value: `$${totals.spend.toFixed(2)}`, sub: 'This billing cycle', icon: <DollarSign size={20} /> },
              { label: 'Total Clicks', value: totals.clicks, sub: 'Across all campaigns', icon: <TrendingUp size={20} /> },
              { label: 'Impressions', value: totals.impressions, sub: 'Total views', icon: <BarChart2 size={20} /> },
              { label: 'Conversions', value: totals.conversions, sub: 'Leads generated', icon: <Target size={20} /> },
            ].map(card => (
              <div key={card.label} className="card">
                <div className="card-header"><h2>{card.label}</h2><div className="card-icon">{card.icon}</div></div>
                <div className="stat-value">{card.value}</div>
                <div className="stat-label">{card.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Impressions vs Clicks by Campaign</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={campaigns} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickFormatter={v => v.substring(0, 12)} />
                  <YAxis yAxisId="left" stroke="#8884d8" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="impressions" name="Impressions" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="clicks" name="Clicks" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>CPC &amp; CTR by Campaign</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={campaigns} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickFormatter={v => v.substring(0, 12)} />
                  <YAxis yAxisId="left" stroke="#ff7300" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#387908" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="cpc" name="CPC ($)" fill="#ff7300" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="ctr" name="CTR (%)" fill="#387908" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        /* ─── CAMPAIGNS TAB — Accordion ─── */
        <div>
          {campaigns.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h2 style={{ marginBottom: '8px' }}>No Campaigns Yet</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Click "New Campaign" to launch your first ad campaign.</p>
            </div>
          ) : campaigns.map(campaign => {
            const expanded = expandedCampaigns[campaign.id];
            const admin = isAdmin(campaign);
            const campAdSets = adSetsMap[campaign.id] || [];

            return (
              <div key={campaign.id} className="card" style={{ marginBottom: '12px', padding: 0, overflow: 'hidden' }}>
                {/* Campaign Row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', padding: '14px 20px',
                    cursor: 'pointer', background: expanded ? 'var(--bg-secondary)' : 'transparent',
                    borderBottom: expanded ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => toggleCampaign(campaign)}
                >
                  {/* Expand icon */}
                  <div style={{ marginRight: '12px', color: 'var(--text-muted)' }}>
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>

                  {/* Platform badge */}
                  <span style={{
                    background: platformColor(campaign.platform), color: '#fff',
                    padding: '2px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                    marginRight: '14px', whiteSpace: 'nowrap'
                  }}>{platformLabel(campaign.platform)}</span>

                  {/* Name */}
                  <div style={{ flex: 1, fontWeight: 600, fontSize: '0.95rem' }}>{campaign.name}</div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: '16px' }}>
                    <span>Budget: <strong>${campaign.budget.toFixed(2)}</strong></span>
                    <span>Spend: <strong>${campaign.spend.toFixed(2)}</strong></span>
                    <span>Clicks: <strong>{campaign.clicks}</strong></span>
                    <span>CTR: <strong>{Number(campaign.ctr).toFixed(1)}%</strong></span>
                  </div>

                  {/* Status badge */}
                  <span className={`status-badge ${campaign.status.toLowerCase()}`} style={{ marginRight: '12px' }}>
                    {campaign.status}
                  </span>

                  {/* Actions — stop propagation so click doesn't toggle expand */}
                  <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                    {admin ? (
                      <>
                        <button
                          onClick={() => toggleStatus(campaign)}
                          title={campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: campaign.status === 'ACTIVE' ? '#f59e0b' : '#10b981', padding: '4px' }}
                        >
                          {campaign.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button onClick={() => deleteCampaign(campaign)} title="Delete Campaign"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <span title="Read-only: Employee role" style={{ color: 'var(--text-muted)' }}><Lock size={16} /></span>
                    )}
                  </div>
                </div>

                {/* Ad Sets Section */}
                {expanded && (
                  <div style={{ background: 'var(--bg-secondary)' }}>
                    {loadingAdSets[campaign.id] ? (
                      <div style={{ padding: '20px 40px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={16} className="spin" /> Loading Ad Sets...
                      </div>
                    ) : (
                      <>
                        {campAdSets.length === 0 ? (
                          <div style={{ padding: '16px 48px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No Ad Sets yet. Create your first Ad Set below.
                          </div>
                        ) : campAdSets.map(adSet => {
                          const asExpanded = expandedAdSets[adSet.adSetId];
                          return (
                            <div key={adSet.adSetId} style={{ borderBottom: '1px solid var(--border)' }}>
                              {/* Ad Set Row */}
                              <div
                                style={{
                                  display: 'flex', alignItems: 'center',
                                  padding: '11px 20px 11px 48px', cursor: 'pointer',
                                  background: asExpanded ? 'rgba(99,102,241,0.05)' : 'transparent'
                                }}
                                onClick={() => toggleAdSet(adSet.adSetId)}
                              >
                                <div style={{ marginRight: '10px', color: 'var(--text-muted)' }}>
                                  {asExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                </div>
                                <Target size={14} style={{ color: '#6366f1', marginRight: '8px' }} />
                                <span style={{ fontWeight: 500, flex: 1, fontSize: '0.88rem' }}>{adSet.name}</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '16px' }}>
                                  Budget: ${adSet.budget}/day · Ages {adSet.targetAgeMin}–{adSet.targetAgeMax} · {adSet.targetLocation}
                                </span>
                                <span className={`status-badge ${adSet.status.toLowerCase()}`} style={{ fontSize: '0.7rem', marginRight: '10px' }}>
                                  {adSet.status}
                                </span>
                                {admin && (
                                  <button onClick={e => { e.stopPropagation(); deleteAdSet(campaign, adSet); }}
                                    title="Delete Ad Set"
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '3px' }}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Ads inside Ad Set */}
                              {asExpanded && (
                                <div style={{ paddingLeft: '72px', paddingBottom: '10px', paddingRight: '20px' }}>
                                  {(adSet.ads || []).length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 0' }}>No ads yet in this Ad Set.</div>
                                  ) : (adSet.ads || []).map(ad => (
                                    <div key={ad.adId} style={{
                                      display: 'flex', alignItems: 'center', gap: '10px',
                                      padding: '8px 12px', background: 'var(--bg-card)',
                                      borderRadius: '8px', marginBottom: '6px', border: '1px solid var(--border)'
                                    }}>
                                      <Image size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                      <span style={{ fontWeight: 500, fontSize: '0.83rem', flex: 1 }}>{ad.name}</span>
                                      {ad.headline && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{ad.headline}"</span>}
                                      <span className={`status-badge ${ad.status.toLowerCase()}`} style={{ fontSize: '0.68rem' }}>{ad.status}</span>
                                      {admin && (
                                        <button onClick={() => deleteAdItem(campaign, adSet, ad)}
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {admin && (
                                    <button
                                      onClick={() => { setActiveCampaign(campaign); setActiveAdSet(adSet); setModalType('ad'); }}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        background: 'none', border: '1px dashed var(--border)',
                                        borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
                                        color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px'
                                      }}>
                                      <Plus size={13} /> Add Ad
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Ad Set button */}
                        {admin && (
                          <div style={{ padding: '12px 20px 12px 48px' }}>
                            <button
                              onClick={() => { setActiveCampaign(campaign); setModalType('adset'); }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'none', border: '1px dashed var(--primary)',
                                borderRadius: '8px', padding: '7px 16px', cursor: 'pointer',
                                color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 500
                              }}>
                              <Plus size={14} /> New Ad Set
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: New Campaign ─── */}
      {modalType === 'campaign' && (
        <ModalOverlay onClose={() => setModalType(null)}>
          <h2 style={{ marginBottom: '6px' }}>New Campaign</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Create a campaign on Meta or Google Ads.</p>
          <form onSubmit={submitCampaign}>
            <label style={labelStyle}>Campaign Name</label>
            <input style={inputStyle} placeholder="Summer Sale 2025" value={campName} onChange={e => setCampName(e.target.value)} required />
            <label style={labelStyle}>Ad Account</label>
            <select style={inputStyle} value={campAccount} onChange={e => setCampAccount(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.accountName} ({platformLabel(a.platform)})</option>)}
            </select>
            <label style={labelStyle}>Daily Budget ($)</label>
            <input style={inputStyle} type="number" min="1" value={campBudget} onChange={e => setCampBudget(e.target.value)} required />
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
              {submitting ? <><Loader2 size={16} className="spin" /> Creating...</> : 'Create Campaign'}
            </button>
          </form>
        </ModalOverlay>
      )}

      {/* ─── MODAL: New Ad Set ─── */}
      {modalType === 'adset' && activeCampaign && (
        <ModalOverlay onClose={() => setModalType(null)}>
          <h2 style={{ marginBottom: '4px' }}>New Ad Set</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
            Under: <strong>{activeCampaign.name}</strong> · {platformLabel(activeCampaign.platform)}
          </p>
          <form onSubmit={submitAdSet}>
            <label style={labelStyle}>Ad Set Name</label>
            <input style={inputStyle} placeholder="18-35 India Women" value={asName} onChange={e => setAsName(e.target.value)} required />
            <label style={labelStyle}>Daily Budget ($)</label>
            <input style={inputStyle} type="number" min="1" value={asBudget} onChange={e => setAsBudget(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Min Age</label>
                <input style={inputStyle} type="number" min="18" max="65" value={asAgeMin} onChange={e => setAsAgeMin(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Max Age</label>
                <input style={inputStyle} type="number" min="18" max="65" value={asAgeMax} onChange={e => setAsAgeMax(e.target.value)} />
              </div>
            </div>
            <label style={labelStyle}>Gender</label>
            <select style={inputStyle} value={asGender} onChange={e => setAsGender(e.target.value)}>
              <option value="ALL">All</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <label style={labelStyle}>Location</label>
            <input style={inputStyle} placeholder="India, US, UK" value={asLocation} onChange={e => setAsLocation(e.target.value)} />
            <label style={labelStyle}>Interests (comma-separated)</label>
            <input style={inputStyle} placeholder="Technology, Fashion" value={asInterests} onChange={e => setAsInterests(e.target.value)} />
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting}>
              {submitting ? <><Loader2 size={16} className="spin" /> Creating...</> : 'Create Ad Set'}
            </button>
          </form>
        </ModalOverlay>
      )}

      {/* ─── MODAL: New Ad ─── */}
      {modalType === 'ad' && activeCampaign && activeAdSet && (
        <ModalOverlay onClose={() => setModalType(null)}>
          <h2 style={{ marginBottom: '4px' }}>New Ad</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '18px' }}>
            Under: <strong>{activeCampaign.name}</strong> → <strong>{activeAdSet.name}</strong>
          </p>
          <form onSubmit={submitAd}>
            <label style={labelStyle}>Ad Name</label>
            <input style={inputStyle} placeholder="Spring Sale - Version A" value={adName} onChange={e => setAdName(e.target.value)} required />
            <label style={labelStyle}>Headline</label>
            <input style={inputStyle} placeholder="Get 50% Off Today!" value={adHeadline} onChange={e => setAdHeadline(e.target.value)} />
            <label style={labelStyle}>Ad Text / Body</label>
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Limited offer. Click to claim your discount." value={adText} onChange={e => setAdText(e.target.value)} />
            <label style={labelStyle}>Destination URL</label>
            <input style={inputStyle} placeholder="https://yoursite.com/sale" value={adLink} onChange={e => setAdLink(e.target.value)} />
            <label style={labelStyle}>Ad Image / Video</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border)', borderRadius: '10px', padding: '20px',
                textAlign: 'center', cursor: 'pointer', marginBottom: '12px',
                background: adMediaPreview ? 'transparent' : 'var(--bg-secondary)'
              }}
            >
              {adMediaPreview ? (
                <img src={adMediaPreview} alt="preview" style={{ maxHeight: '120px', borderRadius: '6px', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <UploadCloud size={24} style={{ marginBottom: '6px' }} /><br />Click to upload image or video
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.[0]) {
                  setAdMediaFile(e.target.files[0]);
                  setAdMediaPreview(URL.createObjectURL(e.target.files[0]));
                }
              }} />
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={submitting || uploadingMedia}>
              {uploadingMedia ? <><Loader2 size={16} className="spin" /> Uploading...</> : submitting ? <><Loader2 size={16} className="spin" /> Creating...</> : 'Create Ad'}
            </button>
          </form>
        </ModalOverlay>
      )}
    </>
  );
}

// ─── Modal Wrapper ─────────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '500px', padding: '28px', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
        }}><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 500,
  color: 'var(--text-muted)', marginBottom: '5px', marginTop: '12px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
  color: 'var(--text-main)', fontSize: '0.9rem', boxSizing: 'border-box'
};
