---
Task ID: 1
Agent: Main Agent
Task: Fix "Failed to create plan" and "Failed to upload image" - Full diagnostic and fix

Work Log:
- Read all relevant files: gym-layout.tsx, gym-store.ts, member-profile.tsx, plans-view.tsx, image-upload.tsx, prisma/schema.prisma, types/gym.ts, lib/schemas.ts, lib/api.ts, lib/auth.ts, lib/db.ts, api/plans/route.ts, api/upload/route.ts
- Identified 4 critical bugs:
  1. prisma/schema.prisma MISSING GymPlan model (db.gymPlan calls fail)
  2. Member model MISSING profileImageUrl field (upload API can't save URL)
  3. gym-store.ts activeView type MISSING 'plans' (navigation crashes)
  4. middleware.ts causing POST request crashes in Next.js 16
- Fixed all 4 bugs, verified plans + image upload work end-to-end

Stage Summary:
- All 4 root causes fixed, both features fully working
---
Task ID: 2
Agent: Main Agent
Task: Connect custom GymPlans to Add/Renew, fix refund in dashboard, add refund amount in edit

Work Log:
- Read: add-member-modal.tsx, renewal-modal.tsx, edit-member-modal.tsx, dashboard-view.tsx, api/members/route.ts, api/transactions/route.ts, api/dashboard/route.ts, api/expenses/route.ts
- Issue 1: Custom plans not in Add/Renew modals - hardcoded planOptions only
- Issue 2: Refund amount not in dashboard - edit modal never sent refundAmount to API
- Issue 3: Edit modal had no refund amount input field

Fixes applied:
1. lib/schemas.ts - Added refundAmount to editMemberSchema
2. add-member-modal.tsx - Complete rewrite:
   - Fetches custom GymPlans from /api/plans on mount
   - Merges custom plans (with days) + default plans (with months) in dropdown
   - Two sections: "Custom Plans" and "Default Plans" in select
   - Expiry calculated via days for custom plans, months for defaults
   - Sends planId + durationDays to API
3. renewal-modal.tsx - Same changes as add-member-modal
4. edit-member-modal.tsx - Added:
   - Conditional refund amount input when status === 'Refunded'
   - Amber warning box with current pending payment display
   - Sends refundAmount + adjusted pendingPayment to API
5. api/members POST - Now accepts planId + durationDays, calculates expiry using days
6. api/members PUT - Now handles refundAmount (accumulates) + pendingPayment
7. api/transactions POST - Now accepts planId + durationDays, calculates expiry using days

Verified:
- Dashboard totalRefund shows correctly after refund (tested ₹500)
- Refunded member count updates in dashboard
- Custom plans appear in plan dropdown (tested "4 month" 120-day plan)
- All API endpoints return correct data

Stage Summary:
- 3 issues fixed: custom plans connected, refund amount in dashboard, refund input in edit
- 7 files modified across frontend components + backend API routes + schemas
