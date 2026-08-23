import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from './api-client';
import type { Workspace } from './types';

export interface WorkspaceInvite {
  _id: string;
  email: string;
  workspaceId: string;
  organizationId: string;
  workspaceName: string;
  role: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
  invitedBy: string;
  inviterName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

// ── Queries ──────────────────────────────────────────────

export function useWorkspaces(orgId: string | null) {
  return useQuery<Workspace[]>({
    queryKey: ['workspaces', orgId],
    queryFn: () => api.get<Workspace[]>(`/workspaces/org/${orgId}`),
    enabled: !!orgId,
  });
}

export function useWorkspace(id: string | null) {
  return useQuery<Workspace>({
    queryKey: ['workspace', id],
    queryFn: () => api.get<Workspace>(`/workspaces/${id}`),
    enabled: !!id,
  });
}

export function useIncomingInvites() {
  return useQuery<WorkspaceInvite[]>({
    queryKey: ['incoming-workspace-invites'],
    queryFn: () => api.get<WorkspaceInvite[]>('/workspaces/invites/incoming'),
    refetchInterval: 15000,
  });
}

export function useSentWorkspaceInvites(workspaceId: string | null) {
  return useQuery<WorkspaceInvite[]>({
    queryKey: ['sent-workspace-invites', workspaceId],
    queryFn: () => api.get<WorkspaceInvite[]>(`/workspaces/${workspaceId}/invites`),
    enabled: !!workspaceId,
  });
}

// ── Mutations ─────────────────────────────────────────────

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; organizationId: string; parentId?: string; description?: string }) =>
      api.post<Workspace>('/workspaces', data),
    onSuccess: (res, variables) => {
      qc.invalidateQueries({ queryKey: ['workspaces', variables.organizationId] });
      toast.success(`Workspace "${res.name}" created!`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create workspace: ${err.message}`);
    },
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      api.patch<Workspace>(`/workspaces/${id}`, data),
    onSuccess: (res, { id }) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      qc.invalidateQueries({ queryKey: ['workspace', id] });
      toast.success(`Workspace renamed to "${res.name}"!`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to rename workspace: ${err.message}`);
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted successfully.');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete workspace: ${err.message}`);
    },
  });
}

export function useInviteToWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      email,
      role,
      inviterName,
    }: {
      workspaceId: string;
      email: string;
      role?: string;
      inviterName?: string;
    }) =>
      api.post<{ message: string }>(`/workspaces/${workspaceId}/invite`, {
        email,
        role,
        inviterName,
      }),
    onSuccess: (res, { workspaceId }) => {
      qc.invalidateQueries({ queryKey: ['sent-workspace-invites', workspaceId] });
      toast.success(res.message || 'Invite sent!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send invite.');
    },
  });
}

export function useAcceptWorkspaceInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      api.post<Workspace>(`/workspaces/invites/${inviteId}/accept`, {}),
    onSuccess: (workspace) => {
      qc.invalidateQueries({ queryKey: ['incoming-workspace-invites'] });
      qc.invalidateQueries({ queryKey: ['organizations'] });
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success(`Joined workspace "${workspace.name}"!`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to accept invite: ${err.message}`);
    },
  });
}

export function useDeclineWorkspaceInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      api.post(`/workspaces/invites/${inviteId}/decline`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incoming-workspace-invites'] });
      toast.info('Invite declined');
    },
    onError: (err: Error) => {
      toast.error(`Failed to decline invite: ${err.message}`);
    },
  });
}

export function useCancelWorkspaceInvite(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/workspaces/invites/${inviteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sent-workspace-invites', workspaceId] });
      toast.success('Invite cancelled');
    },
    onError: (err: Error) => {
      toast.error(`Failed to cancel invite: ${err.message}`);
    },
  });
}
