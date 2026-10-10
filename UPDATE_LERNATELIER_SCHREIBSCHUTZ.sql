-- KOMPASS: LA shared-account write lock until constrained RPCs exist.
-- Run in Supabase SQL Editor before enabling any shared LA account.
begin;
drop policy if exists "lernatelier insert" on public.kompass_lernatelier_state;
drop policy if exists "lernatelier update" on public.kompass_lernatelier_state;
create policy "lernatelier insert"
on public.kompass_lernatelier_state for insert to authenticated
with check (
  public.can_access_lernatelier(grade)
  and exists(select 1 from public.kompass_profiles p
             where p.id=auth.uid() and p.active and p.role in ('teacher','admin'))
);
create policy "lernatelier update"
on public.kompass_lernatelier_state for update to authenticated
using (
  public.can_access_lernatelier(grade)
  and exists(select 1 from public.kompass_profiles p
             where p.id=auth.uid() and p.active and p.role in ('teacher','admin'))
)
with check (
  public.can_access_lernatelier(grade)
  and exists(select 1 from public.kompass_profiles p
             where p.id=auth.uid() and p.active and p.role in ('teacher','admin'))
);
commit;
