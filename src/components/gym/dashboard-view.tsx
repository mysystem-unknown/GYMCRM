'use client';

import { useState, useEffect } from 'react';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI, formatCurrency, formatDate, getStatusColor } from '@/lib/api';
import type { DashboardData } from '@/types/gym';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserCheck, UserX, Clock, TrendingUp, TrendingDown,
  AlertTriangle, RefreshCcw,
  Banknote, Smartphone, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { toast } from 'sonner';

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const activeGymId = useGymStore((s) => s.activeGymId);

  useEffect(() => {
    loadDashboard();
  }, [activeGymId]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      const result = await fetchAPI<DashboardData>(`/api/dashboard?${params}`);
      setData(result);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <p className="text-muted-foreground">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">Make sure you have selected a gym.</p>
        <button
          onClick={loadDashboard}
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const pieData = [
    { name: 'Cash', value: data.monthlyCash || 1 },
    { name: 'UPI', value: data.monthlyUpi || 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Member Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Members" value={data.totalMembers} icon={Users} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard title="Active Members" value={data.activeMembers} icon={UserCheck} color="bg-teal-500/10 text-teal-600 dark:text-teal-400" />
        <StatCard title="Expiring Soon" value={data.expiringSoon} icon={Clock} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <StatCard title="Expired" value={data.expiredMembers} icon={UserX} color="bg-red-500/10 text-red-600 dark:text-red-400" />
      </div>

      {/* Revenue & Balance Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monthly Revenue" value={formatCurrency(data.monthlyRevenue)} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard
          title="Monthly Profit"
          value={formatCurrency(data.monthlyProfit)}
          icon={data.monthlyProfit >= 0 ? TrendingUp : TrendingDown}
          color={data.monthlyProfit >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}
          subtitle={data.monthlyExpenses > 0 ? `Expenses: ${formatCurrency(data.monthlyExpenses)}` : undefined}
        />
        <StatCard title="Pending Payments" value={formatCurrency(data.totalPending)} icon={AlertTriangle} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
        <StatCard title="Total Refund" value={formatCurrency(data.totalRefund)} icon={RefreshCcw} color="bg-sky-500/10 text-sky-600 dark:text-sky-400" />
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 dark:from-emerald-500/10 dark:to-emerald-600/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(data.finalCashBalance)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500/5 to-violet-600/5 dark:from-violet-500/10 dark:to-violet-600/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">UPI Balance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(data.finalUpiBalance)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500/5 to-orange-600/5 dark:from-orange-500/10 dark:to-orange-600/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(data.finalBalance)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Cash vs UPI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                    <Cell fill="#10b981" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Recent Renewals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Member</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Mode</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{t.member?.name || 'Unknown'}</td>
                    <td className="py-2.5 text-muted-foreground">{t.plan}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                        t.paymentMode === 'Cash'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                      }`}>
                        {t.paymentMode === 'Cash' ? '💵' : '📱'} {t.paymentMode}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold">{formatCurrency(t.amount)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{formatDate(t.paymentDate)}</td>
                  </tr>
                ))}
                {data.recentTransactions.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title, value, icon: Icon, color, subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-xl lg:text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
