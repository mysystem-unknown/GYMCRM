import { z } from 'zod';

// Member schemas
export const addMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone must be at least 10 characters'),
  membershipPlan: z.string().min(1, 'Plan is required'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  joinDate: z.date({ message: 'Join date is required' }),
});
export type AddMemberFormValues = z.infer<typeof addMemberSchema>;

export const editMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string(),
});
export type EditMemberFormValues = z.infer<typeof editMemberSchema>;

// Renewal schema
export const renewalSchema = z.object({
  membershipPlan: z.string().min(1, 'Plan is required'),
  paymentMode: z.string().min(1, 'Payment mode is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  renewalDate: z.date().optional(),
});
export type RenewalFormValues = z.infer<typeof renewalSchema>;

// Expense schema
export const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  note: z.string(),
  cashAmount: z.number().min(0, 'Cash amount must be non-negative'),
  upiAmount: z.number().min(0, 'UPI amount must be non-negative'),
  expenseDate: z.date({ message: 'Date is required' }),
}).refine(data => data.cashAmount > 0 || data.upiAmount > 0, {
  message: 'At least one amount (cash or UPI) must be greater than 0',
  path: ['cashAmount'],
});
export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// Gym creation schema
export const createGymSchema = z.object({
  gymName: z.string().min(1, 'Gym name is required'),
  gymPhone: z.string(),
  gymAddress: z.string(),
  adminName: z.string(),
  adminEmail: z.string().email('Please enter a valid email'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});
export type CreateGymFormValues = z.infer<typeof createGymSchema>;

// Staff creation schema
export const createStaffSchema = z.object({
  name: z.string(),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['staff', 'admin']),
  canRenewMemberships: z.boolean(),
});
export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;

// Gym Plan schema
export const gymPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  durationDays: z.number().int().min(1, 'Duration must be at least 1 day'),
  price: z.number().min(0, 'Price must be non-negative'),
  description: z.string().optional().default(''),
});
export type GymPlanFormValues = z.infer<typeof gymPlanSchema>;

// Settings schema
export const settingsSchema = z.object({
  openingCashBalance: z.number().min(0, 'Must be non-negative'),
  openingUpiBalance: z.number().min(0, 'Must be non-negative'),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;
