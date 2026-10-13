-- BILLION RUSH ADMIN ACCESS CHECK / FIX
-- Run this in Supabase SQL Editor while signed into the correct project.
-- Replace the email below with the EXACT email used by your Supabase Auth account.

-- 1) See the Auth user and current profile role.
select u.id, u.email, p.role, p.display_name
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com');

-- 2) Promote that exact Auth user to admin.
insert into public.profiles (id, display_name, role)
select u.id, coalesce(u.raw_user_meta_data->>'display_name','Admin'), 'admin'::public.user_role
from auth.users u
where lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com')
on conflict (id) do update set role='admin'::public.user_role, updated_at=now();

-- 3) Verify.
select u.email, p.id, p.display_name, p.role
from auth.users u
join public.profiles p on p.id=u.id
where lower(u.email) = lower('YOUR_ADMIN_EMAIL@example.com');

-- IMPORTANT: after changing the role, sign out and sign back in so the browser gets a fresh Auth session.
