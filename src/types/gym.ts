export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  gymId: string | null;
  gymName: string | null;
  gymSlug: string | null;
  canRenewMemberships: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  gymId: string | null;
  canRenewMemberships: boolean;
  createdAt: string;
}

export interface Gym {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  owner: { id: string; email: string; name: string; role: string } | null;
  _count: { members: number };
}

export interface GymPlan {
  id: string;
  gymId: string;
  name: string;
  durationDays: number;
  price: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
}

export interface Member {
  id: string;
  memberId: string;
  name: string;
  phoneNumber: string;
  joinDate: string;
  expiryDate: string;
  membershipPlan: string;
  durationMonths: number;
  planPrice: number;
  currentCashPayment: number;
  currentUpiPayment: number;
  totalPayment: number;
  totalCash: number;
  totalUpi: number;
  pendingPayment: number;
  refundAmount: number;
  status: string;
  notes: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  memberId: string;
  paymentMode: string;
  amount: number;
  plan: string;
  duration: number;
  paymentDate: string;
  createdAt: string;
  member?: { name: string; memberId: string };
}

export interface Expense {
  id: string;
  category: string;
  note: string;
  cashAmount: number;
  upiAmount: number;
  expenseDate: string;
  createdAt: string;
}

export interface DashboardData {
  totalMembers: number;
  activeMembers: number;
  expiringSoon: number;
  expiredMembers: number;
  refundedMembers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyCash: number;
  monthlyUpi: number;
  monthlyExpenses: number;
  monthlyCashExpense: number;
  monthlyUpiExpense: number;
  monthlyProfit: number;
  totalCash: number;
  totalUpi: number;
  totalPending: number;
  totalRefund: number;
  openingCash: number;
  openingUpi: number;
  finalCashBalance: number;
  finalUpiBalance: number;
  finalBalance: number;
  revenueByMonth: { month: string; revenue: number; expenses: number }[];
  recentTransactions: Transaction[];
}
