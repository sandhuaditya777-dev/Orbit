'use client';

import { useForm } from 'react-hook-form';
import { FolderOpen } from 'lucide-react';
import { useCreateWorkspace } from '@/api/workspaces';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onCreated: (id: string) => void;
}

interface FormValues {
  name: string;
  description?: string;
}

export default function CreateWorkspaceDialog({ open, onClose, organizationId, onCreated }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', description: '' },
  });
  const { mutate, isPending, error: apiError } = useCreateWorkspace();

  const onSubmit = (data: FormValues) => {
    mutate(
      {
        name: data.name.trim(),
        description: data.description?.trim(),
        organizationId,
      },
      {
        onSuccess: (ws) => {
          reset();
          onCreated(ws._id);
          onClose();
        },
      },
    );
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-white border border-slate-200 text-slate-900 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-sm font-semibold text-slate-900">
                Create Workspace
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500">
                A shared hub for your team's projects
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">Workspace Name</label>
            <Input
              placeholder="e.g. Engineering"
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
              {...register('name', {
                required: 'Workspace name is required',
                validate: (value) => !!value.trim() || 'Workspace name cannot be empty',
              })}
            />
            {errors.name && (
              <p className="text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <Input
              placeholder="What is this workspace for?"
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
              {...register('description')}
            />
          </div>

          {apiError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {(apiError as Error).message}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900"
              disabled={isPending}
            >
              {isPending ? 'Creating…' : 'Create Workspace'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
