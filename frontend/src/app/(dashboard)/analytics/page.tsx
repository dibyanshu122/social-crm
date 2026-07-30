'use client';

import { useEffect, useState } from 'react';
import { BarChart2, PieChart, Activity, TrendingUp, DollarSign, Target, Calendar } from 'lucide-react';
import { fetchAPI } from '@/lib/apiClient';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI('/social/analytics')
      .then(res => setData(res.analytics))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Construct dynamic channel data from live API
  const liveChannelData = [
    { name: 'Facebook', followers: data?.facebook?.followers || 0, activity: data?.facebook?.reach || 0 },
    { name: 'Instagram', followers: data?.instagram?.followers || 0, activity: data?.instagram?.comments || 0 },
    { name: 'LinkedIn', followers: data?.linkedin?.followers || 0, activity: data?.linkedin?.impressions || 0 },
    { name: 'Twitter', followers: data?.twitter?.followers || 0, activity: data?.twitter?.tweets || 0 },
  ];



  return (
    <>
      <div className="page-header">
        <h1>Social CRM Platform</h1>
      </div>

      {loading ? (
        <div className="loading-state">Fetching Live API Performance Metrics...</div>
      ) : (
        <>
          {/* TOP SUMMARY METRICS FROM REAL API */}
          <div className="dashboard-grid" style={{ marginBottom: '30px' }}>
            <div className="card">
              <div className="card-header">
                <h2>Facebook Page</h2>
                <div className="card-icon"><Activity size={20} /></div>
              </div>
              <div className="stat-value">{data?.facebook?.followers || 0}</div>
              <div className="stat-label" style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginTop: '4px', marginBottom: '4px' }}>Followers</div>
              <div className="stat-label">Page: {data?.facebook?.profile || 'Unknown Page'}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Instagram Business</h2>
                <div className="card-icon"><TrendingUp size={20} /></div>
              </div>
              <div className="stat-value">{data?.instagram?.followers || 0}</div>
              <div className="stat-label" style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginTop: '4px', marginBottom: '4px' }}>Followers</div>
              <div className="stat-label">{data?.instagram?.comments || 0} Media Posts Published</div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>LinkedIn Profile</h2>
                <div className="card-icon"><BarChart2 size={20} /></div>
              </div>
              <div className="stat-value">{data?.linkedin?.followers || 0}</div>
              <div className="stat-label" style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginTop: '4px', marginBottom: '4px' }}>Connections</div>
              <div className="stat-label">Account: {data?.linkedin?.profile || 'Unknown Account'}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Twitter / X</h2>
                <div className="card-icon"><PieChart size={20} /></div>
              </div>
              <div className="stat-value">{data?.twitter?.followers || 0}</div>
              <div className="stat-label" style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginTop: '4px', marginBottom: '4px' }}>Followers</div>
              <div className="stat-label">Account: {data?.twitter?.profile || 'Unknown Account'}</div>
            </div>
          </div>

          {/* INTERACTIVE CHARTS SECTION */}
          <div className="social-layout" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
            
            {/* LIVE CHANNEL FOLLOWERS & ACTIVITY BAR CHART */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ marginBottom: '15px' }}>Live Channel Followers & Activity</h2>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={liveChannelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="followers" fill="#3b82f6" name="Followers / Connections" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="activity" fill="#22c55e" name="Posts / Activity" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              <DollarSign size={40} style={{ marginBottom: '16px', color: 'var(--text-dim)' }} />
              <h2 style={{ marginBottom: '8px' }}>Live Ad Spend Trend ($)</h2>
              <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>Connect your Ad accounts and launch campaigns to view live spend and conversion trends.</p>
            </div>

          </div>
        </>
      )}
    </>
  );
}
