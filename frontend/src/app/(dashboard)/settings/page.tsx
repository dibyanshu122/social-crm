'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAPI } from '@/lib/apiClient';
import { User, Mail, Briefcase, Camera, Shield, ShieldCheck, Key, Loader2, Check, Sliders, CheckCircle } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  // Roles Management State
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Team Members State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviting, setInviting] = useState(false);

  // 2FA Security State
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(true);
  
  // 2FA Setup State
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  // Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setProfile({
          email: user.email,
          name: user.user_metadata?.full_name || 'My Profile',
          role: 'Admin',
        });
      }
    } catch (err) {
      console.error('Error fetching profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadConnectedAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await fetchAPI('/social/accounts');
      setSocialAccounts(res.accounts || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadMfaStatus = async () => {
    try {
      setLoadingMfa(true);
      // listFactors lists all active enrolled factors for the user
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const enrolledFactors = data?.all || [];
      setMfaFactors(enrolledFactors);
      
      // Check if any TOTP factor is verified/active
      const isTotpEnabled = enrolledFactors.some(f => f.factorType === 'totp' && f.status === 'verified');
      setMfaEnabled(isTotpEnabled);
    } catch (err) {
      console.error('Error listing MFA factors:', err);
    } finally {
      setLoadingMfa(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      const res = await fetchAPI('/social/team');
      setTeamMembers(res.members || []);
    } catch (err) {
      console.error('Error loading team members:', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadConnectedAccounts();
    loadMfaStatus();
    loadTeamMembers();
  }, []);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return showToast('error', 'Email is required.');

    setInviting(true);
    try {
      await fetchAPI('/social/team/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole
        })
      });
      showToast('success', `Team member ${inviteEmail} added with ${inviteRole} role.`);
      setInviteEmail('');
      setInviteName('');
      await loadTeamMembers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add team member.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await fetchAPI(`/social/team/${memberId}`, { method: 'DELETE' });
      showToast('success', 'Team member access revoked.');
      setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove team member.');
    }
  };

  // Update account role
  const handleRoleChange = async (accountId: string, newRole: string) => {
    setUpdatingRoleId(accountId);
    try {
      await fetchAPI(`/social/accounts/${accountId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      
      // Update local state
      setSocialAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, userRole: newRole } : acc));
      showToast('success', `Role changed to ${newRole} successfully.`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update role.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  // Enroll MFA (Get QR Code)
  const handleStart2faSetup = async () => {
    setMfaError('');
    try {
      const { data: factorsList, error: listError } = await supabase.auth.mfa.listFactors();
      if (!listError && factorsList?.all) {
        const unverified = factorsList.all.filter(f => f.status === 'unverified' && f.factorType === 'totp');
        for (const factor of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'CommandCenter CRM',
        friendlyName: 'TOTP Authentication'
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCodeSvg(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setShowMfaSetup(true);
    } catch (err: any) {
      setMfaError(err.message || 'Failed to initialize 2FA setup.');
    }
  };

  // Verify and activate MFA
  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setMfaError('Please enter a valid 6-digit code.');
      return;
    }

    setVerifyingMfa(true);
    setMfaError('');

    try {
      // 1. Challenge factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      // 2. Verify challenge with code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      // Successful activation
      showToast('success', 'Two-Factor Authentication has been successfully enabled! ✓');
      setShowMfaSetup(false);
      setVerificationCode('');
      await loadMfaStatus();
    } catch (err: any) {
      setMfaError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setVerifyingMfa(false);
    }
  };

  // Unenroll MFA (Disable 2FA)
  const handleDisable2fa = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.')) return;
    
    setLoadingMfa(true);
    try {
      const activeFactor = mfaFactors.find(f => f.factorType === 'totp' && f.status === 'verified');
      if (!activeFactor) throw new Error('No active TOTP factor found.');

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: activeFactor.id
      });

      if (error) throw error;

      showToast('success', 'Two-Factor Authentication has been disabled.');
      await loadMfaStatus();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to disable 2FA.');
    } finally {
      setLoadingMfa(false);
    }
  };

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: 'white', padding: '14px 20px', borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', fontSize: '0.95rem',
          animation: 'slideIn 0.3s ease',
          maxWidth: '400px',
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <Shield size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="page-header">
        <h1>Account Settings</h1>
        <p>Manage your profile details, secure access roles, and Two-Factor Authentication.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Profile Card & Connected accounts side-by-side or stacked */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Profile Details Card */}
          <div className="card" style={{ border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(10,102,194,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <User size={40} />
                </div>
                <button style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-main)' }}>
                  <Camera size={16} />
                </button>
              </div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '5px', fontWeight: '700' }}>{profile?.name}</h2>
              <span className="status-badge active" style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '20px' }}>Active Session</span>
            </div>

            <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', top: '14px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type="text" className="form-input" value={profile?.name} style={{ paddingLeft: '45px', width: '100%' }} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', top: '14px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type="email" className="form-input" value={profile?.email} style={{ paddingLeft: '45px', width: '100%' }} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Organization</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase size={18} style={{ position: 'absolute', top: '14px', left: '15px', color: 'var(--text-muted)' }} />
                  <input type="text" className="form-input" defaultValue="Anantya AI Command" style={{ paddingLeft: '45px', width: '100%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Connected Account Roles Manager Card */}
          <div className="card" style={{ border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Connected Account Roles</h2>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>
                  <Sliders size={20} />
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                Manage Facebook Business Manager roles for each channel. Changing to <strong>Employee</strong> restricts campaign actions to read-only.
              </p>

              {loadingAccounts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                </div>
              ) : socialAccounts.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>No connected channels found. Go to Accounts tab to link profiles.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {socialAccounts.map(account => (
                    <div key={account.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                          {account.accountName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {account.platform}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {updatingRoleId === account.id && (
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                        )}
                        <select
                          value={account.userRole?.toUpperCase() || 'ADMIN'}
                          onChange={(e) => handleRoleChange(account.id, e.target.value)}
                          disabled={updatingRoleId === account.id}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                            background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.85rem',
                            fontWeight: '600', cursor: 'pointer'
                          }}
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="EMPLOYEE">Employee</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '15px', marginTop: '15px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tip: Set role to <strong>Employee</strong> to test security limits on the Ads Manager screen.
            </div>
          </div>
        </div>

        {/* Team Members & Employee Access Delegation Card */}
        <div className="card" style={{ border: '1px solid var(--border)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Team & Employee Access Delegation</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                As an Admin, invite employees or team members by email and assign them specific roles (Admin or Employee).
              </p>
            </div>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(79,70,229,0.1)', color: 'var(--accent)' }}>
              <User size={22} />
            </div>
          </div>

          {/* Invite Employee Form */}
          <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Employee Name</label>
              <input type="text" placeholder="e.g. Amit Sharma" value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
            </div>
            <div style={{ flex: 1.5, minWidth: '220px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Employee Email</label>
              <input type="email" placeholder="amit@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
            </div>
            <div style={{ width: '130px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Assign Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button className="btn-primary" type="submit" disabled={inviting} style={{ padding: '9px 18px', fontSize: '0.9rem' }}>
              {inviting ? 'Inviting...' : '+ Add Member'}
            </button>
          </form>

          {/* Team Members List */}
          {loadingTeam ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            </div>
          ) : teamMembers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No extra team members added yet. You are the sole Admin.</p>
          ) : (
            <div className="table-responsive">
              <table className="ads-table" style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Email Address</th>
                    <th>Assigned Role</th>
                    <th>Access Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(m => (
                    <tr key={m.id}>
                      <td className="fw-600">{m.name || 'Team Member'}</td>
                      <td>{m.email}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold',
                          background: m.role === 'ADMIN' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: m.role === 'ADMIN' ? '#4f46e5' : '#3b82f6'
                        }}>
                          {m.role}
                        </span>
                      </td>
                      <td><span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: '500' }}>Active</span></td>
                      <td>
                        <button onClick={() => handleRemoveMember(m.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}>
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Two-Factor Authentication Security Panel */}
        <div className="card" style={{ border: '1px solid var(--border)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                padding: '10px', borderRadius: '12px', 
                background: mfaEnabled ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                color: mfaEnabled ? '#16a34a' : '#dc2626' 
              }}>
                {mfaEnabled ? <ShieldCheck size={24} /> : <Shield size={24} />}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Two-Factor Authentication (2FA)</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '2px 0 0' }}>
                  Protect your campaigns and social tokens with authenticator codes.
                </p>
              </div>
            </div>
            
            {!loadingMfa && (
              <span className={`status-badge ${mfaEnabled ? 'active' : 'inactive'}`} style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </span>
            )}
          </div>

          {loadingMfa ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            </div>
          ) : (
            <div>
              {!mfaEnabled ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0 }}>
                    Two-Factor Authentication is currently **disabled**. Enable it to add an extra layer of protection using authenticator apps like Google Authenticator or Microsoft Authenticator.
                  </p>
                  <button 
                    onClick={handleStart2faSetup}
                    className="btn-primary" 
                    style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
                  >
                    <Key size={18} /> Enable 2FA Security
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ 
                    padding: '12px 16px', borderRadius: '12px', background: 'rgba(22, 163, 74, 0.08)',
                    border: '1px solid rgba(22, 163, 74, 0.2)', display: 'flex', alignItems: 'center', gap: '10px',
                    color: '#16a34a', fontSize: '0.9rem', fontWeight: '500'
                  }}>
                    <Check size={18} />
                    <span>Your account is fully protected with TOTP Multi-Factor Authentication.</span>
                  </div>
                  <button 
                    onClick={handleDisable2fa}
                    style={{
                      width: 'fit-content', padding: '10px 24px', borderRadius: '8px',
                      border: '1px solid #dc262630', background: '#dc262615', color: '#dc2626',
                      fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              )}

              {/* MFA Setup Modal / Panel */}
              {showMfaSetup && (
                <div style={{
                  marginTop: '24px', padding: '20px', borderRadius: '14px',
                  border: '1px solid var(--border)', background: 'var(--bg-secondary)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>Setup Authenticator App</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Scan the QR code below using your authenticator app, then enter the 6-digit confirmation code:
                  </p>

                  {mfaError && (
                    <div style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                      {mfaError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'center' }}>
                    {/* SVG Rendered QR Code */}
                    <div 
                      style={{ 
                        background: 'white', padding: '16px', borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '180px', height: '180px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {qrCodeSvg && (
                        <img 
                          src={qrCodeSvg} 
                          alt="Scan QR Code" 
                          style={{ width: '100%', height: '100%', display: 'block' }} 
                        />
                      )}
                    </div>

                    <div style={{ flex: '1', minWidth: '240px' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Or manually enter this secret key:</span>
                        <code style={{ 
                          display: 'block', background: 'var(--bg-card)', padding: '8px 12px', 
                          borderRadius: '8px', marginTop: '4px', fontSize: '0.85rem', wordBreak: 'break-all',
                          border: '1px solid var(--border)', fontFamily: 'monospace'
                        }}>
                          {mfaSecret}
                        </code>
                      </div>

                      <form onSubmit={handleVerify2fa} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', display: 'block', marginBottom: '4px' }}>6-Digit Verification Code</label>
                          <input 
                            type="text" 
                            maxLength={6} 
                            placeholder="000 000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            required
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: '8px',
                              border: '1px solid var(--border)', background: 'var(--bg-card)',
                              color: 'var(--text-main)', fontSize: '1rem', letterSpacing: '2px', textAlign: 'center'
                            }}
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={verifyingMfa}
                          className="btn-primary" 
                          style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {verifyingMfa ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                          Verify & Activate
                        </button>
                      </form>

                      <button 
                        onClick={() => setShowMfaSetup(false)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--text-muted)',
                          fontSize: '0.85rem', cursor: 'pointer', marginTop: '12px', padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        Cancel Setup
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
