import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Share2,
  QrCode,
  Mail,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  Globe,
  Settings,
  HelpCircle,
  BarChart3,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { feedbackService, FeedbackForm, FeedbackQuestion } from '../services/feedback';
import { projectService, Project } from '../services/projects';
import { QRCodeModal } from '../components/QRCodeModal';
import { EmailInviteModal } from '../components/EmailInviteModal';

export const FeedbackBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals
  const [showQR, setShowQR] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [focusArea, setFocusArea] = useState('General Usability & Technical Health');

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [formData, projData] = await Promise.all([
        feedbackService.getForm(projectId),
        projectService.getProject(projectId),
      ]);
      setForm(formData);
      setProject(projData);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback form');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!id) return;
    setGenerating(true);
    setError(null);
    try {
      const updatedForm = await feedbackService.generateWithAI(id, focusArea);
      setForm(updatedForm);
      setShowAIOptions(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions with AI');
    } finally {
      setGenerating(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!id || !form) return;
    setActionLoading(true);
    try {
      if (form.status === 'published') {
        const res = await feedbackService.unpublish(id);
        setForm(res);
      } else {
        const res = await feedbackService.publish(id);
        setForm(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update form status');
    } finally {
      setActionLoading(false);
    }
  };

  const copyPublicUrl = () => {
    if (!form) return;
    const url = `${window.location.origin}/feedback/${form.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'rating':
      case 'rating_1_5':
      case 'rating_1_10':
        return 'badge-info';
      case 'nps':
        return 'badge-primary';
      case 'yes_no':
      case 'boolean':
        return 'badge-success';
      case 'multiple_choice':
      case 'checkbox':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-md w-full">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading questionnaire builder...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel p-8 text-center max-w-md w-full border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Form</h2>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <button onClick={() => id && loadData(id)} className="btn btn-primary w-full">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isPublished = form?.status === 'published';
  const publicUrl = form ? `${window.location.origin}/feedback/${form.slug}` : '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link to="/dashboard" className="hover:text-cyan-400 transition-colors">Projects</Link>
            <span>/</span>
            <Link to={`/projects/${id}`} className="hover:text-cyan-400 transition-colors">{project?.name || 'Project'}</Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Questionnaire Builder</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            Feedback Questionnaire
            <span className={`badge ${isPublished ? 'badge-success' : 'badge-neutral'}`}>
              {isPublished ? 'Live & Published' : 'Draft Mode'}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-generated questions customized specifically for {project?.name} ({project?.event_name}).
          </p>
        </div>

        {/* Quick Tabs to Audit / Analytics / Reports */}
        <div className="flex items-center gap-2">
          <Link to={`/projects/${id}/audit`} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Audit
          </Link>
          <Link to={`/projects/${id}/analytics`} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Analytics
          </Link>
          <Link to={`/projects/${id}/report`} className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400" />
            Health Report
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Control Banner: AI Generator & Publish Status */}
      <div className="glass-panel p-6 rounded-2xl flex flex-wrap items-center justify-between gap-6 border-slate-700/50">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            AI Survey Intelligence
          </h3>
          <p className="text-slate-400 text-sm">
            Generate balanced questionnaires targeting usability, performance, accessibility, and judge rubric criteria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAIOptions(!showAIOptions)}
            disabled={generating}
            className="btn btn-primary flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? 'Synthesizing Questions...' : 'AI Generate Questions'}
          </button>

          <button
            onClick={handleTogglePublish}
            disabled={actionLoading}
            className={`btn ${isPublished ? 'btn-secondary border-amber-500/40 text-amber-300 hover:bg-amber-500/10' : 'btn-success'} flex items-center gap-2`}
          >
            {isPublished ? (
              <>Unpublish Form</>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Publish to Public
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Focus Area Selector Drawer */}
      {showAIOptions && (
        <div className="glass-panel p-6 rounded-2xl border-cyan-500/30 animate-fadeIn space-y-4">
          <h4 className="text-white font-semibold text-sm">Customize AI Generation Focus:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: 'General & Judge Rubric', desc: 'Holistic feedback covering UX, presentation, and technical innovation.' },
              { title: 'Usability & Accessibility', desc: 'Focuses on user friction, layout, mobile responsiveness, and readability.' },
              { title: 'Technical Architecture & Security', desc: 'In-depth questions on reliability, API speed, and trust.' },
            ].map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => setFocusArea(preset.title)}
                className={`p-4 rounded-xl text-left border transition-all ${
                  focusArea === preset.title
                    ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 hover:border-slate-700 text-slate-300 bg-slate-900/30'
                }`}
              >
                <div className="font-semibold text-sm mb-1">{preset.title}</div>
                <div className="text-xs text-slate-400">{preset.desc}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowAIOptions(false)}
              className="btn btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Generating...' : 'Confirm & Generate'}
            </button>
          </div>
        </div>
      )}

      {/* Sharing & Distribution Bar (if published or preview) */}
      <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
            <Share2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Shareable Public URL</div>
            <div className="text-slate-200 text-sm font-mono truncate max-w-md">
              {publicUrl}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyPublicUrl}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Copy Public Link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={() => setShowQR(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="View QR Code"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            QR Code
          </button>

          <button
            onClick={() => setShowInvite(true)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Send Email Invites"
          >
            <Mail className="w-4 h-4 text-cyan-400" />
            Email Invites
          </button>

          {form?.slug && (
            <a
              href={`/feedback/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary text-xs flex items-center gap-1.5 border-slate-700 hover:border-slate-600"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              Live Preview
            </a>
          )}
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Form Questions</h2>
            <p className="text-xs text-slate-400">
              {form?.questions?.length || 0} questions configured. Respondents answer directly via the public portal.
            </p>
          </div>
        </div>

        {form?.questions && form.questions.length > 0 ? (
          <div className="space-y-4">
            {form.questions.map((question, index) => (
              <div
                key={question.id || index}
                className="glass-panel p-5 rounded-xl border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold flex items-center justify-center border border-slate-700">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-base font-semibold text-white leading-snug">
                        {question.prompt}
                      </h4>
                      {question.description && (
                        <p className="text-xs text-slate-400 mt-1">{question.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${getTypeBadgeClass(question.question_type)} uppercase text-[10px]`}>
                      {question.question_type.replace('_', ' ')}
                    </span>
                    {question.is_required && (
                      <span className="badge badge-warning text-[10px]">Required</span>
                    )}
                  </div>
                </div>

                {/* Question Type Specific Previews */}
                <div className="pl-9 pt-1">
                  {['rating', 'rating_1_5', 'rating_1_10'].includes(question.question_type) && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Scale: 1 ({question.min_label || 'Poor'})</span>
                      <span className="text-slate-600">→</span>
                      <span>5 ({question.max_label || 'Excellent'})</span>
                    </div>
                  )}

                  {question.question_type === 'nps' && (
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <div
                          key={num}
                          className="w-7 h-7 rounded border border-slate-800 bg-slate-900/50 flex items-center justify-center text-[11px] font-mono text-slate-400"
                        >
                          {num}
                        </div>
                      ))}
                    </div>
                  )}

                  {['multiple_choice', 'checkbox', 'single_choice', 'multi_choice'].includes(question.question_type) && (
                    <div className="flex flex-wrap gap-2">
                      {question.options && question.options.length > 0 ? (
                        question.options.map((opt, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300"
                          >
                            {opt.label || opt.value}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No options defined</span>
                      )}
                    </div>
                  )}

                  {['short_text', 'long_text'].includes(question.question_type) && (
                    <div className="w-full max-w-md h-8 rounded border border-slate-800/60 bg-slate-900/30 px-3 flex items-center text-xs text-slate-600">
                      Respondent open-ended response...
                    </div>
                  )}

                  {['yes_no', 'boolean'].includes(question.question_type) && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
                        Yes
                      </span>
                      <span className="px-3 py-1 rounded bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
                        No
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel p-12 text-center rounded-2xl border-dashed border-slate-800 space-y-4">
            <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Questions Added Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Click &ldquo;AI Generate Questions&rdquo; to automatically build an optimized survey tailored to {project?.name}&rsquo;s tech stack, category, and hackathon goals.
            </p>
            <button
              onClick={() => setShowAIOptions(true)}
              className="btn btn-primary inline-flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Generate Questions with AI
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {id && (
        <QRCodeModal
          isOpen={showQR}
          projectId={id}
          slug={form?.slug || ''}
          onClose={() => setShowQR(false)}
        />
      )}

      {id && (
        <EmailInviteModal
          isOpen={showInvite}
          projectId={id}
          projectName={project?.name || 'Project'}
          publicUrl={publicUrl}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
};
