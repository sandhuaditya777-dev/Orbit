"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { CheckSquare, Calendar, Users, AlertCircle, Flag } from "lucide-react";
import { useCreateTask } from "@/api/tasks";
import { useOrgMembers } from "@/api/organizations";
import { useUIStore } from "@/store/ui.store";
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
  projectId: string;
  workspaceId: string;
  statuses: string[];
}

interface FormValues {
  title: string;
  description: string;
  type: 'TASK' | 'BUG' | 'EPIC' | 'STORY';
  priority: 'NO_PRIORITY' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  dueDate: string;
  assigneeIds: string[];
}

const PRIORITIES = [
  { value: 'NO_PRIORITY', label: 'None',   dot: 'bg-slate-500',   style: 'bg-slate-500/10 text-slate-400 border-slate-500/30 hover:bg-slate-500/25' },
  { value: 'LOW',         label: 'Low',    dot: 'bg-emerald-400', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
  { value: 'MEDIUM',      label: 'Medium', dot: 'bg-amber-400',   style: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/25' },
  { value: 'HIGH',        label: 'High',   dot: 'bg-orange-400',  style: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/25' },
  { value: 'URGENT',      label: 'Urgent', dot: 'bg-red-400',    style: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/25' },
] as const;

const TASK_TYPES = [
  { value: 'TASK',  label: 'Task' },
  { value: 'BUG',   label: 'Bug' },
  { value: 'EPIC',  label: 'Epic' },
  { value: 'STORY', label: 'Story' },
] as const;

export default function CreateTaskDialog({
  open,
  onClose,
  projectId,
  workspaceId,
  statuses,
}: Props) {
  const { activeOrgId } = useUIStore();
  const { data: orgMembers = [] } = useOrgMembers(activeOrgId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      type: "TASK",
      priority: "MEDIUM",
      status: statuses[0] || "To Do",
      dueDate: "",
      assigneeIds: [],
    },
  });
  const { mutate, isPending, error: apiError } = useCreateTask();

  const onSubmit = (data: FormValues) => {
    mutate(
      {
        title: data.title.trim(),
        description: data.description.trim(),
        type: data.type,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate || undefined,
        assigneeIds: data.assigneeIds,
        projectId,
        workspaceId,
      },
      {
        onSuccess: () => {
          reset({
            title: "",
            description: "",
            type: "TASK",
            priority: "MEDIUM",
            status: statuses[0] || "To Do",
            dueDate: "",
            assigneeIds: [],
          });
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
      <DialogContent className="bg-white border border-gray-200 text-gray-900 sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-sm font-semibold text-gray-900">
                Create Task
              </DialogTitle>
              <DialogDescription className="text-[11px] text-gray-500">
                Define the scope and assignments for this item
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-gray-600">Task Title</label>
            <Input
              placeholder="e.g. Implement Auth Guard"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
              {...register("title", {
                required: "Task title is required",
                validate: (value) => !!value.trim() || "Task title cannot be empty",
              })}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-gray-600">Description <span className="text-gray-400">(optional)</span></label>
            <Textarea
              placeholder="Add more context..."
              rows={3}
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 resize-none"
              {...register("description")}
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Type
              </span>
              <select
                {...register("type")}
                className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-lg h-9 px-3 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </span>
              <select
                {...register("status")}
                className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-lg h-9 px-3 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {statuses.map((s) => (
                  <option key={s} value={s} className="bg-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority dropdown */}
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5" /> Priority
            </span>
            <select
              {...register("priority")}
              className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-lg h-9 px-3 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value} className="bg-white">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignees Selection */}
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Assignees
            </span>
            <Controller
              name="assigneeIds"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2 flex-wrap max-h-24 overflow-y-auto p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                  {orgMembers.map((member) => {
                    const user = member.user || { name: `User ${member.userId}`, avatar: "" };
                    const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    const isSelected = field.value.includes(member.userId);
                    return (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            field.onChange(field.value.filter(id => id !== member.userId));
                          } else {
                            field.onChange([...field.value, member.userId]);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-all ${
                          isSelected
                            ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                        }`}
                      >
                        <div className="h-4.5 w-4.5 rounded-full bg-amber-100 border border-white flex items-center justify-center text-[7px] font-bold text-amber-700 overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <span className="truncate max-w-[80px]">{user.name}</span>
                      </button>
                    );
                  })}
                  {orgMembers.length === 0 && (
                    <span className="text-xs text-gray-400 p-1 italic">No organization members found</span>
                  )}
                </div>
              )}
            />
          </div>

          {/* Due Date only */}
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" /> Due Date
            </span>
            <Input
              type="date"
              className="bg-white border-gray-200 text-gray-900"
              {...register("dueDate")}
            />
          </div>

          {apiError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {(apiError as Error).message}
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
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
              variant="default"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 border-0"
              disabled={isPending}
            >
              {isPending ? "Creating…" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
