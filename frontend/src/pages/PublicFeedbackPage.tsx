import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Star,
  Send,
  User,
  Mail,
  Award,
  Users,
  Compass,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { feedbackService, FeedbackForm, FeedbackQuestion } from '../services/feedback';

export const PublicFeedbackPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [responseId, setResponseId] = useState<string | null>(null);

  // Form Submission State
  const [respondentRole, setRespondentRole] = useState<'Participant' | 'Judge' | 'Mentor' | 'Organizer' | 'Visitor'>('Visitor');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Answers keyed by question ID
  const [answers, setAnswers] = useState<{
    [questionId: string]: {
      numeric_value?: number;
      text_value?: string;
      selected_options?: string[];
    };
  }>({});

  useEffect(() => {
    if (slug) {
      loadPublicForm(slug);
    }
  }, [slug]);

  const loadPublicForm = async (formSlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getPublicForm(formSlug);
      setForm(data);
    } catch (err: any) {
      setError(err.message || 'This feedback questionnaire could not be loaded or has been closed.');
    } finally {
      setLoading(false);
    }
  };

  const handleNumericChange = (questionId: string, val: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        numeric_value: val,
      },
    }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_value: text,
      },
    }));
  };

  const handleSingleOptionChange = (questionId: string, optionValue: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_options: [optionValue],
      },
    }));
  };

  const handleMultiOptionToggle = (questionId: string, optionValue: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.selected_options || [];
      const updated = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selected_options: updated,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !form) return;

    // Validate required questions
    for (const q of form.questions || []) {
      if (q.is_required) {
        const ans = answers[q.id];
        const hasNumeric = ans?.numeric_value !== undefined && ans?.numeric_value !== null;
        const hasText = ans?.text_value && ans.text_value.trim().length > 0;
        const hasOptions = ans?.selected_options && ans.selected_options.length > 0;

        if (!hasNumeric && !hasText && !hasOptions) {
          setError(`Please answer the required question: "${q.prompt}"`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    const submissionAnswers = (form.questions || []).map((q) => {
      const ans = answers[q.id] || {};
      return {
        question_id: q.id,
        numeric_value: ans.numeric_value,
        text_value: ans.text_value,
        selected_options: ans.selected_options,
      };
    });

    try {
      const res: any = await feedbackService.submitPublicResponse(slug, {
        respondent_name: isAnonymous ? undefined : respondentName,
        respondent_email: isAnonymous ? undefined : respondentEmail,
        is_anonymous: isAnonymous,
        answers: submissionAnswers,
        honeypot: honeypot || undefined,
      });

      setResponseId(res.response_id || 'Recorded');
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass-panel p-8 text-center max-w-sm w-full">
          <div className="spinner mx-auto mb-4" />
          <p className="text-slate-300 font-medium text-sm">Loading feedback questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass-panel p-8 text-center max-w-md w-full border-red-500/30">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Questionnaire Unavailable</h2>
          <p className="text-slate-400 mb-6 text-sm">{error}</p>
          <p className="text-xs text-slate-500">
            This form might be closed by the project team or temporarily paused.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="glass-panel p-8 text-center max-w-md w-full border-emerald-500/30 animate-fadeIn space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-1">Feedback Submitted!</h2>
            <p className="text-slate-300 text-sm">
              Thank you for providing structured evaluation for{' '}
              <strong className="text-cyan-400">{form?.project?.name || 'this project'}</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Event:</span>
              <span className="text-slate-200 font-medium">{form?.project?.event_name || 'Hackathon'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Status:</span>
              <span className="text-emerald-400 font-medium">Recorded & Correlated</span>
            </div>
            {responseId && (
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Receipt:</span>
                <span className="text-slate-300 truncate max-w-[150px]">{responseId}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Your feedback will be combined with automated passive technical audits to help the team build a stronger product.
          </p>

          <button
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
            }}
            className="btn btn-secondary w-full text-xs"
          >
            Submit Another Response
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header Card */}
        <div className="glass-panel p-8 rounded-2xl border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="badge badge-info text-xs tracking-wider uppercase">
              {form?.project?.event_name || 'Hackathon Showcase'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Project Evaluation
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {form?.title || `${form?.project?.name} Feedback`}
            </h1>
            {form?.description && (
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">{form.description}</p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Project: <strong className="text-slate-200">{form?.project?.name}</strong></span>
            <span>Estimated time: 2 mins</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Honeypot field (hidden from legitimate users, catches naive bots) */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input
              type="text"
              name="hp_field"
              tabIndex={-1}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Respondent Profile / Role Selector */}
          <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              Your Role in the Hackathon
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['Judge', 'Mentor', 'Participant', 'Organizer', 'Visitor'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRespondentRole(role)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                    respondentRole === role
                      ? 'border-cyan-400 bg-cyan-950/40 text-white shadow-md shadow-cyan-500/10'
                      : 'border-slate-800 hover:border-slate-700 text-slate-400 bg-slate-900/30'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>Submit anonymously</span>
              </label>

              <span className="text-[11px] text-slate-500">
                {isAnonymous ? 'No identifying info stored' : 'Contact info shared with team'}
              </span>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-fadeIn">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Jane Doe"
                    className="input-field text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Your Email</label>
                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Questions */}
          <div className="space-y-6">
            {(form?.questions || []).map((q, index) => {
              const currentAns = answers[q.id] || {};

              return (
                <div
                  key={q.id}
                  className="glass-panel p-6 rounded-2xl border-slate-800/80 space-y-4 hover:border-slate-700/80 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        Question {index + 1}
                      </span>
                      {q.is_required && (
                        <span className="text-[11px] text-amber-400 font-semibold">* Required</span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white leading-snug">
                      {q.prompt}
                    </h4>
                    {q.description && (
                      <p className="text-xs text-slate-400 mt-1">{q.description}</p>
                    )}
                  </div>

                  {/* Rating 1-5 */}
                  {['rating', 'rating_1_5'].includes(q.question_type) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between max-w-sm">
                        {[1, 2, 3, 4, 5].map((score) => {
                          const isSelected = currentAns.numeric_value === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleNumericChange(q.id, score)}
                              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-base transition-all ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105'
                                  : 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                              }`}
                            >
                              <span>{score}</span>
                              <Star className={`w-3 h-3 ${isSelected ? 'fill-slate-950' : 'text-slate-600'}`} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between max-w-sm text-[11px] text-slate-500 px-1">
                        <span>{q.min_label || 'Needs Work'}</span>
                        <span>{q.max_label || 'Exceptional'}</span>
                      </div>
                    </div>
                  )}

                  {/* Rating 1-10 */}
                  {q.question_type === 'rating_1_10' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                          const isSelected = currentAns.numeric_value === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleNumericChange(q.id, score)}
                              className={`h-11 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 px-1">
                        <span>{q.min_label || '1 - Poor'}</span>
                        <span>{q.max_label || '10 - Best in Show'}</span>
                      </div>
                    </div>
                  )}

                  {/* NPS 0-10 */}
                  {q.question_type === 'nps' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-11 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                          const isSelected = currentAns.numeric_value === score;
                          let activeClass = 'bg-cyan-500 text-slate-950';
                          if (score <= 6) activeClass = 'bg-red-500 text-white';
                          else if (score <= 8) activeClass = 'bg-amber-500 text-slate-950';
                          else activeClass = 'bg-emerald-500 text-slate-950';

                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleNumericChange(q.id, score)}
                              className={`h-11 rounded-md flex items-center justify-center font-bold text-xs transition-all ${
                                isSelected
                                  ? `${activeClass} shadow-md scale-105`
                                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 px-1">
                        <span>0 - Not likely at all</span>
                        <span>10 - Extremely likely</span>
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice / Single Choice */}
                  {['multiple_choice', 'single_choice'].includes(q.question_type) && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt) => {
                        const isSelected = currentAns.selected_options?.includes(opt.value);
                        return (
                          <button
                            key={opt.id || opt.value}
                            type="button"
                            onClick={() => handleSingleOptionChange(q.id, opt.value)}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between text-sm transition-all ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-950/30 text-white font-medium shadow-sm'
                                : 'border-slate-800 bg-slate-900/30 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-cyan-400 bg-cyan-400' : 'border-slate-700'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Checkbox / Multi Choice */}
                  {['checkbox', 'multi_choice'].includes(q.question_type) && (
                    <div className="space-y-2">
                      {(q.options || []).map((opt) => {
                        const isSelected = currentAns.selected_options?.includes(opt.value);
                        return (
                          <button
                            key={opt.id || opt.value}
                            type="button"
                            onClick={() => handleMultiOptionToggle(q.id, opt.value)}
                            className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between text-sm transition-all ${
                              isSelected
                                ? 'border-cyan-400 bg-cyan-950/30 text-white font-medium shadow-sm'
                                : 'border-slate-800 bg-slate-900/30 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected ? 'border-cyan-400 bg-cyan-400 text-slate-950' : 'border-slate-700'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Yes / No */}
                  {['yes_no', 'boolean'].includes(q.question_type) && (
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                      {['Yes', 'No'].map((opt) => {
                        const isSelected = currentAns.selected_options?.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSingleOptionChange(q.id, opt)}
                            className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                              isSelected
                                ? opt === 'Yes'
                                  ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200'
                                  : 'border-red-400 bg-red-950/40 text-red-200'
                                : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Text */}
                  {q.question_type === 'short_text' && (
                    <div>
                      <input
                        type="text"
                        value={currentAns.text_value || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        placeholder="Type your response..."
                        maxLength={500}
                        className="input-field text-sm"
                      />
                      <div className="text-right text-[10px] text-slate-600 mt-1">
                        {(currentAns.text_value || '').length}/500
                      </div>
                    </div>
                  )}

                  {/* Long Text */}
                  {q.question_type === 'long_text' && (
                    <div>
                      <textarea
                        value={currentAns.text_value || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        placeholder="Share your detailed impressions, friction points, or suggestions..."
                        rows={4}
                        maxLength={3000}
                        className="input-field text-sm"
                      />
                      <div className="text-right text-[10px] text-slate-600 mt-1">
                        {(currentAns.text_value || '').length}/3000
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button & Security Note */}
          <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full py-3.5 text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20"
            >
              {submitting ? (
                <>
                  <div className="spinner w-5 h-5" />
                  Submitting Feedback...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Project Feedback
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Sanitized & anti-injection protected submission via FeedbackPro Zero-Trust</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
