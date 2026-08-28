'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Orbit, LogOut, ChevronRight, Columns2, BarChart2, CalendarDays, UserPlus, Users, Mail,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useProject } from '@/api/projects';
import { useAuth0 } from '@auth0/auth0-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useOrganizations } from '@/api/organizations';
import { useWorkspaces, useWorkspace, useIncomingInvites } from '@/api/workspaces';
import { usePermissions } from '@/hooks/usePermissions';

import OrgSwitcher from '@/modules/org/org-switcher';
import WorkspaceSwitcher from '@/modules/workspace/workspace-switcher';
import CreateWorkspaceDialog from '@/modules/workspace/create-workspace-dialog';
import ProjectList from '@/modules/project/project-list';
import CreateProjectDialog from '@/modules/project/create-project-dialog';
import KanbanBoard from '@/modules/tasks/kanban-board';
import NotificationsBell from '@/modules/notifications/notifications-bell';
import CommandPalette from '@/modules/search/command-palette';
import AnalyticsPanel from '@/modules/project/analytics-panel';
import CalendarView from '@/modules/project/calendar-view';
import InviteMemberDialog from '@/modules/org/invite-member-dialog';
import OrgMembersPanel from '@/modules/org/org-members-panel';
import IncomingInvitesPanel from '@/modules/workspace/incoming-invites-panel';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import LoadingScreen from '@/modules/auth/LoadingScreen';
import ErrorScreen from '@/modules/auth/ErrorScreen';

export default function Home() {
  const { isAuthenticated, isLoading, error, loginWithRedirect, logout: auth0Logout, getAccessTokenSilently } = useAuth0();
  const { user, logout } = useAuthStore();
  const {
    activeOrgId, setActiveOrgId,
    activeWorkspaceId, activeProjectId,
    setActiveWorkspaceId, setActiveProjectId,
  } = useUIStore();

  const {
    canCreateWorkspace,
    canCreateProject,
    canInviteToWorkspace,
  } = usePermissions(activeOrgId, activeWorkspaceId);

  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [projDialogOpen, setProjDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [incomingInvitesOpen, setIncomingInvitesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'analytics' | 'calendar'>('kanban');

  // Health check
  const { data: healthData, error: healthError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/health`);
      if (!res.ok) throw new Error('API offline');
      return res.json();
    },
    retry: 1,
    refetchInterval: 20000,
  });

  const { data: orgs = [] } = useOrganizations();
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId);
  const { data: activeProject, isLoading: isProjectLoading, error: projectError } = useProject(activeProjectId);
  const { data: incomingInvites = [] } = useIncomingInvites();

  const handleLogout = () => {
    localStorage.removeItem('orbit_token');
    logout();
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  // Try silent auth first — only redirect to Auth0 login page if no session exists
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      getAccessTokenSilently()
        .catch(() => {
          loginWithRedirect();
        });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently]);

  if (error) return <ErrorScreen error={error} handleLogout={handleLogout} />;
  if (isLoading || !isAuthenticated) return <LoadingScreen />;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-white text-slate-700 overflow-hidden">

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <Sidebar className="border-r border-slate-200 bg-slate-50">

          {/* Logo */}
          <SidebarHeader className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <Orbit className="h-4 w-4 text-white" />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight">Orbit</span>
            </div>

            {/* Org Switcher */}
            <OrgSwitcher
              activeOrgId={activeOrgId}
              onSelect={(id) => {
                setActiveOrgId(id);
                setActiveWorkspaceId(null);
                setActiveProjectId(null);
              }}
            />
          </SidebarHeader>

          <SidebarContent className="flex flex-col gap-3 p-4">
            {/* Members & Invites shortcuts */}
            <div className="flex items-center gap-1.5">
              {activeOrgId && (
                <button
                  onClick={() => setMembersOpen(true)}
                  className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Users size={13} />
                  Members
                </button>
              )}

              {/* Incoming Invites Badge */}
              <button
                onClick={() => setIncomingInvitesOpen(true)}
                className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 text-xs font-medium transition-colors cursor-pointer"
                title="Incoming workspace invites"
              >
                <Mail size={13} />
                Invites
                {incomingInvites.length > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {incomingInvites.length}
                  </span>
                )}
              </button>
            </div>

            {/* Workspace Switcher */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
                Workspace
              </p>
              <WorkspaceSwitcher
                orgId={activeOrgId}
                activeWorkspaceId={activeWorkspaceId}
                onSelect={(id) => { setActiveWorkspaceId(id); setActiveProjectId(null); }}
                onCreateClick={() => setWsDialogOpen(true)}
              />
            </div>

            <SidebarSeparator />

            {/* Project List */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
                Projects
              </p>
              <ProjectList
                workspaceId={activeWorkspaceId}
                activeProjectId={activeProjectId}
                onSelect={setActiveProjectId}
                onCreateClick={() => setProjDialogOpen(true)}
              />
            </div>
          </SidebarContent>

          {/* User Card */}
          <SidebarFooter className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md">
                {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email ?? user?.roles?.[0]}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-red-400 focus-visible:ring-0 active:scale-95"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* ── MAIN CONTENT ──────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* Top Bar */}
          <header className="flex-shrink-0 flex items-center gap-3 px-5 h-14 border-b border-slate-200 bg-white/80 backdrop-blur">
            <SidebarTrigger className="h-8 w-8 text-slate-500 hover:text-slate-700 focus-visible:ring-0 active:scale-95 cursor-pointer" />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
              {activeProject && (
                <>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  <span className="text-slate-700 font-medium truncate">{activeProject.name}</span>
                </>
              )}
            </div>

            {/* View toggle (only when a project is active) */}
            {activeProjectId && (
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
                <button
                  id="view-kanban-btn"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Columns2 size={12} /> Kanban
                </button>
                <button
                  id="view-analytics-btn"
                  onClick={() => setViewMode('analytics')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'analytics'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BarChart2 size={12} /> Analytics
                </button>
                <button
                  id="view-calendar-btn"
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <CalendarDays size={12} /> Calendar
                </button>
              </div>
            )}

            {/* API Status + Notifications + Invite */}
            <div className="ml-auto flex items-center gap-2">
              <NotificationsBell />
              {activeWorkspaceId && canInviteToWorkspace && (
                <button
                  id="invite-member-btn"
                  onClick={() => setInviteOpen(true)}
                  title="Invite member to workspace"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-amber-600 hover:border-amber-500/30 text-xs font-medium transition-all cursor-pointer"
                >
                  <UserPlus size={13} /> Invite
                </button>
              )}
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
              {!activeProjectId ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="text-center max-w-sm">
                    {/* Glowing orb */}
                    <div className="relative mx-auto mb-6 h-24 w-24">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/20 blur-2xl" />
                      <div className="relative h-24 w-24 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <Orbit className="h-10 w-10 text-slate-400" />
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                      {!activeOrgId
                        ? 'Create your organization'
                        : !activeWorkspaceId
                        ? 'Select a workspace'
                        : 'Select a project'}
                    </h2>
                    <p className="text-sm text-slate-500 mb-5">
                      {!activeOrgId
                        ? 'Start by creating your organization from the sidebar.'
                        : !activeWorkspaceId
                        ? 'Choose or create a workspace to organize your projects.'
                        : 'Pick a project from the sidebar or create a new one.'}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${activeProjectId}-${viewMode}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full"
                >
                  {/* Loading state for project data */}
                  {isProjectLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="mb-4 h-12 w-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                          <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-slate-500">Loading project...</p>
                      </div>
                    </div>
                  ) : projectError ? (
                    /* Error state for project data */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center max-w-md">
                        <div className="mb-4 h-12 w-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                          <ChevronRight className="h-6 w-6 text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to load project</h3>
                        <p className="text-sm text-slate-500 mb-4">
                          {projectError instanceof Error ? projectError.message : 'An error occurred while loading the project'}
                        </p>
                        <Button
                          onClick={() => setActiveProjectId(null)}
                          variant="outline"
                          className="border-slate-200 hover:bg-slate-100"
                        >
                          Back to projects
                        </Button>
                      </div>
                    </div>
                  ) : activeProject ? (
                    /* Render project views */
                    <>
                      {viewMode === 'kanban' ? (
                        <KanbanBoard
                          projectId={activeProjectId}
                          workspaceId={activeWorkspaceId!}
                          projectName={activeProject.name}
                          statuses={activeProject.statuses ?? ['To Do', 'In Progress', 'In Review', 'Completed']}
                        />
                      ) : viewMode === 'analytics' ? (
                        <AnalyticsPanel
                          projectId={activeProjectId}
                          memberMap={{}}
                        />
                      ) : (
                        <CalendarView projectId={activeProjectId} />
                      )}
                    </>
                  ) : (
                    /* Fallback if project data is missing */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-sm text-slate-500">Project not found</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </ErrorBoundary>
          </main>
        </div>
      </div>

      {/* ── DIALOGS & PANELS ──────────────────────────────────────────── */}
      {activeOrgId && canCreateWorkspace && (
        <CreateWorkspaceDialog
          open={wsDialogOpen}
          onClose={() => setWsDialogOpen(false)}
          organizationId={activeOrgId}
          onCreated={(id) => setActiveWorkspaceId(id)}
        />
      )}

      {activeWorkspaceId && canCreateProject && (
        <CreateProjectDialog
          open={projDialogOpen}
          onClose={() => setProjDialogOpen(false)}
          workspaceId={activeWorkspaceId}
          organizationId={activeOrgId!}
          onCreated={(id) => setActiveProjectId(id)}
        />
      )}

      {activeWorkspaceId && activeWorkspace && canInviteToWorkspace && (
        <InviteMemberDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          workspaceId={activeWorkspaceId}
          workspaceName={activeWorkspace.name}
        />
      )}

      {activeOrgId && (() => {
        const activeOrg = orgs.find((o) => o._id === activeOrgId);
        const orgName = activeOrg?.name ?? 'your organization';
        return (
          <OrgMembersPanel
            open={membersOpen}
            onClose={() => setMembersOpen(false)}
            onInvite={() => { setMembersOpen(false); setInviteOpen(true); }}
            orgId={activeOrgId}
            orgName={orgName}
          />
        );
      })()}

      <IncomingInvitesPanel
        open={incomingInvitesOpen}
        onClose={() => setIncomingInvitesOpen(false)}
        onSelectWorkspace={(wsId, orgId) => {
          setActiveOrgId(orgId);
          setActiveWorkspaceId(wsId);
          setActiveProjectId(null);
        }}
      />
    </SidebarProvider>
  );
}
