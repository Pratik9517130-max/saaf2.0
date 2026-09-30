-- 02_security_logic.sql  (helpers, triggers, RLS, feed view, storage policies). Run ONCE after 01. 

  

-- ---------- helper functions ---------- 

create or replace function public.is_admin() returns boolean 

language sql stable security definer set search_path = public as $$ 

  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); 

$$; 

  

create or replace function public.verify_join_code(code text) returns boolean 

language sql stable security definer set search_path = public as $$ 

  select exists (select 1 from public.society_settings 

                 where join_code = upper(trim(code))); 

$$; 

grant execute on function public.verify_join_code(text) to anon, authenticated; 

  

-- ---------- auto-create profile on signup ---------- 

create or replace function public.handle_new_user() returns trigger 

language plpgsql security definer set search_path = public as $$ 

begin 

  insert into public.profiles (id, name, flat_no, block, phone) 

  values (new.id, 

          coalesce(new.raw_user_meta_data->>'name', 'Resident'), 

          new.raw_user_meta_data->>'flat_no', 

          new.raw_user_meta_data->>'block', 

          new.raw_user_meta_data->>'phone'); 

  return new; 

end $$; 

  

drop trigger if exists on_auth_user_created on auth.users; 

create trigger on_auth_user_created after insert on auth.users 

for each row execute function public.handle_new_user(); 

  

-- ---------- nobody can promote themselves ---------- 

create or replace function public.guard_profile_update() returns trigger 

language plpgsql as $$ 

begin 

  if auth.uid() is not null and new.role is distinct from old.role then 

    raise exception 'role cannot be changed'; 

  end if; 

  return new; 

end $$; 

create trigger trg_guard_profile before update on public.profiles 

for each row execute function public.guard_profile_update(); 

  

-- ---------- complaint rules (before update) ---------- 

create or replace function public.complaint_before_update() returns trigger 

language plpgsql security definer set search_path = public as $$ 

begin 

  -- residents may only edit text fields, never status/priority/proof 

  if auth.uid() is not null and not public.is_admin() then 

    if new.status <> old.status 

       or new.priority is distinct from old.priority 

       or new.resolution_note is distinct from old.resolution_note 

       or new.after_photo_url is distinct from old.after_photo_url 

       or new.reporter_id <> old.reporter_id then 

      raise exception 'not allowed'; 

    end if; 

  end if; 

  

  if new.status = 'resolved' and old.status <> 'resolved' then 

    if coalesce(trim(new.resolution_note), '') = '' or new.after_photo_url is null then 

      raise exception 'resolve needs a note and an after photo'; 

    end if; 

    new.resolved_at := now(); 

  end if; 

  

  if new.status = 'rejected' and old.status <> 'rejected' 

     and coalesce(trim(new.resolution_note), '') = '' then 

    raise exception 'reject needs a reason'; 

  end if; 

  return new; 

end $$; 

  

-- ---------- history + notifications (after insert/update) ---------- 

create or replace function public.complaint_after_change() returns trigger 

language plpgsql security definer set search_path = public as $$ 

begin 

  if tg_op = 'INSERT' then 

    insert into public.status_history (complaint_id, from_status, to_status, changed_by) 

    values (new.id, null, new.status, new.reporter_id); 

  elsif new.status is distinct from old.status then 

    insert into public.status_history (complaint_id, from_status, to_status, changed_by, note) 

    values (new.id, old.status, new.status, auth.uid(), new.resolution_note); 

  

    insert into public.notifications (user_id, message, related_complaint_id) 

    select distinct t.uid, 

           'Complaint update: ' || replace(new.status::text, '_', ' '), 

           new.id 

    from (select new.reporter_id as uid 

          union 

          select user_id from public.upvotes where complaint_id = new.id) t 

    where t.uid is distinct from auth.uid(); 

  end if; 

  return null; 

end $$; 

  

create trigger trg_complaint_before before update on public.complaints 

for each row execute function public.complaint_before_update(); 

create trigger trg_complaint_after after insert or update on public.complaints 

for each row execute function public.complaint_after_change(); 

  

-- ---------- table privileges (RLS still decides row access) ---------- 

grant usage on schema public to anon, authenticated; 

grant select, insert, update, delete on all tables in schema public to authenticated; 

grant usage, select on all sequences in schema public to authenticated; 

  

-- ---------- row level security ---------- 

alter table public.society_settings enable row level security;  -- no policy = no direct access 

alter table public.areas            enable row level security; 

alter table public.profiles         enable row level security; 

alter table public.complaints       enable row level security; 

alter table public.complaint_photos enable row level security; 

alter table public.upvotes          enable row level security; 

alter table public.status_history   enable row level security; 

alter table public.pickups          enable row level security; 

alter table public.notifications    enable row level security; 

  

create policy areas_read on public.areas for select to authenticated using (true); 

  

create policy profiles_read on public.profiles for select to authenticated 

  using (id = auth.uid() or public.is_admin()); 

create policy profiles_update_own on public.profiles for update to authenticated 

  using (id = auth.uid()) with check (id = auth.uid()); 

  

-- residents read raw complaints only for their own rows; everyone else uses feed_view 

create policy complaints_read on public.complaints for select to authenticated 

  using (reporter_id = auth.uid() or public.is_admin()); 

create policy complaints_insert on public.complaints for insert to authenticated 

  with check (reporter_id = auth.uid() and status = 'submitted'); 

create policy complaints_update_own on public.complaints for update to authenticated 

  using (reporter_id = auth.uid() and status = 'submitted') 

  with check (reporter_id = auth.uid() and status = 'submitted'); 

create policy complaints_update_admin on public.complaints for update to authenticated 

  using (public.is_admin()) with check (public.is_admin()); 

create policy complaints_delete_own on public.complaints for delete to authenticated 

  using (reporter_id = auth.uid() and status = 'submitted'); 

  

create policy photos_read on public.complaint_photos for select to authenticated using (true); 

create policy photos_insert on public.complaint_photos for insert to authenticated 

  with check (exists (select 1 from public.complaints c 

                      where c.id = complaint_id and c.reporter_id = auth.uid())); 

  

create policy upvotes_read on public.upvotes for select to authenticated using (true); 

create policy upvotes_insert on public.upvotes for insert to authenticated 

  with check (user_id = auth.uid()); 

create policy upvotes_delete on public.upvotes for delete to authenticated 

  using (user_id = auth.uid()); 

  

create policy history_read on public.status_history for select to authenticated using (true); 

-- no insert/update/delete policy: only the triggers write history 

  

create policy pickups_read on public.pickups for select to authenticated 

  using (resident_id = auth.uid() or public.is_admin()); 

create policy pickups_insert on public.pickups for insert to authenticated 

  with check (resident_id = auth.uid()); 

create policy pickups_update_own on public.pickups for update to authenticated 

  using (resident_id = auth.uid() and status = 'requested') 

  with check (resident_id = auth.uid() and status = 'requested'); 

create policy pickups_update_admin on public.pickups for update to authenticated 

  using (public.is_admin()) with check (public.is_admin()); 

  

create policy notif_read on public.notifications for select to authenticated 

  using (user_id = auth.uid()); 

create policy notif_update on public.notifications for update to authenticated 

  using (user_id = auth.uid()) with check (user_id = auth.uid()); 

  

-- ---------- public feed: masks identity when anonymous ---------- 

create or replace view public.feed_view as 

select 

  c.id, c.issue_type, c.description, c.area_id, a.block, a.area_name, 

  c.status, c.priority, c.priority_reason, 

  c.resolution_note, c.after_photo_url, c.created_at, c.resolved_at, c.is_anonymous, 

  case when c.is_anonymous then 'Anonymous resident' else p.name end       as reporter_name, 

  case when c.is_anonymous then null else p.avatar_url end                 as reporter_avatar, 

  (select count(*) from public.upvotes u where u.complaint_id = c.id)::int as upvote_count, 

  exists (select 1 from public.upvotes u 

          where u.complaint_id = c.id and u.user_id = auth.uid())          as i_upvoted, 

  (c.reporter_id = auth.uid())                                             as is_mine, 

  (select coalesce(json_agg(cp.url order by cp.position), '[]'::json) 

     from public.complaint_photos cp where cp.complaint_id = c.id)         as photos 

from public.complaints c 

join public.areas    a on a.id = c.area_id 

join public.profiles p on p.id = c.reporter_id 

where c.status <> 'rejected' or c.reporter_id = auth.uid(); 

  

revoke all on public.feed_view from anon; 

revoke insert, update, delete on public.feed_view from authenticated; 

grant select on public.feed_view to authenticated; 

  

-- ---------- storage policies (bucket "photos" must exist, public) ---------- 

create policy "photos upload own folder" on storage.objects for insert to authenticated 

  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text); 

create policy "photos read" on storage.objects for select using (bucket_id = 'photos'); 