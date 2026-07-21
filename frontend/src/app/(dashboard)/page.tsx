'use client';

import { Megaphone, Activity, Users, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/apiClient';

export default function DashboardHome() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Fetch analytics to aggregate metrics
        const { analytics } = await fetchAPI('/social/analytics');
        // Fetch posts for scheduling count
        const { posts } = await fetchAPI('/social/posts');
        
        let totalReach = 0;
        if (analytics) {
          totalReach += (analytics.facebook?.reach || 0);
          totalReach += (analytics.instagram?.reach || 0);
          totalReach += (analytics.linkedin?.impressions || 0);
          totalReach += (analytics.twitter?.impressions || 0);
        }

        const scheduledPosts = posts?.filter((p: any) => p.status === 'SCHEDULED').length || 0;

        // Fetch ad campaigns & analytics dynamically
        const { accounts: adAccs } = await fetchAPI('/ads/accounts');
        let activeAdsCount = 0;
        let totalCtrSum = 0;
        let adAccCount = 0;

        for (const acc of adAccs || []) {
          const { campaigns: campData } = await fetchAPI(`/ads/accounts/${acc.id}/campaigns`);
          if (campData) {
            activeAdsCount += campData.filter((c: any) => c.status === 'ACTIVE').length;
          }

          const { analytics: adAnalytics } = await fetchAPI(`/ads/accounts/${acc.id}/analytics`);
          if (adAnalytics && adAnalytics.ctr) {
            const ctrVal = parseFloat(adAnalytics.ctr.replace('%', ''));
            if (!isNaN(ctrVal)) {
              totalCtrSum += ctrVal;
              adAccCount++;
            }
          }
        }

        const avgCtr = adAccCount > 0 ? (totalCtrSum / adAccCount).toFixed(1) + '%' : '0%';

        setMetrics({
          reach: totalReach,
          scheduled: scheduledPosts,
          activeAds: activeAdsCount,
          avgCtr: avgCtr
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Overview</h1>
        <p>Monitor your organic reach and paid campaigns across all platforms.</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading Dashboard...</div>
      ) : (
        <div className="dashboard-grid">
          <div className="card">
            <div className="card-header">
              <h2>Total Audience Reach</h2>
              <div className="card-icon"><Users size={20} /></div>
            </div>
            <div className="stat-value">{metrics?.reach?.toLocaleString() || 0}</div>
            <div className="stat-label">Aggregated from all networks</div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Scheduled Posts</h2>
              <div className="card-icon"><Megaphone size={20} /></div>
            </div>
            <div className="stat-value">{metrics?.scheduled || 0}</div>
            <div className="stat-label">Awaiting publication</div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Active Ad Campaigns</h2>
              <div className="card-icon"><Activity size={20} /></div>
            </div>
            <div className="stat-value">{metrics?.activeAds || 0}</div>
            <div className="stat-label">Running campaigns</div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Average CTR</h2>
              <div className="card-icon"><TrendingUp size={20} /></div>
            </div>
            <div className="stat-value">{metrics?.avgCtr || '0%'}</div>
            <div className="stat-label">Across active ads</div>
          </div>
        </div>
      )}
    </>
  );
}
