'use client';

import * as React from 'react';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { useOrganizations, useCreateOrganization } from '@/api/organizations';
import type { Organization } from '@/api/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';

interface Props {
  activeOrgId: string | null;
  onSelect: (id: string) => void;
}

interface FormValues {
  name: string;
  description?: string;
}

export default function OrgSwitcher({ activeOrgId, onSelect }: Props) {
  const { data: orgs = [], isLoading } = useOrganizations();
  const { mutate: createOrg, isPending } = useCreateOrganization();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: '', description: '' },
  });

  const activeOrg = React.useMemo(
    () => orgs.find((o) => o._id === activeOrgId) ?? null,
    [orgs, activeOrgId],
  );

  // Auto-select first org on load
  React.useEffect(() => {
    if (!activeOrgId && orgs.length > 0) {
      onSelect(orgs[0]._id);
    }
  }, [orgs, activeOrgId, onSelect]);

  const onSubmit = (data: FormValues) => {
    createOrg(
      { name: data.name.trim(), description: data.description?.trim() },
      {
        onSuccess: (org) => {
          reset();
          setDialogOpen(false);
          onSelect(org._id);
        },
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-300 transition-all text-left focus:outline-none select-none active:scale-[0.98] cursor-pointer data-popup-open:bg-amber-50 data-popup-open:border-amber-300"
        >
          <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
            {activeOrg?.logoUrl ? (
              <img src={activeOrg.logoUrl} alt="" className="h-5 w-5 rounded object-cover" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              <span className="text-sm font-semibold text-gray-800 truncate block">
                {activeOrg?.name ?? 'Select Organization'}
              </span>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 data-popup-open:rotate-180 transition-transform flex-shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-[240px] bg-white border-gray-200 shadow-xl"
        >
          {orgs.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">No organizations yet</div>
          ) : (
            orgs.map((org: Organization) => (
              <DropdownMenuItem
                key={org._id}
                onClick={() => onSelect(org._id)}
                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-gray-700 focus:bg-amber-50 focus:text-gray-900"
              >
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm flex-1 truncate">{org.name}</span>
                {org._id === activeOrgId && (
                  <Check className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator className="bg-gray-100" />
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer text-gray-600 hover:text-gray-900 focus:bg-amber-50"
          >
            <div className="h-6 w-6 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Plus className="h-3 w-3 text-gray-500" />
            </div>
            <span className="text-sm font-medium">New Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Organization Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { reset(); setDialogOpen(false); } }}>
        <DialogContent className="bg-white border border-gray-200 text-gray-900 sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-gray-900">
                  Create Organization
                </DialogTitle>
                <DialogDescription className="text-[11px] text-gray-500">
                  Your top-level team or company space
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">Organization Name</label>
              <Input
                placeholder="e.g. Acme Corp"
                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                {...register('name', {
                  required: 'Name is required',
                  validate: (v) => !!v.trim() || 'Name cannot be empty',
                })}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                placeholder="What does this organization do?"
                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                {...register('description')}
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => { reset(); setDialogOpen(false); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0"
                disabled={isPending}
              >
                {isPending ? 'Creating…' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
