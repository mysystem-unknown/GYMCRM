'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, type ExpenseFormValues } from '@/lib/schemas';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI, formatCurrency, formatDate } from '@/lib/api';
import type { Expense } from '@/types/gym';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, CalendarIcon, TrendingDown, DollarSign, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const categories = ['Rent', 'Salary', 'Electricity', 'Cleaning', 'Equipment', 'Internet', 'Breakfast', 'Maintenance', 'Other'];

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const activeGymId = useGymStore((s) => s.activeGymId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: '',
      note: '',
      cashAmount: 0,
      upiAmount: 0,
      expenseDate: new Date(),
    },
  });

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      params.set('limit', '100');
      const result = await fetchAPI<{ expenses: Expense[] }>(`/api/expenses?${params}`);
      setExpenses(result.expenses);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const totalCash = expenses.reduce((s, e) => s + e.cashAmount, 0);
  const totalUpi = expenses.reduce((s, e) => s + e.upiAmount, 0);
  const totalAll = totalCash + totalUpi;

  const onSubmit = async (data: ExpenseFormValues) => {
    if (!activeGymId) {
      toast.error('No gym selected. Please select a gym first.');
      return;
    }
    setSubmitting(true);
    try {
      await fetchAPI('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          gymId: activeGymId,
          category: data.category,
          note: data.note || '',
          cashAmount: data.cashAmount,
          upiAmount: data.upiAmount,
          expenseDate: data.expenseDate.toISOString(),
        }),
      });
      toast.success('Expense added');
      reset({ category: '', note: '', cashAmount: 0, upiAmount: 0, expenseDate: new Date() });
      setShowForm(false);
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetchAPI(`/api/expenses?id=${id}`, { method: 'DELETE' });
      toast.success('Expense deleted');
      loadExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">{expenses.length} expense records</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Hide Form' : 'Add Expense'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total Cash Expenses</p>
              <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalCash)}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 ml-2">
              <DollarSign className="w-4 h-4 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total UPI Expenses</p>
              <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalUpi)}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 ml-2">
              <CreditCard className="w-4 h-4 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total All Expenses</p>
              <p className="text-lg sm:text-xl font-bold">{formatCurrency(totalAll)}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 ml-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base">Add New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category *</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Note</Label>
                  <Input {...register('note')} placeholder="Optional note" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date *</Label>
                  <Controller
                    control={control}
                    name="expenseDate"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="w-full justify-start text-left font-normal text-sm h-9">
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {field.value ? format(field.value, 'dd MMM yyyy') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(d) => d && field.onChange(d)}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {errors.expenseDate && <p className="text-xs text-red-500">{errors.expenseDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cash Amount</Label>
                  <Input type="number" {...register('cashAmount', { valueAsNumber: true })} placeholder="0" />
                  {errors.cashAmount && <p className="text-xs text-red-500">{errors.cashAmount.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UPI Amount</Label>
                  <Input type="number" {...register('upiAmount', { valueAsNumber: true })} placeholder="0" />
                  {errors.upiAmount && <p className="text-xs text-red-500">{errors.upiAmount.message}</p>}
                </div>
              </div>
              {errors.cashAmount?.message?.includes('At least one') && (
                <p className="text-xs text-red-500">{errors.cashAmount.message}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Expense
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses - Mobile Cards / Desktop Table */}
      <Card className="border-0 shadow-sm">
        {loading ? (
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </CardContent>
        ) : expenses.length === 0 ? (
          <CardContent className="p-10 text-center text-muted-foreground">
            No expenses recorded yet
          </CardContent>
        ) : (
          <>
            {/* Mobile: Card view */}
            <div className="sm:hidden">
              <div className="divide-y">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{expense.category}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(expense.expenseDate)}</span>
                      </div>
                      {expense.note && <p className="text-xs text-muted-foreground mt-1 truncate">{expense.note}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(expense.cashAmount + expense.upiAmount)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Desktop: Table view */}
            <CardContent className="p-0 hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Note</th>
                    <th className="px-4 py-3 font-medium text-right">Cash</th>
                    <th className="px-4 py-3 font-medium text-right">UPI</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{formatDate(expense.expenseDate)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{expense.note || '-'}</td>
                      <td className="px-4 py-3 text-right text-sm">{expense.cashAmount > 0 ? formatCurrency(expense.cashAmount) : '-'}</td>
                      <td className="px-4 py-3 text-right text-sm">{expense.upiAmount > 0 ? formatCurrency(expense.upiAmount) : '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-sm">{formatCurrency(expense.cashAmount + expense.upiAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
