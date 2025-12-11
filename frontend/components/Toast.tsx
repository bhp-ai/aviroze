'use client';

import { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />;
      case 'error':
        return <AlertCircle className="w-5 h-5" style={{ color: '#dc2626' }} />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" style={{ color: '#d97706' }} />;
      case 'info':
        return <Info className="w-5 h-5" style={{ color: '#2563eb' }} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' };
      case 'error':
        return { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' };
      case 'warning':
        return { backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e' };
      case 'info':
        return { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' };
    }
  };

  const styles = getStyles();

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        border: `2px solid ${styles.borderColor}`,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        minWidth: '320px',
        maxWidth: '28rem',
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        animation: 'slide-in 0.3s ease-out',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{getIcon()}</div>
      <p style={{ flex: 1, fontSize: '14px', fontWeight: 500, lineHeight: '1.5', wordBreak: 'break-word' }}>
        {message}
      </p>
      <button
        onClick={() => onClose(id)}
        style={{
          flexShrink: 0,
          marginTop: '2px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.7,
          transition: 'opacity 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
