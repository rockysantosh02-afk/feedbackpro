import React, { useState } from 'react';
import { X, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { feedbackService } from '../services/feedback';

export interface EmailInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  publicUrl?: string;
}

export const EmailInviteModal: React.FC<EmailInviteModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  publicUrl,
}) => {
  const [emailsText, setEmailsText] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const recipients = emailsText
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    if (recipients.length === 0) {
      setResult({ success: false, message: 'Please enter at least one valid email address.' });
      setLoading(false);
      return;
    }

    try {
      const res = await feedbackService.sendInvitations(projectId, recipients, customMsg);
      setResult({ success: true, message: res.message });
      setEmailsText('');
      setCustomMsg('');
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to send invitations.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={20} color="#10b981" />
            <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Send Email Invitations</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {result && (
          <div style={{
            background: result.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: result.success ? '#34d399' : '#fda4af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}>
            {result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {result.message}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Recipient Emails (comma or line separated, max 50)
            </label>
            <textarea
              className="input-field"
              rows={4}
              placeholder="judge1@mit.edu, mentor@hackathon.org&#10;peer@hackathon.ai"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Custom Note (Optional)
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Hi! Please test our live prototype and give us feedback before tomorrow's finals."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Send size={16} />
              {loading ? 'Sending...' : 'Send Invitations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
