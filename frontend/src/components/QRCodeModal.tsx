import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check } from 'lucide-react';
import { feedbackService } from '../services/feedback';

export interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl?: string;
  projectId?: string;
  slug: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  qrCodeUrl: initialQrUrl,
  projectId,
  slug,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>(initialQrUrl || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !initialQrUrl && projectId) {
      setLoading(true);
      feedbackService
        .getQRCode(projectId)
        .then((res) => {
          setQrUrl(res.qr_code_url);
        })
        .catch((err) => {
          console.error('Failed to load QR code:', err);
        })
        .finally(() => setLoading(false));
    } else if (initialQrUrl) {
      setQrUrl(initialQrUrl);
    }
  }, [isOpen, initialQrUrl, projectId]);

  if (!isOpen) return null;

  const publicUrl = `${window.location.origin}/feedback/${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ textAlign: 'center', maxWidth: '440px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <QrCode size={20} color="#10b981" />
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Share Feedback Form</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '20px',
          }}
        >
          Judges and hackathon participants can scan this QR code on their phone to access the public questionnaire directly.
        </p>

        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '16px',
            display: 'inline-block',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)',
            marginBottom: '20px',
          }}
        >
          {loading ? (
            <div
              style={{
                width: '220px',
                height: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '0.85rem',
              }}
            >
              Generating QR...
            </div>
          ) : qrUrl ? (
            <img
              src={qrUrl}
              alt="Feedback QR Code"
              style={{ width: '220px', height: '220px', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '220px',
                height: '220px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              QR code not ready
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              color: '#06b6d4',
              flex: 1,
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {publicUrl}
          </span>
          <button
            onClick={handleCopy}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <button onClick={onClose} className="btn-secondary" style={{ width: '100%' }}>
          Done
        </button>
      </div>
    </div>
  );
};
