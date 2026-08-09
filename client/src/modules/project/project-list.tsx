'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, Loader2, ChevronRight } from 'lucide-react';
import { useProjects } from '@/api/projects';
import type { Project } from '@/api/types';
import { Button } from '@/components/ui/button';

interface Props {
  workspaceId: string | null;
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
}

// Priority color dots
const PRIORITY_DOT: Record<string, string> = {
  URGENT:      'bg-red-400',
  HIGH:        'bg-orange-400',
  MEDIUM:      'bg-amber-400',
  LOW:         'bg-emerald-400',
  NO_PRIORITY: 'bg-slate-600',
};

// Status color indicator
const STATUS_RING: Record<string, string> = {
  ACTIVE:    'ring-emerald-500/40',
  ON_HOLD:   'ring-amber-500/40',
  ARCHIVED:  'ring-slate-600/40',
  COMPLETED: 'ring-amber-400/40',
};

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  onSelect: (id: string) => void;
}

const ProjectItem = React.memo(({ project, isActive, onSelect }: ProjectItemProps) => (
  <motion.button
    onClick={() => onSelect(project._id)}
    whileTap={{ scale: 0.98 }}
    className={`group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
      isActive
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
    }`}
  >
    {/* Color swatch + icon */}
    <div
      className={`flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center ring-2 ${
        STATUS_RING[project.status] ?? 'ring-gray-300'
      }`}
      style={{ backgroundColor: project.color ?? '#6366f1' }}
    >
      <FolderKanban className="h-3 w-3 text-white/80" />
    </div>

    {/* Name + identifier */}
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium truncate block">{project.name}</span>
      <span className="text-[10px] text-gray-400 font-mono">{project.identifier}</span>
    </div>

    {/* Priority dot */}
    <span
      className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${
        PRIORITY_DOT[project.priority] ?? 'bg-slate-600'
      }`}
    />

    {isActive && <ChevronRight className="h-3 w-3 text-amber-500 flex-shrink-0" />}
  </motion.button>
));

ProjectItem.displayName = 'ProjectItem';

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function ProjectList({ workspaceId, activeProjectId, onSelect, onCreateClick }: Props) {
  const { data: projects = [], isLoading, error } = useProjects(workspaceId);

  return (
    <div className="flex flex-col gap-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
          Projects
        </span>
        <Button
          onClick={onCreateClick}
          disabled={!workspaceId}
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-500 hover:text-slate-300 focus-visible:ring-0 cursor-pointer"
          title="New Project"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 text-slate-500 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading projects…
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col gap-2 px-3 py-2">
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <ChevronRight className="h-3.5 w-3.5" />
            Failed to load projects
          </div>
          <p className="text-[10px] text-slate-600 pl-5">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      )}

      {/* No workspace selected */}
      {!isLoading && !error && !workspaceId && (
        <p className="text-xs text-slate-600 px-3 py-2 select-none italic">
          Select a workspace first
        </p>
      )}

      {/* Empty */}
      {!isLoading && !error && workspaceId && projects.length === 0 && (
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-400 transition-colors text-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Create first project
        </button>
      )}

      {/* Project list */}
      {!isLoading && !error &&
        projects.map((project: Project) => (
          <ProjectItem
            key={project._id}
            project={project}
            isActive={project._id === activeProjectId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}
