# PROJECT RULES: Saaf  (every AI prompt starts with: "Read PROJECT_RULES.md first.")
 
## What we are building
Saaf is a residential-society waste app. Residents report issues by photo; one admin resolves them with proof.
Hackathon prototype (2 hours). REAL: login, feed, report + AI, timeline, admin dashboard, resolve with proof.
FAKED / UI-only: pickup, assistant chat.
 
## Stack (fixed, free tiers only)
- React (Vite, JavaScript) + react-router-dom + @supabase/supabase-js
- Plain CSS with variables in src/styles/tokens.css. NO Tailwind, NO UI kits.
- Supabase: Auth, Postgres + RLS, Storage (bucket "photos"), Edge Function "analyze-report"
- Gemini is called ONLY inside the Edge Function. Deploy on Vercel.
 
## Hard rules
1. All data goes through `import { api } from '../api'`. Pages never import supabase directly.
2. No keys in code. Only .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USE_MOCK).
3. Never use or paste the service_role key anywhere.
4. AI only via `analyzeReport()` in src/lib/ai.js.
5. Edit only files you own (table below). Need a change elsewhere? Ask the owner.
6. No new npm packages without asking the Lead (R1).
7. Mobile first: design at 390px width. Admin screens may use dense tables.
8. Colors, fonts, spacing come from CSS variables. No hard-coded hex inside components.
9. No gradients, glassmorphism, glow, emoji-as-icons, purple/blue "AI look".
10. Every screen needs: loading state, empty state, error message, no console errors.
 
## Ownership
R1 Lead/Integrator: PROJECT_RULES.md, vercel.json, src/main.jsx, src/App.jsx, src/lib/supabase.js, src/api/index.js
R2 Frontend:        src/pages/* (except Assistant, Pickup), src/components/*, src/styles/*, src/mock/fakeData.js, src/api/mockApi.js
R3 Database/Auth:   supabase/sql/*, src/api/supabaseApi.js, src/context/AuthContext.jsx
R4 AI + extras:     supabase/functions/*, src/lib/ai.js, src/mock/cachedAi.js, src/pages/Assistant.jsx, src/pages/Pickup.jsx
 
## Routes
/login  /signup  /  (home feed)  /report  /complaint/:id  /pickup  /assistant  /admin  /admin/complaint/:id
 
## Exact enum strings
issue_type: overflowing_bin | road_garbage | missed_collection | illegal_dumping | other
status: submitted | acknowledged | in_progress | resolved | rejected
priority: low | medium | high | critical
waste_type: wet | dry | e_waste | bulky | hazardous
 
## FeedItem shape (used by feed, detail, admin)
{ id, issue_type, description, block, area_name, status, priority, priority_reason,
  resolution_note, after_photo_url, created_at, resolved_at, is_anonymous,
  reporter_name, reporter_avatar, upvote_count, i_upvoted, is_mine, photos: [url, ...] }
 
## Data contract: src/api/index.js exports `api` with EXACTLY these async functions
signIn(email, password)                      -> profile
signUp({email,password,name,flat_no,block,phone,join_code}) -> profile  (throws Error('Invalid join code'))
signOut()                                    -> void
getSession()                                 -> profile | null   (profile = {id,name,flat_no,block,phone,role})
getAreas()                                   -> [{id, block, area_name}]
getFeed()                                    -> [FeedItem] newest first
getStats()                                   -> {resolved, open, avg_fix_days}
getComplaint(id)                             -> FeedItem + history:[{from_status,to_status,note,created_at}]
uploadPhoto(file)                            -> public url (string)
createComplaint({issue_type,description,area_id,is_anonymous,priority,priority_reason,ai_suggested_type,photo_urls}) -> {id}
toggleUpvote(complaintId, currentlyUpvoted)  -> void
createPickup({waste_type,notes,photo_url})   -> {id}
getMyPickups()                               -> [{id,waste_type,notes,status,scheduled_date,created_at}]
adminGetComplaints()                         -> [FeedItem + reporter_real:{name,flat_no,phone}] (all statuses)
adminSetStatus(id, status, {note, after_photo_url}) -> void   (resolve needs BOTH note and after_photo_url; reject needs note)
 
## Switching mock <-> real
VITE_USE_MOCK=true  uses src/api/mockApi.js.  VITE_USE_MOCK=false uses src/api/supabaseApi.js.
Switch it in .env.local (and in Vercel env vars). Never edit code to switch.
 
## Git
Pull before you start: git pull --rebase origin main. Commit small, push every 20-30 minutes.
Message format: feat(r2): home feed screen. Never force-push.