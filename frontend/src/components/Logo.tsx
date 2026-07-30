import React from 'react';

export default function Logo({ size = 'normal', showText = true }: { size?: 'normal' | 'large', showText?: boolean }) {
  const iconSize = size === 'large' ? '48px' : '32px';
  const dotSize = size === 'large' ? '14px' : '9px';
  const gap = size === 'large' ? '4px' : '2px';
  
  return (
    <div className="brand-logo-container" style={{ display: 'flex', alignItems: 'center', gap: size === 'large' ? '16px' : '12px' }}>
      <div className="brand-icon" style={{
        width: iconSize, height: iconSize, borderRadius: size === 'large' ? '12px' : '8px',
        background: 'transparent',
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center',
        padding: size === 'large' ? '6px' : '4px', gap: gap,
        flexShrink: 0
      }}>
        <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#3b82f6' }}></div>
        <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#3b82f6' }}></div>
        <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#22c55e' }}></div>
        <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#22c55e' }}></div>
      </div>
      
      {showText && (
        <div className="brand-text-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="brand-text" style={{ 
            fontSize: size === 'large' ? '1.8rem' : '1.1rem', 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            color: 'var(--text)', 
            whiteSpace: 'nowrap',
            lineHeight: 1.2
          }}>
            <span style={{ color: '#3b82f6' }}>DOT</span> <span style={{ color: '#22c55e' }}>DOMINO</span>
          </div>
          <div className="brand-sub" style={{ 
            fontSize: size === 'large' ? '0.85rem' : '0.7rem', 
            color: 'var(--text-muted)', 
            fontWeight: 600, 
            letterSpacing: '0.05em', 
            textTransform: 'uppercase', 
            whiteSpace: 'nowrap',
            marginTop: '2px'
          }}>
            SOCIAL CRM PLATFORM
          </div>
        </div>
      )}
    </div>
  );
}
