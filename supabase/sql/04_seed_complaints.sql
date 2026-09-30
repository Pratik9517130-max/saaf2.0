-- 04_seed_complaints.sql  Believable demo data (10 hand-written + 14 older resolved). 

-- Triggers are switched off so we can back-date rows and write our own history. 
alter table public.complaints disable trigger user; 
  
create temp table seed_c ( 
  email text, itype public.issue_type, descr text, area_block text, area_name text, 
  anon boolean, st public.complaint_status, prio public.priority_level, 
  reason text, days_ago numeric, fix_days numeric, note text 
); 
  
insert into seed_c values 
('asha@saaf.demo',  'overflowing_bin',   'Bin near the play area is overflowing. Children play right next to it.', 
  'Tower A','Play Area', false, 'submitted',    'high',     'Overflow next to a children play area', 0.2, null, null), 
('rohit@saaf.demo', 'overflowing_bin',   'Parking bin overflowing for two days, smell reaching the lobby.', 
  'Tower B','Parking',   false, 'acknowledged', 'medium',   'Overflow in a parking area', 2, null, null), 
('meera@saaf.demo', 'illegal_dumping',   'Construction debris dumped behind the clubhouse overnight.', 
  'Common','Clubhouse',  true,  'in_progress',  'high',     'Blocks the pathway and attracts pests', 3, null, null), 
('asha@saaf.demo',  'missed_collection', 'Dry waste was not collected on Tuesday from our floor.', 
  'Tower A','Parking',   false, 'in_progress',  'medium',   'Scheduled collection missed', 2.5, null, null), 
('rohit@saaf.demo', 'road_garbage',      'Plastic waste scattered on the service road after the weekend market.', 
  'Common','Service Road', false, 'submitted',  'low',      'Litter only, no health risk', 1, null, null), 
('meera@saaf.demo', 'other',             'Broken glass near the Tower C lobby entrance where kids walk.', 
  'Tower C','Lobby',     false, 'acknowledged', 'critical', 'Sharp glass, injury risk', 0.5, null, null), 
('meera@saaf.demo', 'overflowing_bin',   'Terrace bin lid is broken and waste spills in the wind.', 
  'Tower C','Terrace',   false, 'resolved',     'medium',   'Contained waste, low hazard', 6, 1.6, 
  'Lid replaced and the area cleaned by housekeeping.'), 
('asha@saaf.demo',  'illegal_dumping',   'Old sofa left in the Tower B garden.', 
  'Tower B','Garden',    false, 'resolved',     'low',      'Bulky item, no hazard', 8, 2.1, 
  'Bulky item removed with the municipal van.'), 
('rohit@saaf.demo', 'road_garbage',      'Garbage piled up near the park entrance.', 
  'Common','Park',       false, 'resolved',     'medium',   'Visible pile at a public entrance', 9, 1.8, 
  'Cleared, and a second bin placed at the entrance.'), 
('rohit@saaf.demo', 'missed_collection', 'Wet waste van did not come to Tower B on Sunday.', 
  'Tower B','Lobby',     false, 'resolved',     'medium',   'Scheduled collection missed', 4, 1.2, 
  'Extra pickup done the same evening.'); 
  
insert into seed_c 
select (array['asha@saaf.demo','rohit@saaf.demo','meera@saaf.demo'])[1 + (g % 3)], 
       (array['overflowing_bin','road_garbage','missed_collection','illegal_dumping'])[1 + (g % 4)]::public.issue_type, 
       'Earlier issue, resolved by the society office.', 
       'Common', 'Park', false, 
       'resolved'::public.complaint_status, 'medium'::public.priority_level, 
       'Routine issue', 10 + g, 1 + (g % 4) * 0.5, 'Resolved by the housekeeping team.' 
from generate_series(1, 14) g; 
  
insert into public.complaints 
  (reporter_id, issue_type, description, area_id, is_anonymous, status, priority, 
   priority_reason, resolution_note, after_photo_url, created_at, resolved_at) 
select u.id, s.itype, s.descr, a.id, s.anon, s.st, s.prio, s.reason, 
       case when s.st = 'resolved' then s.note end, 
       case when s.st = 'resolved' 
            then 'https://picsum.photos/seed/after-' || gen_random_uuid() || '/700/500' end, 
       now() - s.days_ago * interval '1 day', 
       case when s.st = 'resolved' 
            then now() - s.days_ago * interval '1 day' + s.fix_days * interval '1 day' end 
from seed_c s 
join auth.users   u on u.email = s.email 
join public.areas a on a.block = s.area_block and a.area_name = s.area_name; 
  
-- one "before" photo each (replace hero ones with real photos later) 
insert into public.complaint_photos (complaint_id, url, position) 
select id, 'https://picsum.photos/seed/before-' || id || '/700/500', 0 
from public.complaints; 
  
-- timeline rows (Fixed with explicit enum type casting)
insert into public.status_history (complaint_id, from_status, to_status, changed_by, note, created_at) 
select id, null::public.complaint_status, 'submitted'::public.complaint_status, reporter_id, null, created_at from public.complaints 
union all 
select id, 'submitted'::public.complaint_status, 'acknowledged'::public.complaint_status, (select id from public.profiles where role = 'admin' limit 1), 
       null, created_at + interval '3 hours' 
from public.complaints where status in ('acknowledged','in_progress','resolved') 
union all 
select id, 'acknowledged'::public.complaint_status, 'in_progress'::public.complaint_status, (select id from public.profiles where role = 'admin' limit 1), 
       null, created_at + interval '1 day' 
from public.complaints where status in ('in_progress','resolved') 
union all 
select id, 'in_progress'::public.complaint_status, 'resolved'::public.complaint_status, (select id from public.profiles where role = 'admin' limit 1), 
       resolution_note, resolved_at 
from public.complaints where status = 'resolved'; 
  
-- a few upvotes 
insert into public.upvotes (complaint_id, user_id) 
select c.id, p.id 
from public.complaints c 
cross join public.profiles p 
where p.role = 'resident' and p.id <> c.reporter_id and random() < 0.6 
on conflict do nothing; 
  
alter table public.complaints enable trigger user; 
drop table seed_c; 
  
select status, count(*) from public.complaints group by status order by 1;