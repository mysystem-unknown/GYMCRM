'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gymPlanSchema, type GymPlanFormValues } from '@/lib/schemas';
import { fetchAPI, formatCurrency } from '@/lib/api';
import { useGymStore } from '@/store/gym-store';
import type { GymPlan } from '@/types/gym';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Tag, Loader2, Clock, IndianRupee, Users } from 'lucide-react';
import { toast } from 'sonner';

export function PlansView() {
  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GymPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const user = useGymStore((s) => s.user);
  const activeGymId = useGymStore((s) => s.activeGymId);

  const canManage = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    loadPlans();
  }, [activeGymId]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      const result = await fetchAPI<{ plans: GymPlan[] }>(`/api/plans?${params}`);
      setPlans(result.plans);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (plan: GymPlan) => {
    try {
      await fetchAPI('/api/plans', {
        method: 'PATCH',
        body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
      });
      toast.success(`Plan "${plan.name}" ${!plan.isActive ? 'activated' : 'deactivated'}`);
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan');
    }
  };

  const handleDelete = async (plan: GymPlan) => {
    const memberCount = plan._count?.members || 0;
    if (memberCount > 0) {
      toast.error(`Cannot delete "${plan.name}" - ${memberCount} member(s) are using this plan. Deactivate it instead.`);
      return;
    }
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      await fetchAPI(`/api/plans?id=${plan.id}`, { method: 'DELETE' });
      toast.success(`Plan "${plan.name}" deleted`);
      loadPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plan');
    }
  };

  const formatDuration = (days: number): string => {
    if (days % 365 === 0) {
      const years = days / 365;
      return years === 1 ? '1 Year' : `${years} Years`;
    }
    if (days % 30 === 0) {
      const months = days / 30;
      return months === 1 ? '1 Month' : `${months} Months`;
    }
    if (days % 7 === 0) {
      const weeks = days / 7;
      return weeks === 1 ? '1 Week' : `${weeks} Weeks`;
    }
    return `${days} Days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membership Plans</h1>
          <p className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? 's' : ''} configured</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowCreate(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Create Plan
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">No Plans Created</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create custom membership plans for your gym. Members can select these during enrollment.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`border-0 shadow-sm hover:shadow-md transition-all ${
                !plan.isActive ? 'opacity-60' : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      plan.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      {!plan.isActive && (
                        <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {plan.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{plan.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <IndianRupee className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-semibold text-lg text-emerald-600 dark:text-emerald-400">{formatCurrency(plan.price)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuration(plan.durationDays)}</span>
                    <span className="text-xs">({plan.durationDays} days)</span>
                  </div>
                  {plan._count && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>{plan._count.members} member{plan._count.members !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`plan-active-${plan.id}`} className="text-xs text-muted-foreground">
                        Active
                      </Label>
                      <Switch
                        id={`plan-active-${plan.id}`}
                        checked={plan.isActive}
                        onCheckedChange={() => handleToggleActive(plan)}
                      />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingPlan(plan)}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(plan)}
                        title={(plan._count?.members || 0) > 0 ? 'Cannot delete: plan has members' : 'Delete'}
                        disabled={(plan._count?.members || 0) > 0}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <PlanFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); loadPlans(); }}
        />
      )}

      {editingPlan && (
        <PlanFormDialog
          open={!!editingPlan}
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={() => { setEditingPlan(null); loadPlans(); }}
        />
      )}
    </div>
  );
}

function PlanFormDialog({
  open,
  plan,
  onClose,
  onSave,
}: {
  open: boolean;
  plan?: GymPlan | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const activeGymId = useGymStore((s) => s.activeGymId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GymPlanFormValues>({
    resolver: zodResolver(gymPlanSchema),
    defaultValues: {
      name: plan?.name || '',
      durationDays: plan?.durationDays || 30,
      price: plan?.price || 0,
      description: plan?.description || '',
    },
  });

  useEffect(() => {
    if (plan) {
      reset({
        name: plan.name,
        durationDays: plan.durationDays,
        price: plan.price,
        description: plan.description || '',
      });
    } else {
      reset({ name: '', durationDays: 30, price: 0, description: '' });
    }
  }, [plan, reset]);

  const onSubmit = async (data: GymPlanFormValues) => {
    setSaving(true);
    try {
      if (plan) {
        await fetchAPI('/api/plans', {
          method: 'PATCH',
          body: JSON.stringify({ id: plan.id, ...data }),
        });
        toast.success(`Plan "${data.name}" updated`);
      } else {
        await fetchAPI('/api/plans', {
          method: 'POST',
          body: JSON.stringify({ gymId: activeGymId, ...data }),
        });
        toast.success(`Plan "${data.name}" created`);
      }
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name *</Label>
            <Input {...register('name')} placeholder="e.g., Monthly, Student Plan" />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duration (days) *</Label>
              <Input type="number" {...register('durationDays', { valueAsNumber: true })} />
              {errors.durationDays && <p className="text-xs text-red-500">{errors.durationDays.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Price (INR) *</Label>
              <Input type="number" {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              {...register('description')}
              placeholder="Brief description of this plan..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {plan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
