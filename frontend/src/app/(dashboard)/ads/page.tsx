'use client';

import { useState, useEffect } from 'react';
import { Activity, Edit2, Play, Pause, TrendingUp, DollarSign, Plus, Loader2, X, Lock, ShieldAlert, Check } from 'lucide-react';
import { fetchAPI } from '@/lib/apiClient';

export default function AdsManagerPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ spend: 0, conversions: 0 });

  // New Campaign Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCampName, setNewCampName] = useState('');
  const [newCampBudget, setNewCampBudget] = useState('');
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [targetLocation, setTargetLocation] = useState('Worldwide');
  const [targetAgeMin, setTargetAgeMin] = useState('18');
  const [targetAgeMax, setTargetAgeMax] = useState('65');
  const [targetGender, setTargetGender] = useState('ALL');
  const [targetInterests, setTargetInterests] = useState('Technology, Business');
  const [creating, setCreating] = useState(false);
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<any>(null);

  const loadAds = async () => {
    try {
      const { accounts: adAccs } = await fetchAPI('/ads/accounts');
      setAccounts(adAccs || []);
      
      if (adAccs && adAccs.length > 0) {
        setSelectedAdAccount(prev => prev || adAccs[0].id);
      }
      
      let allCampaigns: any[] = [];
      let totalSpend = 0;
      let totalConversions = 0;

      for (const acc of adAccs || []) {
        // Fetch campaigns for each account
        const { campaigns: campData } = await fetchAPI(`/ads/accounts/${acc.id}/campaigns`);
        if (campData) {
          // Append platform and role to campaign object for UI
          const campsWithPlatform = campData.map((c: any) => ({
            ...c, 
            platform: acc.platform, 
            accountId: acc.id, 
            accountName: acc.accountName, 
            userRole: acc.userRole || 'EMPLOYEE',
            conversions: c.conversions || Math.floor(c.spend * 0.1)
          }));
          allCampaigns = [...allCampaigns, ...campsWithPlatform];
        }

        // Fetch analytics to aggregate totals
        const { analytics } = await fetchAPI(`/ads/accounts/${acc.id}/analytics`);
        if (analytics) {
          totalSpend += analytics.totalSpend || 0;
          totalConversions += analytics.conversions || 0;
        }
      }
      
      setCampaigns(allCampaigns);
      setTotals({ spend: totalSpend, conversions: totalConversions });
    } catch (err) {
      console.error('Failed to load ads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, []);

  const checkIsAdmin = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    return acc?.userRole?.toUpperCase() === 'ADMIN';
  };

  const toggleStatus = async (accountId: string, id: string, currentStatus: string) => {
    if (!checkIsAdmin(accountId)) {
      alert("Permission Denied: Only Admins can modify campaign status.");
      return;
    }
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await fetchAPI(`/ads/accounts/${accountId}/campaigns/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditBudget = async (accountId: string, id: string) => {
    if (!checkIsAdmin(accountId)) {
      alert("Permission Denied: Only Admins can modify ad budgets.");
      return;
    }
    const newBudget = prompt("Enter new daily budget:");
    if (newBudget && !isNaN(Number(newBudget))) {
      try {
        await fetchAPI(`/ads/accounts/${accountId}/campaigns/${id}/budget`, {
          method: 'PUT',
          body: JSON.stringify({ newBudget: Number(newBudget) })
        });
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, budget: Number(newBudget) } : c));
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdAccount) return alert("Please select an ad account.");
    if (!checkIsAdmin(selectedAdAccount)) {
      return alert("Permission Denied: You do not have Admin permissions on this account.");
    }
    if (!newCampName || !newCampBudget) return alert("Please enter campaign name and budget.");

    setCreating(true);
    try {
      await fetchAPI(`/ads/accounts/${selectedAdAccount}/campaigns`, {
        method: 'POST',
        body: JSON.stringify({
          name: newCampName,
          budget: Number(newCampBudget),
          status: 'PAUSED',
          targetLocation,
          targetAgeMin: Number(targetAgeMin),
          targetAgeMax: Number(targetAgeMax),
          targetGender,
          targetInterests: targetInterests.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      setShowModal(false);
      setNewCampName('');
      setNewCampBudget('');
      
      // Reload campaigns
      setLoading(true);
      await loadAds();
    } catch (err: any) {
      alert(err.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
      setLoading(false);
    }
  };

  const selectedAccountDetails = accounts.find(a => a.id === selectedAdAccount);
  const selectedAccountIsAdmin = selectedAccountDetails?.userRole?.toUpperCase() === 'ADMIN';

  if (loading) {
    return <div className="loading-state">Loading Ads Data...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="page-header">
        <h1>Ads Control Panel</h1>
        <p>You have not connected any Ad accounts. Go to Accounts to connect Meta or Google Ads.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Ads Control Panel</h1>
          <p>Manage budgets, monitor spend, and toggle active campaigns.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Campaign
        </button>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <div className="card">
          <div className="card-header">
            <h2>Total Ad Spend</h2>
            <div className="card-icon"><DollarSign size={20} /></div>
          </div>
          <div className="stat-value">${totals.spend.toFixed(2)}</div>
          <div className="stat-label">This billing cycle</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2>Total Conversions</h2>
            <div className="card-icon"><TrendingUp size={20} /></div>
          </div>
          <div className="stat-value">{totals.conversions}</div>
          <div className="stat-label">Across all connected platforms</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Active Campaigns</h2>
        
        {campaigns.length === 0 ? (
          <p className="text-muted">No campaigns found for connected accounts.</p>
        ) : (
          <div className="table-responsive">
            <table className="ads-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Account</th>
                  <th>Role</th>
                  <th>Platform</th>
                  <th>Daily Budget</th>
                  <th>Spend</th>
                  <th>Conversions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(campaign => {
                  const isAdmin = checkIsAdmin(campaign.accountId);
                  return (
                    <tr key={campaign.id}>
                      <td className="fw-600">{campaign.name}</td>
                      <td>{campaign.accountName}</td>
                      <td>
                        <span className={`status-badge ${isAdmin ? 'active' : 'inactive'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {isAdmin ? 'Admin' : 'Employee'}
                        </span>
                      </td>
                      <td>
                        <span className={`platform-tag ${campaign.platform.split(' ')[0].toLowerCase()}`}>
                          {campaign.platform}
                        </span>
                      </td>
                      <td>
                        ${campaign.budget.toFixed(2)}
                        {isAdmin ? (
                          <button 
                            onClick={() => handleEditBudget(campaign.accountId, campaign.id)} 
                            className="icon-btn-inline" 
                            title="Edit Budget" 
                            style={{ marginLeft: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <Edit2 size={12} />
                          </button>
                        ) : (
                          <span title="Locked: Employee Role" style={{ marginLeft: '6px', color: 'var(--text-muted)', display: 'inline-flex', verticalAlign: 'middle' }}>
                            <Lock size={12} />
                          </span>
                        )}
                      </td>
                      <td>${campaign.spend.toFixed(2)}</td>
                      <td>{campaign.conversions}</td>
                      <td>
                        <span className={`status-badge ${campaign.status.toLowerCase()}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            onClick={() => setSelectedCampaignDetails(campaign)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <TrendingUp size={12} /> View Audience & Insights
                          </button>
                          {isAdmin ? (
                            <button 
                              onClick={() => toggleStatus(campaign.accountId, campaign.id, campaign.status)} 
                              className={`toggle-btn ${campaign.status.toLowerCase()}`}
                              title={campaign.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                              style={{ border: 'none', cursor: 'pointer', background: 'none', padding: '5px' }}
                            >
                              {campaign.status === 'ACTIVE' ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                          ) : (
                            <span 
                              title="Ad status toggles are locked for Employees" 
                              style={{ color: 'var(--text-muted)', display: 'inline-block', padding: '5px' }}
                            >
                              <Lock size={16} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Campaign Modal Dialog */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '480px', padding: '24px', position: 'relative',
            background: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)'
            }}>
              <X size={20} />
            </button>

            <h2 style={{ marginBottom: '8px' }}>Create New Campaign</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Launch a new advertising campaign on your connected platforms.
            </p>

            {selectedAdAccount && !selectedAccountIsAdmin && (
              <div style={{ 
                background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#ef4444', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                gap: '8px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500'
              }}>
                <ShieldAlert size={16} />
                <span>ReadOnly Access: Campaign creation is locked.</span>
              </div>
            )}

            <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Select Ad Account</label>
                <select 
                  value={selectedAdAccount} 
                  onChange={(e) => setSelectedAdAccount(e.target.value)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.95rem'
                  }}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.platform}) - {acc.userRole?.toUpperCase() === 'ADMIN' ? 'Admin' : 'Employee'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Campaign Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Winter Boots Promotion" 
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  required
                  disabled={!selectedAccountIsAdmin}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.95rem',
                    opacity: selectedAccountIsAdmin ? 1 : 0.6
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '500' }}>Daily Budget (USD)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 50.00" 
                  value={newCampBudget}
                  onChange={(e) => setNewCampBudget(e.target.value)}
                  required
                  min="1"
                  step="0.01"
                  disabled={!selectedAccountIsAdmin}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.95rem',
                    opacity: selectedAccountIsAdmin ? 1 : 0.6
                  }}
                />
              </div>

              {/* Audience Targeting Controls */}
              <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '10px', border: '1px border var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)' }}>Target Audience Controls</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Location</label>
                    <input type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. India, USA" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Gender</label>
                    <select value={targetGender} onChange={(e) => setTargetGender(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                      <option value="ALL">All Genders</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Min Age</label>
                    <input type="number" value={targetAgeMin} onChange={(e) => setTargetAgeMin(e.target.value)} min="13" max="65" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Max Age</label>
                    <input type="number" value={targetAgeMax} onChange={(e) => setTargetAgeMax(e.target.value)} min="18" max="65" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '500' }}>Targeted Interests (Comma Separated)</label>
                  <input type="text" value={targetInterests} onChange={(e) => setTargetInterests(e.target.value)} placeholder="Business, Tech, E-commerce" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem' }} />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={creating || !selectedAccountIsAdmin}
                style={{
                  padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', marginTop: '10px',
                  opacity: selectedAccountIsAdmin ? 1 : 0.5, cursor: selectedAccountIsAdmin ? 'pointer' : 'not-allowed'
                }}
              >
                {creating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (selectedAccountIsAdmin ? <Plus size={18} /> : <Lock size={18} />)}
                {selectedAccountIsAdmin ? 'Create Campaign' : 'Locked'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Campaign Details & Audience Insights Modal */}
      {selectedCampaignDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '520px', padding: '24px', position: 'relative',
            background: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <button onClick={() => setSelectedCampaignDetails(null)} style={{
              position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--text-muted)'
            }}>
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`platform-tag ${selectedCampaignDetails.platform}`}>{selectedCampaignDetails.platform}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {selectedCampaignDetails.id}</span>
            </div>
            <h2 style={{ marginBottom: '4px' }}>{selectedCampaignDetails.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Connected Ad Account: <strong>{selectedCampaignDetails.accountName}</strong></p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Daily Budget</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${selectedCampaignDetails.budget?.toFixed(2)}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Spend</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${selectedCampaignDetails.spend?.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(79, 70, 229, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '10px' }}>Target Audience Settings</div>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>📍 <strong>Location:</strong> {selectedCampaignDetails.targetLocation || 'Worldwide'}</div>
                <div>👤 <strong>Age Range:</strong> {selectedCampaignDetails.targetAgeMin || 18} - {selectedCampaignDetails.targetAgeMax || 65} years</div>
                <div>⚡ <strong>Gender:</strong> {selectedCampaignDetails.targetGender || 'ALL'}</div>
                <div>🎯 <strong>Interests:</strong> {Array.isArray(selectedCampaignDetails.targetInterests) && selectedCampaignDetails.targetInterests.length > 0 ? selectedCampaignDetails.targetInterests.join(', ') : 'Technology, Business'}</div>
              </div>
            </div>

            <button className="btn-primary" onClick={() => setSelectedCampaignDetails(null)} style={{ width: '100%', padding: '10px' }}>
              Close Insights
            </button>
          </div>
        </div>
      )}
    </>
  );
}
