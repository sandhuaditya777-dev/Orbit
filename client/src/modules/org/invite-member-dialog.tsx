'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Send, Loader2, CheckCircle2, UserPlus, ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useInviteToWorkspace } from '@/api/workspaces';

const ROLES = [
  { value: 'MEMBER',  label: 'Member',  desc: 'Can view and work on projects & tasks' },
  { value: 'MANAGER', label: 'Manager', desc: 'Can invite members, manage projects' },
  { value: 'VIEWER',  label: 'Viewer',  desc: 'Read-only access' },
] as const;

type Role = typeof ROLES[number]['value'];

interface Props {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onClose: () => void;
}

export default function InviteMemberDialog({ workspaceId, workspaceName, open, onClose }: Props) {
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [roleOpen, setRoleOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const { mutate: invite, isPending } = useInviteToWorkspace();

  const handleClose = () => {
    setEmail('');
    setRole('MEMBER');
    setSent(false);
    onClose();
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Use current user's computed display name
    const inviterName = user?.name || 'A team member';

    invite(
      {
        workspaceId,
        email: email.trim(),
        role,
        inviterName,
      },
      {
        onSuccess: () => {
          setSent(true);
        },
      },
    );
  };

  const selectedRole = ROLES.find((r) => r.value === role)!;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                    <p className="text-sm font-semibold text-gray-900">Invite to {workspaceName}</p>
                    <p className="text-[11px] text-gray-500">
                      Invitee will receive an email &amp; in-app notification
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                {sent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-6 text-center"
                  >
                    <div className="p-4 rounded-full bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    </div>
                    <p className="text-gray-900 font-semibold">Invitation Sent!</p>
                    <p className="text-gray-500 text-sm max-w-xs">
                      We sent an invitation to <span className="font-semibold text-gray-700">{email}</span> to join <span className="font-semibold text-gray-700">{workspaceName}</span>.
                    </p>
                    <button
                      onClick={() => {
                        setEmail('');
                        setSent(false);
                      }}
                      className="mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Invite another team member
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={send} className="flex flex-col gap-4">
                    {/* Email */}
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

                    {/* Role picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-600">Role</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setRoleOpen(!roleOpen)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-amber-300 transition-colors text-sm text-gray-800 cursor-pointer"
                        >
                          <span className="font-medium">{selectedRole.label}</span>
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <span className="text-xs">{selectedRole.desc}</span>
                            <ChevronDown size={13} className={`transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {roleOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.12 }}
                              className="absolute top-full mt-1 left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                            >
                              {ROLES.map((r) => (
                                <button
                                  key={r.value}
                                  type="button"
                                  onClick={() => {
                                    setRole(r.value);
                                    setRoleOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-amber-50 transition-colors ${
                                    role === r.value ? 'bg-amber-50' : ''
                                  }`}
                                >
                                  <span
                                    className={`text-sm font-medium ${
                                      role === r.value ? 'text-amber-700' : 'text-gray-800'
                                    }`}
                                  >
                                    {r.label}
                                  </span>
                                  <span className="text-xs text-gray-400">{r.desc}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isPending || !email}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                      {isPending ? 'Sending…' : 'Send Invitation'}
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
