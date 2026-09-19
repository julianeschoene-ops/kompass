-- KOMPASS 8.5.12 – Datenbankseitiger Schutz vor leer geschriebenen Stufen
-- Einmalig im Supabase SQL Editor ausführen.

begin;

create table if not exists public.kompass_grade_state_history (
  id bigint generated always as identity primary key,
  grade smallint not null,
  payload jsonb not null,
  source_updated_at timestamptz,
  archived_at timestamptz not null default now(),
  changed_by uuid default auth.uid()
);

alter table public.kompass_grade_state_history enable row level security;
revoke all on table public.kompass_grade_state_history from anon;
grant select on table public.kompass_grade_state_history to authenticated;

drop policy if exists "grade history admin read" on public.kompass_grade_state_history;
create policy "grade history admin read" on public.kompass_grade_state_history
for select to authenticated using (public.is_kompass_admin());

create or replace function public.protect_and_archive_kompass_grade_state()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  old_count integer := 0;
  new_count integer := 0;
begin
  if tg_op='INSERT' then
    new_count := jsonb_array_length(coalesce(new.payload->'pupils','[]'::jsonb));
    if new_count=0 then
      raise exception 'Leere Jahrgangsstände dürfen nicht angelegt werden.';
    end if;
    return new;
  end if;

  old_count := jsonb_array_length(coalesce(old.payload->'pupils','[]'::jsonb));

  if tg_op='DELETE' then
    insert into public.kompass_grade_state_history(grade,payload,source_updated_at)
    values(old.grade,old.payload,old.updated_at);
    return old;
  end if;

  new_count := jsonb_array_length(coalesce(new.payload->'pupils','[]'::jsonb));
  if old_count>0 and new_count=0 then
    raise exception 'Ein vorhandener Jahrgang darf nicht auf 0 Schüler*innen geleert werden.';
  end if;

  if old.payload is distinct from new.payload then
    insert into public.kompass_grade_state_history(grade,payload,source_updated_at)
    values(old.grade,old.payload,old.updated_at);
  end if;
  return new;
end;
$$;

drop trigger if exists protect_and_archive_kompass_grade_state_trigger on public.kompass_grade_state;
create trigger protect_and_archive_kompass_grade_state_trigger
before insert or update or delete on public.kompass_grade_state
for each row execute procedure public.protect_and_archive_kompass_grade_state();

commit;
