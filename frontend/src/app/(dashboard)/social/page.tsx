'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Clock, Image as ImageIcon, Facebook, Linkedin, Twitter, Instagram, UploadCloud, X } from 'lucide-react';
import { fetchAPI } from '@/lib/apiClient';

export default function SocialMediaPage() {
  const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Media Upload State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview Tab State
  const [activePreview, setActivePreview] = useState<string>('facebook');

  useEffect(() => {
    const loadData = async () => {
      try {
        const accRes = await fetchAPI('/social/accounts');
        setAccounts(accRes.accounts || []);
        
        const postsRes = await fetchAPI('/social/posts');
        setHistory(postsRes.posts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Removed the early return so the UI always renders.

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) 
        ? prev.filter(accId => accId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAccountIds.length === accounts.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(accounts.map(acc => acc.id));
    }
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAccountIds.length === 0) return alert("Please select at least one account.");
    if (!content && !mediaFile) return alert("Please add some text or media.");
    
    setLoading(true);
    let uploadedMediaUrl = '';

    try {
      // 1. Upload Media if exists
      if (mediaFile) {
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('media', mediaFile);
        
        const token = localStorage.getItem('sb-token') || '';
        const uploadRes = await fetch('http://localhost:5000/api/v1/social/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
        uploadedMediaUrl = uploadData.url;
        setUploadingMedia(false);
      }

      // 2. Publish Post
      const scheduledAt = scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00Z` : undefined;
      const res = await fetchAPI('/social/posts', {
        method: 'POST',
        body: JSON.stringify({ 
          content, 
          socialAccountIds: selectedAccountIds, 
          mediaUrls: uploadedMediaUrl ? [uploadedMediaUrl] : [],
          scheduledAt 
        })
      });
      alert(res.message);
      
      // Reset Form
      setContent(''); setSelectedAccountIds([]); setScheduledDate(''); setScheduledTime(''); clearMedia();
      
      // Refresh history
      const data = await fetchAPI('/social/posts');
      setHistory(data.posts || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Post Studio</h1>
        <p>Compose, preview, and publish across all networks.</p>
      </div>

      <div className="social-layout" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: EDITOR */}
        <div className="card editor-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {accounts.length === 0 ? (
            <div style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              You have not connected any social accounts yet. Please go to Settings to connect them.
            </div>
          ) : (
            <div className="platform-selector" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '24px', fontWeight: '500' }}
                onClick={selectAll}
              >
                {selectedAccountIds.length > 0 && selectedAccountIds.length === accounts.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {accounts.map(acc => {
                const Icon = acc.platform === 'facebook' ? Facebook : 
                             acc.platform === 'twitter' ? Twitter : 
                             acc.platform === 'linkedin' ? Linkedin : 
                             acc.platform === 'instagram' ? Instagram : Facebook;
                
                const isSelected = selectedAccountIds.includes(acc.id);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    className={`platform-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleAccount(acc.id)}
                    title={`Post to ${acc.accountName}`}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      padding: '8px 16px', width: 'auto', borderRadius: '24px',
                      background: isSelected ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: isSelected ? '#fff' : 'var(--text-main)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{acc.accountName}</span>
                  </button>
                );
              })}
            </div>
          )}

          <textarea 
            className="post-textarea"
            style={{ width: '100%', minHeight: '150px', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '1rem', resize: 'vertical' }}
            placeholder="What do you want to share with your audience?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Media Dropzone */}
          <div className="media-dropzone" style={{ border: '2px dashed var(--accent)', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'rgba(79, 70, 229, 0.05)' }}>
            <input 
              type="file" 
              accept="image/*,video/*"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              onChange={handleMediaChange}
              ref={fileInputRef}
            />
            {mediaPreviewUrl ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {mediaFile?.type.startsWith('video') ? (
                  <video src={mediaPreviewUrl} controls style={{ maxHeight: '150px', borderRadius: '8px', maxWidth: '100%' }} />
                ) : (
                  <img src={mediaPreviewUrl} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px' }} />
                )}
                <button 
                  onClick={(e) => { e.preventDefault(); clearMedia(); }}
                  style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer', zIndex: 10 }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--accent)' }}>
                <UploadCloud size={32} style={{ margin: '0 auto 10px' }} />
                <p style={{ color: 'var(--text-muted)' }}>Drag & drop images or videos here, or click to browse</p>
              </div>
            )}
          </div>

          <div className="schedule-section">
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-main)', fontWeight: '500' }}>Schedule for later (Optional)</label>
            <div className="datetime-inputs" style={{ display: 'flex', gap: '10px' }}>
              <input type="date" className="form-input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} style={{ flex: 1 }} />
              <input type="time" className="form-input" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={{ flex: 1 }} />
            </div>
          </div>

          <div className="publish-actions" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={handlePublish} className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }} disabled={loading || uploadingMedia}>
              {uploadingMedia ? 'Uploading Media...' : loading ? 'Processing...' : scheduledDate ? 'Schedule Post' : 'Publish Now'}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        {(() => {
          const activeAcc = accounts.find(acc => acc.platform.toLowerCase() === activePreview.toLowerCase());
          const pageName = activeAcc ? activeAcc.accountName : `Your ${activePreview.charAt(0).toUpperCase() + activePreview.slice(1)} Page`;
          const subTitle = activePreview === 'facebook' ? 'Just now • 🌍' :
                           activePreview === 'instagram' ? 'Just now • 📷' :
                           activePreview === 'linkedin' ? 'Promoted • 💼' :
                           `@${pageName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()} • 1m`;
          const avatarColor = activePreview === 'facebook' ? '#1877f2' : 
                              activePreview === 'instagram' ? '#e4405f' : 
                              activePreview === 'linkedin' ? '#0a66c2' : '#1da1f2';
          return (
            <div className="card preview-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                <h2>Live Mobile Preview</h2>
                <div className="preview-tabs" style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setActivePreview('facebook')} className={`icon-btn-inline ${activePreview === 'facebook' ? 'text-primary' : 'text-muted'}`}><Facebook size={18} /></button>
                  <button onClick={() => setActivePreview('instagram')} className={`icon-btn-inline ${activePreview === 'instagram' ? 'text-primary' : 'text-muted'}`}><Instagram size={18} /></button>
                  <button onClick={() => setActivePreview('linkedin')} className={`icon-btn-inline ${activePreview === 'linkedin' ? 'text-primary' : 'text-muted'}`}><Linkedin size={18} /></button>
                  <button onClick={() => setActivePreview('twitter')} className={`icon-btn-inline ${activePreview === 'twitter' ? 'text-primary' : 'text-muted'}`}><Twitter size={18} /></button>
                </div>
              </div>

              <div className="mobile-mockup" style={{ 
                width: '320px', 
                height: '568px', 
                margin: '0 auto', 
                border: '8px solid #2a2a2a', 
                borderRadius: '36px', 
                overflow: 'hidden',
                background: activePreview === 'facebook' ? '#ffffff' : activePreview === 'twitter' ? '#000000' : '#ffffff',
                color: activePreview === 'twitter' ? '#ffffff' : '#000000',
                position: 'relative'
              }}>
                {/* Mock Header (Fixed & Dynamic) */}
                <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(128,128,128,0.2)', background: 'inherit', zIndex: 2 }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: avatarColor, 
                    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' 
                  }}>
                    {pageName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{pageName}</div>
                    <div style={{ fontSize: '12px', color: 'gray' }}>{subTitle}</div>
                  </div>
                </div>
                
                {/* Scrollable Body Container */}
                <div style={{ height: '390px', overflowY: 'auto', paddingBottom: '30px' }}>
                  {/* Mock Content */}
                  <div style={{ padding: '15px', fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {content || <span style={{ color: 'gray', fontStyle: 'italic' }}>Your text will appear here...</span>}
                  </div>

                  {/* Mock Media */}
                  {mediaPreviewUrl && (
                    <div style={{ width: '100%', maxHeight: '300px', overflow: 'hidden', background: '#f0f0f0' }}>
                      {mediaFile?.type.startsWith('video') ? (
                        <video src={mediaPreviewUrl} controls style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                      ) : (
                        <img src={mediaPreviewUrl} alt="Preview" style={{ width: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Mock Footer (Fixed) */}
                <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '10px 15px', borderTop: '1px solid rgba(128,128,128,0.2)', display: 'flex', justifyContent: 'space-between', color: 'gray', background: 'inherit', zIndex: 2 }}>
                  <span>Like</span>
                  <span>Comment</span>
                  <span>Share</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* PUBLISHING HISTORY */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h2 style={{ marginBottom: '20px' }}>Publishing History & Scheduled Queue</h2>
        {history.length === 0 ? (
          <p className="text-muted">No posts found. Create one above to get started!</p>
        ) : (
          <div className="table-responsive">
            <table className="ads-table">
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Media</th>
                  <th>Channels</th>
                  <th>Scheduled/Published Time</th>
                  <th>Status</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {history.map(post => (
                  <tr key={post.id}>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={post.content || ''}>
                      {post.content || <span className="text-muted" style={{ fontStyle: 'italic' }}>Media Only</span>}
                    </td>
                    <td>
                      {post.mediaUrls && post.mediaUrls.length > 0 ? (
                        <img src={post.mediaUrls[0]} alt="Media" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>No Media</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {post.platforms.map((plat: string) => (
                          <span key={plat} className={`platform-tag ${plat.toLowerCase()}`} style={{ textTransform: 'capitalize', fontSize: '0.75rem', padding: '3px 8px' }}>
                            {plat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Immediate'}
                    </td>
                    <td>
                      <span className={`status-badge ${post.status.toLowerCase()}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
