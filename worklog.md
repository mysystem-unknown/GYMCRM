---
Task ID: 1
Agent: Main Agent
Task: Fix dashboard monthly profit to subtract refund amounts + Make default plans editable in Plans section

Work Log:
- Analyzed dashboard API: `monthlyProfit = monthlyRevenue - monthlyExpenses` — refunds were completely ignored
- Found that `refundAmount` on Member model was never used in profit calculation
- Added `refundDate` field to Member model in Prisma schema to track when refunds occur (needed for monthly calculation)
- Updated `/api/members` PUT handler to set `refundDate = new Date()` when a refund is processed
- Updated `/api/dashboard` GET handler to:
  - Query monthly refunds: `member.aggregate({ where: { status: 'Refunded', refundDate: { gte: monthStart, lt: monthEnd } } })`
  - Changed profit formula: `monthlyProfit = monthlyRevenue - monthlyExpenses - monthlyRefund`
  - Added `monthlyRefund` to the API response
- Updated `DashboardData` type in `src/types/gym.ts` to include `monthlyRefund`
- Updated `dashboard-view.tsx`:
  - Added "Monthly Refund" stat card
  - Updated Monthly Profit subtitle to show both Expenses and Refunds breakdown
  - Changed grid to 5 columns to accommodate new card

- For default plans:
  - Added `isDefault` boolean field to GymPlan model in Prisma schema
  - Updated `GymPlan` interface in `src/types/gym.ts` to include `isDefault`
  - Updated `/api/plans` GET handler to auto-seed 4 default plans (1 Month, 3 Months, 6 Months, 1 Year) when a gym has no plans
  - Default plans are marked with `isDefault: true` and sorted first in the API response
  - Updated `plans-view.tsx` to show a blue "Default" badge on default plans
  - Updated plan edit dialog to show info text for default plans
  - Removed hardcoded `defaultPlanOptions` from both `add-member-modal.tsx` and `renewal-modal.tsx`
  - Both modals now use ONLY database plans (fetched via `/api/plans`)
  - Simplified plan dropdown (no more Custom/Default grouping since all plans are in the DB)

Stage Summary:
- Dashboard now correctly deducts refunds from monthly profit
- Monthly Refund card added to dashboard showing current month's refund total
- Default plans (1 Month, 3 Months, 6 Months, 1 Year) are auto-seeded when a gym is created
- All plans are stored in the database and can be edited by gym owners via the Plans page
- Build passes successfully with no errors
- Files modified: prisma/schema.prisma, src/app/api/dashboard/route.ts, src/app/api/members/route.ts, src/app/api/plans/route.ts, src/types/gym.ts, src/components/gym/dashboard-view.tsx, src/components/gym/plans-view.tsx, src/components/gym/add-member-modal.tsx, src/components/gym/renewal-modal.tsx
