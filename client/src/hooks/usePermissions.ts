'use client';

import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useOrgMembers, useOrganizations } from '@/api/organizations';
import { useWorkspace } from '@/api/workspaces';

export type Role = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER' | null;

export interface Permissions {
  orgRole: Role;
  wsRole: Role;
  isOrgOwner: boolean;
  isOrgManager: boolean;
  isOrgMember: boolean;
  isOrgViewer: boolean;
  isWsOwner: boolean;
  isWsManager: boolean;
  isWsMember: boolean;
  isWsViewer: boolean;
  canCreateWorkspace: boolean;
  canCreateProject: boolean;
  canInviteToWorkspace: boolean;
  canManageOrgMembers: boolean;
  canEditTasks: boolean;
  isReadOnly: boolean;
}

export function usePermissions(
  orgId: string | null,
  workspaceId: string | null,
): Permissions {
  const { user } = useAuthStore();
  const userId = user?.sub;

  const { data: orgs = [] } = useOrganizations();
  const { data: orgMembers = [] } = useOrgMembers(orgId);
  const { data: workspace } = useWorkspace(workspaceId);

  return useMemo(() => {
    if (!userId) {
      return {
        orgRole: null,
        wsRole: null,
        isOrgOwner: false,
        isOrgManager: false,
        isOrgMember: false,
        isOrgViewer: false,
        isWsOwner: false,
        isWsManager: false,
        isWsMember: false,
        isWsViewer: false,
        canCreateWorkspace: false,
        canCreateProject: false,
        canInviteToWorkspace: false,
        canManageOrgMembers: false,
        canEditTasks: false,
        isReadOnly: true,
      };
    }

    // Determine Org Role
    const currentOrg = orgs.find((o) => o._id === orgId);
    const orgMemberDoc = orgMembers.find((m) => m.userId === userId);
    let orgRole: Role = null;

    if (currentOrg && currentOrg.ownerId === userId) {
      orgRole = 'OWNER';
    } else if (orgMemberDoc) {
      orgRole = orgMemberDoc.role as Role;
    }

    const isOrgOwner = orgRole === 'OWNER';
    const isOrgManager = orgRole === 'MANAGER';
    const isOrgMember = orgRole === 'MEMBER';
    const isOrgViewer = orgRole === 'VIEWER';

    // Determine Workspace Role
    let wsRole: Role = null;
    if (workspace) {
      if (workspace.ownerId === userId) {
        wsRole = 'OWNER';
      } else {
        const wsMember = workspace.members?.find((m) => m.userId === userId);
        if (wsMember) {
          wsRole = wsMember.role as Role;
        } else if (isOrgOwner) {
          // Org owner automatically has owner privileges in workspaces
          wsRole = 'OWNER';
        } else if (isOrgManager) {
          // Org manager automatically has manager privileges in workspaces
          wsRole = 'MANAGER';
        }
      }
    }

    const isWsOwner = wsRole === 'OWNER';
    const isWsManager = wsRole === 'MANAGER';
    const isWsMember = wsRole === 'MEMBER';
    const isWsViewer = wsRole === 'VIEWER';

    // Computed capabilities
    const canCreateWorkspace = isOrgOwner || isOrgManager;
    const canCreateProject = isOrgOwner || isOrgManager || isWsOwner || isWsManager;
    const canInviteToWorkspace = isOrgOwner || isOrgManager || isWsOwner || isWsManager;
    const canManageOrgMembers = isOrgOwner || isOrgManager;
    const isReadOnly = (wsRole === 'VIEWER' || (orgRole === 'VIEWER' && !wsRole)) && !isOrgOwner && !isOrgManager;
    const canEditTasks = !isReadOnly;

    return {
      orgRole,
      wsRole,
      isOrgOwner,
      isOrgManager,
      isOrgMember,
      isOrgViewer,
      isWsOwner,
      isWsManager,
      isWsMember,
      isWsViewer,
      canCreateWorkspace,
      canCreateProject,
      canInviteToWorkspace,
      canManageOrgMembers,
      canEditTasks,
      isReadOnly,
    };
  }, [userId, orgId, orgs, orgMembers, workspace]);
}
