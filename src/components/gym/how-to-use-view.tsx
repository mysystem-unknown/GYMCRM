'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, LayoutDashboard, Users, RefreshCw, Receipt, Search,
  Settings, Download, Shield, CheckCircle2,
} from 'lucide-react';

const steps = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Get a complete overview of your gym performance. See total members, active/expiring/expired counts, monthly revenue, expenses, profit, and balance — all in one place with beautiful charts.',
  },
  {
    icon: Users,
    title: 'Manage Members',
    description: 'Add new members with their plan, payment mode, and amount. View all members in a searchable, filterable table. Edit details, view profiles, and track complete payment history for each member.',
  },
  {
    icon: RefreshCw,
    title: 'Renew Memberships',
    description: 'Quickly renew any member\'s plan. Choose from 1 Month, 3 Months, 6 Months, or 1 Year plans. Pay via Cash or UPI. Expiry dates are calculated automatically from the current expiry or renewal date.',
  },
  {
    icon: Receipt,
    title: 'Track Expenses',
    description: 'Record all gym expenses by category — Rent, Salary, Electricity, Cleaning, Equipment, Internet, and more. Track cash and UPI expenses separately for accurate balance calculations.',
  },
  {
    icon: Search,
    title: 'Quick Search',
    description: 'Instantly find any member by their name, phone number, or member ID. Click on any result to view their complete profile with full payment history.',
  },
  {
    icon: Settings,
    title: 'Configure Settings',
    description: 'Set your opening cash and UPI balances. These balances are used to calculate your final cash and UPI balances after accounting for all income and expenses.',
  },
  {
    icon: Download,
    title: 'Export Backup',
    description: 'Download a complete Excel backup of all your gym data including members, transactions, expenses, and summary statistics. Keep your data safe and recoverable at all times.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your gym data is completely private and isolated from other gyms. Only you and your authorized staff can access your gym\'s information.',
  },
];

export function HowToUseView({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">How to Use GymCRM</h1>
            <p className="text-sm text-muted-foreground">Everything you need to manage your gym efficiently</p>
          </div>
        </div>

        <div className="grid gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-0 shadow-sm bg-emerald-500/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <h3 className="font-semibold">Ready to Get Started?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in with your credentials and start managing your gym. If you need any help, contact your system administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
