'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Orbit, LogOut, ChevronRight, Columns2, BarChart2, CalendarDays, UserPlus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useProject } from '@/api/projects';
import { useAuth0 } from '@auth0/auth0-react';

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
import ThemeToggle from '@/modules/ui/theme-toggle';
import InviteMemberDialog from '@/modules/org/invite-member-dialog';
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
  const { isAuthenticated, isLoading, error, loginWithRedirect, logout: auth0Logout } = useAuth0();
  const { user, logout } = useAuthStore();
  const {
    activeOrgId, setActiveOrgId,
    activeWorkspaceId, activeProjectId,
    setActiveWorkspaceId, setActiveProjectId,
  } = useUIStore();

  const [wsDialogOpen, setWsDialogOpen] = useState(false);
  const [projDialogOpen, setProjDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
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

  const { data: activeProject } = useProject(activeProjectId);

  const handleLogout = () => {
    localStorage.removeItem('orbit_token');
    logout();
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  };

  // Redirect to Auth0 login automatically if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (error) return <ErrorScreen error={error} handleLogout={handleLogout} />;
  if (isLoading || !isAuthenticated) return <LoadingScreen />;



  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">

        {/* ── SIDEBAR ─────────────────────────────────────────── */}
        <Sidebar className="border-r border-slate-800 bg-slate-900/80">

          {/* Logo */}
          <SidebarHeader className="p-4 border-b border-slate-800/60">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <Orbit className="h-4 w-4 text-white" />
              </div>
              <span className="font-extrabold text-white tracking-tight">Orbit</span>
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
          <SidebarFooter className="border-t border-slate-800/60 p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md">
                {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
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
          <header className="flex-shrink-0 flex items-center gap-3 px-5 h-14 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <SidebarTrigger className="h-8 w-8 text-slate-500 hover:text-slate-300 focus-visible:ring-0 active:scale-95 cursor-pointer" />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
              {activeProject && (
                <>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  <span className="text-slate-300 font-medium truncate">{activeProject.name}</span>
                </>
              )}
            </div>

            {/* Search */}
            {activeWorkspaceId && (
              <CommandPalette
                workspaceId={activeWorkspaceId}
                onSelectProject={(id) => setActiveProjectId(id)}
              />
            )}

            {/* View toggle (only when a project is active) */}
            {activeProjectId && (
              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/50 p-0.5 gap-0.5">
                <button
                  id="view-kanban-btn"
                  onClick={() => setViewMode('kanban')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'kanban'
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Columns2 size={12} /> Kanban
                </button>
                <button
                  id="view-analytics-btn"
                  onClick={() => setViewMode('analytics')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'analytics'
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <BarChart2 size={12} /> Analytics
                </button>
                <button
                  id="view-calendar-btn"
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-slate-800 text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <CalendarDays size={12} /> Calendar
                </button>
              </div>
            )}

            {/* API Status + Notifications + Theme */}
            <div className="ml-auto flex items-center gap-2">
              <NotificationsBell />
              <ThemeToggle />
              {activeOrgId && (
                <button
                  id="invite-member-btn"
                  onClick={() => setInviteOpen(true)}
                  title="Invite team member"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 text-xs font-medium transition-all cursor-pointer"
                >
                  <UserPlus size={13} /> Invite
                </button>
              )}
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto p-6">
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
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 blur-2xl" />
                      <div className="relative h-24 w-24 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                        <Orbit className="h-10 w-10 text-slate-600" />
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">
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
                  {viewMode === 'kanban' ? (
                    <KanbanBoard
                      projectId={activeProjectId}
                      workspaceId={activeWorkspaceId!}
                      projectName={activeProject?.name ?? 'Project'}
                      statuses={activeProject?.statuses ?? ['To Do', 'In Progress', 'In Review', 'Completed']}
                    />
                  ) : viewMode === 'analytics' ? (
                    <AnalyticsPanel
                      projectId={activeProjectId}
                      memberMap={{}}
                    />
                  ) : (
                    <CalendarView projectId={activeProjectId} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ── DIALOGS ──────────────────────────────────────────── */}
      {activeOrgId && (
        <CreateWorkspaceDialog
          open={wsDialogOpen}
          onClose={() => setWsDialogOpen(false)}
          organizationId={activeOrgId}
          onCreated={(id) => setActiveWorkspaceId(id)}
        />
      )}

      {activeWorkspaceId && (
        <CreateProjectDialog
          open={projDialogOpen}
          onClose={() => setProjDialogOpen(false)}
          workspaceId={activeWorkspaceId}
          organizationId={activeOrgId!}
          onCreated={(id) => setActiveProjectId(id)}
        />
      )}

      {activeOrgId && (
        <InviteMemberDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          orgId={activeOrgId}
          orgName={"your organization"}
        />
      )}
    </SidebarProvider>
  );
}
