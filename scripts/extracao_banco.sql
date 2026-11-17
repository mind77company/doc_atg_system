-- Extração SOMENTE LEITURA do banco ATG, para alimentar a documentação.
-- Nada aqui altera dados ou estrutura: só consulta o catálogo do Postgres
-- (pg_catalog) e conta linhas/valores de status. Não lê dados pessoais.
--
-- COMO USAR (Supabase > SQL Editor):
--   * Rode UMA consulta por vez (o editor só mostra o resultado da última).
--   * Para cada uma, use "Copy" > JSON (ou CSV) no resultado e cole na conversa,
--     dizendo o número (Q01, Q02...).
--   * Se algum resultado trouxer chave, token ou senha (principalmente Q07b),
--     troque por XXX antes de colar.
--   * O editor corta resultados em 100 linhas. Nas consultas que listam código
--     linha a linha (Q03, Q04) e em qualquer outra que mostre "A limit of 100
--     was applied", troque o seletor "Limit results" ao lado do botão Run para
--     "No limit" antes de rodar.

-- ============ Q01: chaves, restrições e relacionamentos ============
select conrelid::regclass::text as tabela, conname as restricao, contype as tipo,
       pg_get_constraintdef(oid) as definicao
from pg_constraint
where connamespace = 'public'::regnamespace
order by 1, 3, 2;

-- ============ Q02: índices ============
select tablename as tabela, indexname as indice, indexdef as definicao
from pg_indexes
where schemaname = 'public'
order by 1, 2;

-- ============ Q03: definição das views (uma linha de SQL por linha) ============
-- Use "No limit". Já temos generators_com_itens_vencidos, mv_idf_tokens e
-- proximos_vencimentos (as duas views dependem de tabela INATIVO_ e são legado).
select c.relname as objeto, c.relkind as tipo, l.n as linha_n, l.linha
from pg_class c
cross join lateral regexp_split_to_table(pg_get_viewdef(c.oid, true), E'\n') with ordinality as l(linha, n)
where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
  and c.relname not in ('generators_com_itens_vencidos', 'mv_idf_tokens', 'proximos_vencimentos')
order by c.relname, l.n
limit 5000;

-- ============ Q04a: RPCs chamadas pelo sistema (corpo linha a linha) ============
-- A primeira linha de cada função já traz nome, argumentos e retorno, e a
-- palavra SECURITY DEFINER aparece no texto quando existir.
-- O "limit 5000" explícito evita o corte automático de 100 linhas do editor.
select p.proname as funcao, l.n as linha_n, l.linha
from pg_proc p
cross join lateral regexp_split_to_table(pg_get_functiondef(p.oid), E'\n') with ordinality as l(linha, n)
where p.pronamespace = 'public'::regnamespace
  and p.prokind = 'f'
  and p.proname in ('criar_gerador', 'salvar_preditiva', 'validar_cadastro', 'consumir_rate_limit_iclass')
order by p.proname, l.n
limit 5000;

-- ============ Q04b: funções do processamento da planilha de preditivas ============
-- (comparação de nomes e importação). Já temos busca_cliente_similar,
-- buscar_produtos e buscar_servicos; as funções de trigger de INATIVO_generators
-- (update_vencido_status, update_updated_at_column) são legado e ficam de fora.
select p.proname as funcao, l.n as linha_n, l.linha
from pg_proc p
cross join lateral regexp_split_to_table(pg_get_functiondef(p.oid), E'\n') with ordinality as l(linha, n)
where p.pronamespace = 'public'::regnamespace
  and p.prokind = 'f'
  and p.proname in ('processar_preditivas', 'match_cliente', 'score_nomes', 'idf', 'peso_tokens',
                    'tokens_nome', 'norm_nome', 'sufixo_gerador', 'eh_nao_aplica', 'decode_html',
                    'parse_data_pred', 'f_unaccent', 'set_atualizado_em', 'tg_set_updated_at',
                    'tg_touch_atualizado_em')
order by p.proname, l.n
limit 5000;

-- ============ Q05: triggers (public e auth) ============
select n.nspname || '.' || c.relname as tabela, t.tgname as trigger,
       t.tgenabled as habilitado, pg_get_triggerdef(t.oid) as definicao
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal and n.nspname in ('public', 'auth')
order by 1, 2;

-- ============ Q06: políticas de acesso (RLS) ============
select c.relname as tabela, c.relrowsecurity as rls_ativo, c.relforcerowsecurity as rls_forcado,
       p.policyname as politica, p.cmd as comando, p.roles::text as papeis,
       p.qual as condicao_leitura, p.with_check as condicao_escrita
from pg_class c
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
order by 1, 4;

-- ============ Q07a: extensões instaladas ============
select extname as extensao, extversion as versao from pg_extension order by 1;

-- ============ Q07b: jobs agendados (SÓ se a Q07a mostrar pg_cron) ============
-- ATENÇÃO: o campo "command" pode conter URLs com chaves. Mascare antes de colar.
-- select jobid, jobname, schedule, command, active from cron.job order by jobid;

-- ============ Q08: objetos, tipo, quantidade de linhas e comentários ============
-- tipo: r = tabela, v = view, m = view materializada, p = particionada
select c.relname as objeto, c.relkind as tipo,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from public.%I', c.relname), false, true, '')))[1]::text::bigint as linhas,
       obj_description(c.oid, 'pg_class') as comentario
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'p')
order by 1;

-- ============ Q09: comentários de colunas (se alguém documentou no banco) ============
select c.relname as tabela, a.attname as campo, col_description(c.oid, a.attnum) as comentario
from pg_class c
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'p')
  and col_description(c.oid, a.attnum) is not null
order by 1, 2;

-- ============ Q10: tipos enumerados ============
select t.typname as tipo, string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valores
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typnamespace = 'public'::regnamespace
group by 1
order by 1;

-- ============ Q11: valores possíveis de campos de status/tipo (só contagens) ============
select 'omie_clientes.status_conferencia' as campo, status_conferencia as valor, count(*) as qtd from public.omie_clientes group by 2
union all select 'omie_clientes.statusativo', statusativo, count(*) from public.omie_clientes group by 2
union all select 'geradores_atg.status_ativo', status_ativo, count(*) from public.geradores_atg group by 2
union all select 'geradores_atg.tipo_equipamento', tipo_equipamento, count(*) from public.geradores_atg group by 2
union all select 'geradores_atg.checklist_status', checklist_status, count(*) from public.geradores_atg group by 2
union all select 'preditivas_atg.match_status', match_status, count(*) from public.preditivas_atg group by 2
union all select 'preditivas_atg.status_planilha', status_planilha, count(*) from public.preditivas_atg group by 2
union all select 'oxicatalisador_atg.match_status', match_status, count(*) from public.oxicatalisador_atg group by 2
union all select 'oxicatalisador_atg.situacao', situacao, count(*) from public.oxicatalisador_atg group by 2
union all select 'vw_preditivas.status', status, count(*) from public.vw_preditivas group by 2
union all select 'log_edicoes.entidade', entidade, count(*) from public.log_edicoes group by 2
union all select 'log_edicoes.acao', acao, count(*) from public.log_edicoes group by 2
union all select 'ordens_servico.tipo_erro', tipo_erro::text, count(*) from public.ordens_servico group by 2
order by 1, 3 desc;

-- ============ Q12: privilégios de tabela para anon e authenticated ============
-- Complementa a Q06: com RLS desligado, quem pode ler/gravar é definido aqui.
select table_name as tabela, grantee as papel,
       string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
group by 1, 2
order by 1, 2
limit 5000;

-- ============ Q13: quem pode executar as funções (RPCs) ============
select routine_name as funcao, grantee as papel, privilege_type as privilegio
from information_schema.routine_privileges
where routine_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
order by 1, 2
limit 5000;
