---
Task ID: 1
Agent: main
Task: Fix member profile image upload - "Unexpected token 'S', 'Server act...' is not valid JSON"

Work Log:
- Diagnosed: /api/upload route was COMPLETELY MISSING (file lost from previous session)
- The running dev server (pid 677) had OLD code without the upload route
- Next.js returned HTML 404 page for /api/upload, causing JSON parse error
- Recreated src/app/api/upload/route.ts with all fixes
- Updated member-profile.tsx to persist profileImageUrl to database
- Updated package.json with postinstall script
- Updated .gitignore for uploads directory

Changes Made:
1. src/app/api/upload/route.ts (recreated)
   - export const runtime = "nodejs"
   - POST: FormData parsing, auth, validation, sharp processing, saves to public/uploads/
   - DELETE: removes files by memberId or imageUrl
   - All JSON responses with try/catch
   - Safe FormData parsing (handles empty body edge case)

2. src/components/gym/member-profile.tsx
   - handleImageUploaded: now async, persists to DB via PUT /api/members
   - handleImageRemoved: now async, clears in DB via PUT /api/members

3. package.json
   - Added "postinstall": "prisma generate"
   - Build script runs "prisma generate" first

4. .gitignore
   - Added /public/uploads/* (excludes user uploads from git)
   - Created public/uploads/.gitkeep

Verification:
- All 6 API tests passed (auth, validation, upload, serve, delete)
- All responses are valid JSON
- Server running on port 3000, Caddy proxy on port 81
