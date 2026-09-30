-- 00_reset.sql  (ONLY if you must start over. Deletes all Saaf tables and types.) 

drop view  if exists public.feed_view; 

drop table if exists public.notifications, public.pickups, public.status_history, 

                     public.upvotes, public.complaint_photos, public.complaints, 

                     public.profiles, public.areas, public.society_settings cascade; 

drop type  if exists public.issue_type, public.complaint_status, public.priority_level, 

                     public.waste_type, public.pickup_status, public.user_role cascade;