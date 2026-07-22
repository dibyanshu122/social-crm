'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Download, Search, Plus, Filter, Mail, Phone, Calendar, CheckCircle2, Clock, X, Loader2 } from 'lucide-react';
import { fetchAPI } from '@/lib/apiClient';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add Lead Modal
  const [showModal, setShowModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadPlatform, setNewLeadPlatform] = useState('facebook');
  const [newLeadNotes, setNewLeadNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLeads = async () => {
    try {
      const res = await fetchAPI('/leads');
      setLeads(res.leads || []);
    } catch (err) {
      console.error('Failed to load leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      await fetchAPI(`/leads/${leadId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch (err: any) {
      alert(err.message || 'Failed to update lead status');
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/v1/leads/export/csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to download CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'crm_leads_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadEmail) return alert('Name and Email are required.');

    setSaving(true);
    try {
      await fetchAPI('/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: newLeadName,
          email: newLeadEmail,
          phone: newLeadPhone,
          platform: newLeadPlatform,
          notes: newLeadNotes
        })
      });
      setShowModal(false);
      setNewLeadName('');
      setNewLeadEmail('');
      setNewLeadPhone('');
      setNewLeadNotes('');
      await loadLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (l.phone && l.phone.includes(searchQuery));
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'NEW').length;
  const convertedCount = leads.filter(l => l.status === 'CONVERTED').length;
  const conversionRate = totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : '0';

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>CRM Leads Manager</h1>
          <p>Track, manage, and convert leads generated from Facebook & Meta Lead Ads.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={handleExportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>
            <Download size={18} /> Export CSV
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}>
            <Plus size={18} /> Add Lead
          </button>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
        <div className="card">
          <div className="card-header">
            <h2>Total Leads</h2>
            <div className="card-icon"><UserCheck size={20} /></div>
          </div>
          <div className="stat-value">{totalLeads}</div>
          <div className="stat-label">All time captured</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2>New Leads</h2>
            <div className="card-icon"><Clock size={20} /></div>
          </div>
          <div className="stat-value">{newLeadsCount}</div>
          <div className="stat-label">Pending follow-up</div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2>Conversion Rate</h2>
            <div className="card-icon"><CheckCircle2 size={20} /></div>
          </div>
          <div className="stat-value">{conversionRate}%</div>
          <div className="stat-label">{convertedCount} Converted Customers</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '8px 14px', borderRadius: '10px', flex: 1, minWidth: '240px', border: '1px solid var(--border)' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search leads by name, email, or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', outline: 'none', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading CRM Leads...</div>
        ) : filteredLeads.length === 0 ? (
          <p className="text-muted">No leads found matching your criteria.</p>
        ) : (
          <div className="table-responsive">
            <table className="ads-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Contact Info</th>
                  <th>Source Platform</th>
                  <th>Form Name</th>
                  <th>Notes</th>
                  <th>Date Captured</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id}>
                    <td className="fw-600">{lead.name}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={12} /> {lead.email}</span>
                        {lead.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)' }}><Phone size={12} /> {lead.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`platform-tag ${lead.platform.toLowerCase()}`}>
                        {lead.platform}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lead.formName || 'Lead Form'}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lead.notes || ''}>
                      {lead.notes || '-'}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <select 
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                        style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold',
                          background: lead.status === 'NEW' ? 'rgba(59, 130, 246, 0.15)' : lead.status === 'CONTACTED' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          color: lead.status === 'NEW' ? '#3b82f6' : lead.status === 'CONTACTED' ? '#eab308' : '#22c55e',
                          border: 'none', cursor: 'pointer'
                        }}
                      >
                        <option value="NEW" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>NEW</option>
                        <option value="CONTACTED" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>CONTACTED</option>
                        <option value="CONVERTED" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>CONVERTED</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Add Lead Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '480px', padding: '24px', position: 'relative',
            background: 'var(--bg-card)', borderRadius: '16px'
          }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '8px' }}>Add New Lead</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Manually enter lead information into your CRM.</p>

            <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Lead Name</label>
                <input type="text" placeholder="e.g. Ramesh Kumar" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Email Address</label>
                <input type="email" placeholder="ramesh@example.com" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input type="text" placeholder="+91 98765 43210" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Source Platform</label>
                <select value={newLeadPlatform} onChange={(e) => setNewLeadPlatform(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                  <option value="facebook">Facebook Lead Ads</option>
                  <option value="instagram">Instagram Direct</option>
                  <option value="google">Google Ads</option>
                  <option value="linkedin">LinkedIn InMail</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Notes / Requirements</label>
                <textarea placeholder="Client looking for enterprise pricing..." value={newLeadNotes} onChange={(e) => setNewLeadNotes(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)', minHeight: '80px' }} />
              </div>

              <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: '10px', padding: '12px' }}>
                {saving ? 'Saving Lead...' : 'Save Lead'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
