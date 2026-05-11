'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, CalendarIcon, Receipt, TrendingDown, DollarSign, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const categories = ['Rent', 'Salary', 'Electricity', 'Cleaning', 'Equipment', 'Internet', 'Breakfast', 'Maintenance', 'Other'];

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAPI<{ expenses: Expense[] }>('/api/expenses?limit=100');
      setExpenses(result.expenses);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const totalCash = expenses.reduce((s, e) => s + e.cashAmount, 0);
  const totalUpi = expenses.reduce((s, e) => s + e.upiAmount, 0);
  const totalAll = totalCash + totalUpi;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { toast.error('Category is required'); return; }
    setSubmitting(true);
    try {
      await fetchAPI('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          note,
          cashAmount: parseFloat(cashAmount) || 0,
          upiAmount: parseFloat(upiAmount) || 0,
          expenseDate: (expenseDate || new Date()).toISOString(),
        }),
      });
      toast.success('Expense added');
      setCategory('');
      setNote('');
      setCashAmount('');
      setUpiAmount('');
      setShowForm(false);
      loadExpenses();
    } catch {
      toast.error('Failed to add expense');
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
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Cash Expenses</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalCash)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total UPI Expenses</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(totalUpi)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total All Expenses</p>
              <p className="text-xl font-bold">{formatCurrency(totalAll)}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Note</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal text-sm h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {expenseDate ? format(expenseDate, 'dd MMM yyyy') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={expenseDate} onSelect={(d) => d && setExpenseDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cash Amount (₹)</Label>
                  <Input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">UPI Amount (₹)</Label>
                  <Input type="number" value={upiAmount} onChange={(e) => setUpiAmount(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                  {submitting ? 'Adding...' : 'Add Expense'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Note</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">UPI</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No expenses recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{expense.note || '-'}</TableCell>
                    <TableCell className="text-right text-sm">{expense.cashAmount > 0 ? formatCurrency(expense.cashAmount) : '-'}</TableCell>
                    <TableCell className="text-right text-sm">{expense.upiAmount > 0 ? formatCurrency(expense.upiAmount) : '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(expense.cashAmount + expense.upiAmount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
