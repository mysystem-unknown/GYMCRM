---
Task ID: 1
Agent: main
Task: Fix member profile image upload - persistent JSON parse error

Root Cause:
- The /api/upload route file kept getting lost between session continuations
- When the route doesn't exist, Next.js returns HTML 404 page
- Frontend's res.json() crashes with "Unexpected token 'S', 'Server act...' is not valid JSON"
- Additionally, image-upload.tsx used data.url but backend returns data.imageUrl

Files Created/Fixed:
1. src/app/api/upload/route.ts (RECREATED via bash heredoc for persistence)
   - export const runtime = 'nodejs' (no edge-runtime)
   - POST: Native FormData parsing, auth, validation, saves to public/uploads/
   - DELETE: removes files by memberId or imageUrl
   - No sharp dependency (removed to reduce memory footprint)
   - All JSON responses, full try/catch

2. src/components/gym/image-upload.tsx
   - Fixed: data.url → data.imageUrl (matches backend response)
   - Added: content-type check before JSON parse
   - Added: safe JSON parsing with fallback error messages

3. src/components/gym/member-profile.tsx
   - handleImageUploaded: async, persists profileImageUrl to DB via PUT /api/members
   - handleImageRemoved: async, clears profileImageUrl in DB

4. package.json
   - Added "postinstall": "prisma generate"
   - Build includes "prisma generate" as first step

5. .gitignore
   - Added /public/uploads/* exclusion with .gitkeep preserved

6. public/uploads/.gitkeep created

Build verified:
- Production build succeeds
- /api/upload registered as dynamic route
- Build output includes route.js in .next/server/app/api/upload/
