'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, UserPlus, Clock, MoreHorizontal, Trash2, RefreshCw,
  Shield, ChevronDown, Crown, Eye, User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useOrgMembers,
  usePendingInvites,
  useUpdateOrgMember,
  useRemoveOrgMember,
  useCancelInvite,
  useResendInvite,
} from '@/api/organizations';
import type { OrganizationMember } from '@/api/types';
import type { OrgInvite } from '@/api/organizations';
import { useAuthStore } from '@/store/auth.store';

// ── Role helpers ─────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  OWNER:   { label: 'Owner',   icon: <Crown   size={11} />, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  MANAGER: { label: 'Manager', icon: <Shield  size={11} />, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  MEMBER:  { label: 'Member',  icon: <User    size={11} />, color: 'text-gray-600 bg-gray-50 border-gray-200' },
  VIEWER:  { label: 'Viewer',  icon: <Eye     size={11} />, color: 'text-purple-600 bg-purple-50 border-purple-200' },
};

const ASSIGNABLE_ROLES = ['MANAGER', 'MEMBER', 'VIEWER'] as const;

// ── Subcomponents ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META['MEMBER'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function Avatar({ name, avatar, email, size = 8 }: { name?: string; avatar?: string; email?: string; size?: number }) {
  // Use name, fall back to email prefix, fall back to ?
  const displayName = name ?? email ?? '?';
  if (avatar && !avatar.includes('dicebear')) {
    return (
      <img
        src={avatar}
        alt={displayName}
        className={`h-${size} w-${size} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`h-${size} w-${size} rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Role dropdown ─────────────────────────────────────────────────────────────

function RoleDropdown({
  memberId,
  currentRole,
  canEdit,
  orgId,
}: {
  memberId: string;
  currentRole: string;
  canEdit: boolean;
  orgId: string;
}) {
  const [open, setOpen] = useState(false);
  const { mutate: updateMember, isPending } = useUpdateOrgMember(orgId);

  if (!canEdit || currentRole === 'OWNER') return <RoleBadge role={currentRole} />;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1 cursor-pointer"
      >
        <RoleBadge role={currentRole} />
        <ChevronDown size={11} className="text-gray-400" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-36"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    updateMember({ memberId, role: r }, {
                      onSuccess: () => { toast.success(`Role updated to ${r}`); setOpen(false); },
                      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to update role'),
                    });
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50 transition-colors ${currentRole === r ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}
                >
                  {ROLE_META[r]?.icon}
                  {ROLE_META[r]?.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  canManage,
  currentUserId,
  orgId,
}: {
  member: OrganizationMember;
  canManage: boolean;
  currentUserId: string;
  orgId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { mutate: removeMember, isPending } = useRemoveOrgMember(orgId);
  const isYou = member.userId === currentUserId;

  const handleRemove = () => {
    if (!confirm(`Remove ${member.user?.name ?? 'this member'} from the organization?`)) return;
    removeMember(member._id, {
      onSuccess: () => toast.success('Member removed'),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to remove member'),
    });
    setMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl">
      <Avatar name={member.user?.name} avatar={member.user?.avatar} email={member.user?.email} size={9} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {member.user?.email ?? member.userId}
          {isYou && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(you)</span>}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {member.user?.name ?? <span className="italic text-gray-300">Profile loading…</span>}
        </p>
      </div>

      <RoleDropdown
        memberId={member._id}
        currentRole={member.role}
        canEdit={canManage && !isYou}
        orgId={orgId}
      />

      {canManage && !isYou && member.role !== 'OWNER' && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <MoreHorizontal size={15} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-40"
                >
                  <button
                    onClick={handleRemove}
                    disabled={isPending}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Remove member
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ── Pending invite row ────────────────────────────────────────────────────────

function InviteRow({
  invite,
  orgId,
  inviterName,
}: {
  invite: OrgInvite;
  orgId: string;
  inviterName?: string;
}) {
  const { mutate: cancel, isPending: cancelling } = useCancelInvite(orgId);
  const { mutate: resend, isPending: resending } = useResendInvite(orgId);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl">
      <div className="h-9 w-9 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
        <Clock size={14} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 truncate">{invite.email}</p>
        <p className="text-xs text-gray-400">
          Invite pending · <RoleBadge role={invite.role} /> · expires in {daysLeft}d
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() =>
            resend({ inviteId: invite._id, inviterName }, {
              onSuccess: () => toast.success('Invite resent'),
              onError:   () => toast.error('Failed to resend'),
            })
          }
          disabled={resending}
          title="Resend invite"
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() =>
            cancel(invite._id, {
              onSuccess: () => toast.success('Invite cancelled'),
              onError:   () => toast.error('Failed to cancel'),
            })
          }
          disabled={cancelling}
          title="Cancel invite"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  orgId:    string;
  orgName:  string;
  open:     boolean;
  onClose:  () => void;
  onInvite: () => void;
}

export default function OrgMembersPanel({ orgId, orgName, open, onClose, onInvite }: Props) {
  const { user } = useAuthStore();
  const { data: members = [], isLoading: membersLoading } = useOrgMembers(open ? orgId : null);
  const { data: invites = [],  isLoading: invitesLoading } = usePendingInvites(open ? orgId : null);
  const [tab, setTab] = useState<'members' | 'invites'>('members');

  const currentMember = members.find((m) => m.userId === user?.sub);
  const canManage = currentMember?.role === 'OWNER' || currentMember?.role === 'MANAGER';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
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
                  <Users size={15} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{orgName}</p>
                  <p className="text-[11px] text-gray-400">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                    {invites.length > 0 && ` · ${invites.length} pending`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {canManage && (
                  <button
                    onClick={onInvite}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <UserPlus size={13} />
                    Invite
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5">
              {(['members', 'invites'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-1 py-3 mr-5 text-xs font-semibold border-b-2 transition-colors cursor-pointer capitalize ${
                    tab === t
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t === 'members' ? <Users size={12} /> : <Clock size={12} />}
                  {t}
                  {t === 'invites' && invites.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold">
                      {invites.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3">
              {tab === 'members' && (
                <>
                  {membersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                            <div className="h-2.5 w-36 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <Users size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">No members yet</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {members.map((m) => (
                        <MemberRow
                          key={m._id}
                          member={m}
                          canManage={canManage}
                          currentUserId={user?.sub ?? ''}
                          orgId={orgId}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {tab === 'invites' && (
                <>
                  {invitesLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-9 w-9 rounded-full bg-gray-100 animate-pulse" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                            <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : invites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                      <Clock size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">No pending invites</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {invites.map((inv) => (
                        <InviteRow
                          key={inv._id}
                          invite={inv}
                          orgId={orgId}
                          inviterName={user?.name}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!canManage && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  Only Owners and Managers can invite or remove members
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
