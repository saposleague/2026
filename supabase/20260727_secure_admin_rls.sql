-- Sapos League: fecha escritas públicas depois que adminSupabaseWrite estiver
-- publicada e o frontend protegido estiver em produção.
--
-- IMPORTANTE:
-- 1. Publique e teste a Cloud Function antes de executar este arquivo.
-- 2. Execute o arquivo inteiro no SQL Editor do Supabase.
-- 3. As páginas públicas continuarão com SELECT; somente o backend poderá gravar.

begin;

alter table public.jogadores enable row level security;
alter table public.presencas enable row level security;
alter table public.times enable row level security;
alter table public.jogadores_aptos enable row level security;

drop policy if exists "Permitir inserção de jogadores" on public.jogadores;
drop policy if exists "Public Select jogadores" on public.jogadores;
drop policy if exists "Permitir atualização de jogadores" on public.jogadores;

drop policy if exists "Permitir exclusão para todos" on public.presencas;
drop policy if exists "Permitir inserção para todos" on public.presencas;
drop policy if exists "Permitir leitura para todos" on public.presencas;
drop policy if exists "Permitir atualização para todos" on public.presencas;

drop policy if exists "Public Select times" on public.times;

create policy "Leitura publica de jogadores"
on public.jogadores
for select
to anon, authenticated
using (true);

create policy "Leitura publica de presencas"
on public.presencas
for select
to anon, authenticated
using (true);

create policy "Leitura publica de times"
on public.times
for select
to anon, authenticated
using (true);

create policy "Leitura publica de jogadores aptos"
on public.jogadores_aptos
for select
to anon, authenticated
using (true);

revoke insert, update, delete, truncate, references, trigger
on table
  public.jogadores,
  public.presencas,
  public.times,
  public.jogadores_aptos
from anon, authenticated;

grant select
on table
  public.jogadores,
  public.presencas,
  public.times,
  public.jogadores_aptos
to anon, authenticated;

revoke all
on sequence
  public.jogadores_id_seq,
  public.presencas_id_seq,
  public.jogadores_aptos_id_seq
from anon, authenticated;

commit;

-- Verificação: deve haver somente SELECT para anon/authenticated.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('jogadores', 'presencas', 'times', 'jogadores_aptos')
order by tablename, cmd, policyname;

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('jogadores', 'presencas', 'times', 'jogadores_aptos')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
