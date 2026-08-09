"use client";

import { useForm, Controller } from "react-hook-form";
import { FolderKanban } from "lucide-react";
import { useCreateProject } from "@/api/projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  organizationId: string;
  onCreated: (id: string) => void;
}

interface FormValues {
  name: string;
  description: string;
  color: string;
  priority: string;
}

const COLORS = [
  '#f59e0b', '#f97316', '#ec4899', '#ef4444',
  '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#6366f1', '#64748b',
];

const PRIORITIES = [
  { value: 'NO_PRIORITY', label: 'None',   dot: 'bg-gray-400' },
  { value: 'LOW',         label: 'Low',    dot: 'bg-emerald-400' },
  { value: 'MEDIUM',      label: 'Medium', dot: 'bg-amber-400' },
  { value: 'HIGH',        label: 'High',   dot: 'bg-orange-400' },
  { value: 'URGENT',      label: 'Urgent', dot: 'bg-red-400' },
];

export default function CreateProjectDialog({
  open,
  onClose,
  workspaceId,
  organizationId,
  onCreated,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', description: '', color: '#f59e0b', priority: 'NO_PRIORITY' },
  });

  const { mutate, isPending, error: apiError } = useCreateProject();
  const selectedColor = watch('color');

  const onSubmit = (data: FormValues) => {
    mutate(
      {
        name: data.name.trim(),
        description: data.description.trim(),
        color: data.color,
        priority: data.priority,
        workspaceId,
        organizationId,
      },
      {
        onSuccess: (project) => {
          reset();
          onCreated(project._id);
          onClose();
        },
      },
    );
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-white border border-gray-200 text-gray-900 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: selectedColor }}
            >
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-sm font-semibold text-gray-900">
                Create Project
              </DialogTitle>
              <DialogDescription className="text-[11px] text-gray-500">
                Scoped to the current workspace
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-gray-600">Project Name</label>
            <Input
              placeholder="e.g. Sprint Alpha"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register("name", {
                required: "Project name is required",
                validate: (v) => !!v.trim() || "Cannot be empty",
              })}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-gray-600">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <Textarea
              placeholder="What is this project about?"
              rows={2}
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none"
              {...register("description")}
            />
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-gray-600">Color</label>
            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => field.onChange(c)}
                      className={`h-6 w-6 rounded-lg transition-all ${
                        field.value === c
                          ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-gray-600">Priority</label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <div className="flex gap-1.5 flex-wrap">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => field.onChange(p.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        field.value === p.value
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {apiError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {(apiError as Error).message}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 text-white"
              style={{ backgroundColor: selectedColor }}
              disabled={isPending}
            >
              {isPending ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
