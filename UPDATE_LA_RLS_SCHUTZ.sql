begin;
drop policy if exists "grade state insert" on public.kompass_grade_state;
create policy "grade state insert" on public.kompass_grade_state
for insert to authenticated
with check (
  public.has_kompass_grade_access(grade,'leitung')
  and exists (
    select 1 from public.kompass_profiles p
    where p.id=auth.uid() and p.active=true
      and p.role in ('teacher','admin')
  )
);
drop policy if exists "shared state read" on public.kompass_shared_state;
create policy "shared state read" on public.kompass_shared_state
for select to authenticated
using (
  public.is_active_kompass_user()
  and exists (
    select 1 from public.kompass_profiles p
    where p.id=auth.uid() and p.active=true
      and p.role in ('teacher','admin')
  )
);
commit;
