-- 03_seed_base.sql  Run AFTER you created the 4 demo users in Authentication > Users. 

  

insert into public.society_settings (id, society_name, join_code) 

values (1, 'Green Meadows Residency', 'SAAF2026') 

on conflict (id) do update set join_code = excluded.join_code, 

                               society_name = excluded.society_name; 

  

insert into public.areas (block, area_name) values 

  ('Tower A','Main Gate'), ('Tower A','Play Area'), ('Tower A','Parking'), 

  ('Tower B','Lobby'),     ('Tower B','Parking'),   ('Tower B','Garden'), 

  ('Tower C','Lobby'),     ('Tower C','Terrace'),   ('Tower C','Parking'), 

  ('Common','Clubhouse'),  ('Common','Park'),       ('Common','Service Road') 

on conflict do nothing; 

  

-- give the demo users real-looking profiles 

update public.profiles p 

set name = v.name, flat_no = v.flat, block = v.blk, phone = v.phone 

from (values 

  ('admin@saaf.demo', 'Society Office', 'Office', 'Common',  '9000000000'), 

  ('asha@saaf.demo',  'Asha Verma',     'A-402',  'Tower A', '9000000001'), 

  ('rohit@saaf.demo', 'Rohit Sharma',   'B-1105', 'Tower B', '9000000002'), 

  ('meera@saaf.demo', 'Meera Iyer',     'C-207',  'Tower C', '9000000003') 

) as v(email, name, flat, blk, phone) 

join auth.users u on u.email = v.email 

where p.id = u.id; 

  

-- the ONE admin (nobody can do this from the app) 

update public.profiles p set role = 'admin' 

from auth.users u 

where u.id = p.id and u.email = 'admin@saaf.demo'; 

  

select p.name, p.role, u.email from public.profiles p join auth.users u on u.id = p.id; 