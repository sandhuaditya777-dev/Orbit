'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Check, Trash2, Loader2, Sparkles, Building2 } from 'lucide-react';
import {
  useIncomingInvites,
  useAcceptWorkspaceInvite,
  useDeclineWorkspaceInvite,
  type WorkspaceInvite,
} from '@/api/workspaces';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectWorkspace?: (workspaceId: string, orgId: string) => void;
}

export default function IncomingInvitesPanel({ open, onClose, onSelectWorkspace }: Props) {
  const { data: invites = [], isLoading } = useIncomingInvites();
  const { mutate: acceptInvite, isPending: isAccepting } = useAcceptWorkspaceInvite();
  const { mutate: declineInvite, isPending: isDeclining } = useDeclineWorkspaceInvite();

  const handleAccept = (invite: WorkspaceInvite) => {
    acceptInvite(invite._id, {
      onSuccess: (workspace) => {
        if (onSelectWorkspace) {
          onSelectWorkspace(workspace._id, workspace.organizationId);
        }
        if (invites.length <= 1) {
          onClose();
        }
      },
    });
  };

  const handleDecline = (inviteId: string) => {
    declineInvite(inviteId);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 z-[60] w-full max-w-sm bg-white border-l border-gray-200 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-50">
                  <Mail size={16} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Incoming Invites</p>
                  <p className="text-[11px] text-gray-400">
                    {invites.length} pending workspace invitation{invites.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="space-y-3 pt-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 animate-pulse space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-48 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : invites.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">No pending invites</p>
                  <p className="text-xs text-gray-400 max-w-xs">
                    When someone invites you to a workspace, it will show up right here.
                  </p>
                </div>
              ) : (
                invites.map((invite) => (
                  <motion.div
                    key={invite._id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-amber-300 transition-all flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                          <Building2 size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{invite.workspaceName}</p>
                          <p className="text-[11px] text-gray-500">
                            Invited by <span className="font-semibold text-gray-700">{invite.inviterName}</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                        {invite.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => handleAccept(invite)}
                        disabled={isAccepting || isDeclining}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isAccepting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(invite._id)}
                        disabled={isAccepting || isDeclining}
                        className="py-2 px-3 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-600 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Decline invite"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
