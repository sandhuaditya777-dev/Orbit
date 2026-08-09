'use client';

import * as React from 'react';
import { ChevronDown, Plus, Check, FolderOpen } from 'lucide-react';
import { useWorkspaces } from '@/api/workspaces';
import type { Workspace } from '@/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  orgId: string | null;
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
}

export default function WorkspaceSwitcher({ orgId, activeWorkspaceId, onSelect, onCreateClick }: Props) {
  const { data: workspaces = [], isLoading } = useWorkspaces(orgId);

  const active = React.useMemo(
    () => workspaces.find((w) => w._id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId],
  );

  // Auto-select first workspace when org changes
  React.useEffect(() => {
    if (!activeWorkspaceId && workspaces.length > 0) {
      onSelect(workspaces[0]._id);
    }
  }, [workspaces, activeWorkspaceId, onSelect]);

  if (!orgId) {
    return (
      <div className="px-3 py-2 text-xs text-slate-500 italic">
        Select an organization first
      </div>
    );
  }

  return (
    <DropdownMenu>
      {/* base-ui Trigger renders as a native button — style it directly */}
      <DropdownMenuTrigger
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all text-left focus:outline-none select-none active:scale-[0.98] cursor-pointer data-popup-open:bg-slate-100 data-popup-open:border-slate-300"
      >
        <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
          <FolderOpen className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
          ) : (
            <span className="text-sm font-semibold text-slate-900 truncate block">
              {active?.name ?? 'Select Workspace'}
            </span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500 data-popup-open:rotate-180 transition-transform flex-shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-[240px] bg-white border-slate-200 shadow-lg"
      >
        {workspaces.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-500">No workspaces yet</div>
        ) : (
          workspaces.map((ws: Workspace) => (
            <DropdownMenuItem
              key={ws._id}
              onClick={() => onSelect(ws._id)}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-slate-700 focus:bg-slate-100 focus:text-slate-900"
            >
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm flex-1 truncate">{ws.name}</span>
              {ws._id === activeWorkspaceId && (
                <Check className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator className="bg-slate-200" />
        <DropdownMenuItem
          onClick={onCreateClick}
          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-slate-700 hover:text-slate-900 focus:bg-slate-100"
        >
          <div className="h-6 w-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Plus className="h-3 w-3 text-slate-500" />
          </div>
          <span className="text-sm font-medium">New Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
