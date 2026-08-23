import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api-client';
import type { Organization, OrganizationMember } from './types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrgInvite {
  _id: string;
  token: string;
  organizationId: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
  invitedBy: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

// ── API calls ────────────────────────────────────────────────────────────────

const orgsApi = {
  list: (): Promise<Organization[]> =>
    api.get<Organization[]>('/organizations'),
  getOne: (id: string): Promise<Organization> =>
    api.get<Organization>(`/organizations/${id}`),
  create: (dto: { name: string; description?: string; logoUrl?: string }): Promise<Organization> =>
    api.post<Organization>('/organizations', dto),
  update: (id: string, dto: Partial<{ name: string; description: string; logoUrl: string; settings: Record<string, unknown> }>): Promise<Organization> =>
    api.patch<Organization>(`/organizations/${id}`, dto),
  archive: (id: string): Promise<Organization> =>
    api.patch<Organization>(`/organizations/${id}/archive`, {}),
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/organizations/${id}`),

  // Members
  listMembers: (orgId: string): Promise<OrganizationMember[]> =>
    api.get<OrganizationMember[]>(`/organizations/${orgId}/members`),
  updateMember: (memberId: string, dto: { role: string }): Promise<OrganizationMember> =>
    api.patch<OrganizationMember>(`/organizations/members/${memberId}`, dto),
  removeMember: (memberId: string): Promise<void> =>
    api.delete<void>(`/organizations/members/${memberId}`),

  // Invites
  invite: (
    orgId: string,
    dto: { email: string; role?: string; inviterName?: string; orgName?: string },
  ): Promise<{ type: 'added' | 'invited'; message: string }> =>
    api.post(`/organizations/${orgId}/invite`, dto),
  acceptInvite: (token: string): Promise<Organization> =>
    api.post<Organization>('/organizations/invites/accept', { token }),
  listPendingInvites: (orgId: string): Promise<OrgInvite[]> =>
    api.get<OrgInvite[]>(`/organizations/${orgId}/invites`),
  cancelInvite: (inviteId: string): Promise<void> =>
    api.delete<void>(`/organizations/invites/${inviteId}`),
  resendInvite: (inviteId: string, inviterName?: string): Promise<void> =>
    api.post(`/organizations/invites/${inviteId}/resend`, { inviterName }),
};

// ── React Query hooks ────────────────────────────────────────────────────────

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: orgsApi.list,
  });
}

export function useOrganization(id: string | null) {
  return useQuery({
    queryKey: ['organizations', id],
    queryFn: () => orgsApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; description?: string; logoUrl?: string; settings?: Record<string, unknown> }) =>
      orgsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useArchiveOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgsApi.archive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: orgsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => orgsApi.listMembers(orgId!),
    enabled: !!orgId,
  });
}

export function useUpdateOrgMember(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      orgsApi.updateMember(memberId, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members', orgId] }),
  });
}

export function useRemoveOrgMember(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => orgsApi.removeMember(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-members', orgId] }),
  });
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { email: string; role?: string; inviterName?: string; orgName?: string }) =>
      orgsApi.invite(orgId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-members', orgId] });
      qc.invalidateQueries({ queryKey: ['org-invites', orgId] });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => orgsApi.acceptInvite(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

export function usePendingInvites(orgId: string | null) {
  return useQuery({
    queryKey: ['org-invites', orgId],
    queryFn: () => orgsApi.listPendingInvites(orgId!),
    enabled: !!orgId,
  });
}

export function useCancelInvite(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => orgsApi.cancelInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-invites', orgId] }),
  });
}

export function useResendInvite(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, inviterName }: { inviteId: string; inviterName?: string }) =>
      orgsApi.resendInvite(inviteId, inviterName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org-invites', orgId] }),
  });
}
