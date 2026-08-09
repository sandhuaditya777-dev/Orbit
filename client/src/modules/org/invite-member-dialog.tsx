'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Send, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/api/api-client';
import { toast } from 'sonner';

interface Props {
  orgId:    string;
  orgName:  string;
  open:     boolean;
  onClose:  () => void;
}

export default function InviteMemberDialog({ orgId, orgName, open, onClose }: Props) {
  const { user } = useAuthStore();
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleClose = () => { setEmail(''); setStatus('idle'); onClose(); };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      await api.post(`/organizations/${orgId}/invite`, {
        email:       email.trim(),
        orgName,
        inviterName: user?.name ?? 'A team member',
      });
      setStatus('done');
      toast.success(`Invite sent to ${email}`);
    } catch {
      setStatus('idle');
      toast.error('Failed to send invite. Check your mail config.');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md mx-4"
          >
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-50">
                    <UserPlus size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Invite to {orgName}</p>
                    <p className="text-[11px] text-gray-500">They'll receive an email with a join link</p>
                  </div>
                </div>
                <button onClick={handleClose} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {status === 'done' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-6 text-center"
                  >
                    <div className="p-4 rounded-full bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    </div>
                    <p className="text-gray-900 font-semibold">Invite Sent!</p>
                    <p className="text-gray-500 text-sm">An invitation email was dispatched to <span className="text-gray-700 font-medium">{email}</span></p>
                    <button
                      onClick={() => { setEmail(''); setStatus('idle'); }}
                      className="mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Send another invite
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={send} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600" htmlFor="invite-email">
                        Email address
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition-colors">
                        <Mail size={14} className="text-gray-400 flex-shrink-0" />
                        <input
                          id="invite-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="colleague@company.com"
                          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      id="send-invite-btn"
                      type="submit"
                      disabled={status === 'loading' || !email}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {status === 'loading'
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Send size={14} />
                      }
                      {status === 'loading' ? 'Sending…' : 'Send Invitation'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
