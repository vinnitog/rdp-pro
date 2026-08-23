-- RDP Pro - Migration 007: exclusao e portabilidade de dados do paciente
-- Execute depois da 006 em producao e teste.

drop policy if exists "patient_delete_own_records" on public.records;

create policy "patient_delete_own_records"
  on public.records
  for delete
  using (
    exists (
      select 1
        from public.patients p
       where p.id = records.patient_id
         and p.user_id = auth.uid()
         and p.active = true
    )
  );

create or replace function public.export_current_patient_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_export jsonb;
begin
  if auth.uid() is null then
    raise exception 'Paciente nao autenticado';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    'patient', jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'created_at', p.created_at
    ),
    'records', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'datetime', r.datetime,
          'date_key', r.date_key,
          'situation', r.situation,
          'thought', r.thought,
          'feeling', r.feeling,
          'anxiety1', r.anxiety1,
          'reaction', r.reaction,
          'alt_thought', r.alt_thought,
          'anxiety2', r.anxiety2,
          'created_at', r.created_at,
          'synced_at', r.synced_at
        )
        order by r.created_at asc
      )
        from public.records r
       where r.patient_id = p.id
    ), '[]'::jsonb)
  )
    into v_export
    from public.patients p
   where p.user_id = auth.uid()
   limit 1;

  if v_export is null then
    raise exception 'Perfil de paciente nao encontrado';
  end if;

  return v_export;
end;
$$;

revoke all on function public.export_current_patient_data() from public;
revoke all on function public.export_current_patient_data() from anon;
grant execute on function public.export_current_patient_data() to authenticated;

notify pgrst, 'reload schema';
