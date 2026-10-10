begin;
drop policy if exists "shared state insert" on public.kompass_shared_state;
create policy "shared state insert" on public.kompass_shared_state
for insert to authenticated
with check (
  public.is_kompass_admin()
  and exists (
    select 1 from public.kompass_profiles p
    where p.id=auth.uid() and p.active=true and p.role='admin'
  )
);
commit;