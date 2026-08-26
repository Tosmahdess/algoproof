-- Resolve one opaque survivor into an editable Lab preset without opening the
-- underlying paid tables. The identifier is a locator, never an entitlement token.

create or replace function public.survivor_lab_preset(p_survivor_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.survivor_family_member%rowtype;
  v_unit jsonb := '{}'::jsonb;
  v_asset_metrics jsonb;
  v_metric_scope text;
begin
  if p_survivor_id is null
     or p_survivor_id !~ '^surv_[0-9a-f]{16}$' then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  select m.*
    into v_member
    from public.survivor_family_member m
   where m.survivor_id = p_survivor_id
     and m.published_at is not null
   order by m.published_at desc, m.dataset_version desc,
            m.base, m.tf, m.kmax, m.ordinality
   limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('access', 'missing');
  end if;

  if v_uid is null or not exists (
    select 1
      from public.subscriptions s
     where s.user_id = v_uid
       and s.status = 'active'
       and (s.current_period_end is null
            or s.current_period_end > pg_catalog.now())
  ) then
    -- Keep this response deliberately constant. In particular, do not construct a
    -- recipe and remove it afterward: protected bytes must never enter the result.
    return pg_catalog.jsonb_build_object('access', 'locked');
  end if;

  select pg_catalog.to_jsonb(e)
    into v_unit
    from public.engine_verdicts e
   where e.base = v_member.base
     and e.tf = v_member.tf
     and e.dataset_version = v_member.dataset_version
     and e.kmax = v_member.kmax
   limit 1;

  v_unit := coalesce(v_unit, '{}'::jsonb);

  if pg_catalog.jsonb_typeof(v_member.recipe -> 'per_asset') = 'object' then
    v_asset_metrics := v_member.recipe -> 'per_asset';
    v_metric_scope := 'survivor';
  else
    v_asset_metrics := case
      when pg_catalog.jsonb_typeof(v_unit -> 'per_asset') = 'object'
        then v_unit -> 'per_asset'
      else null
    end;
    v_metric_scope := 'unit_champion';
  end if;

  return pg_catalog.jsonb_build_object(
    'access', 'full',
    'survivor_id', v_member.survivor_id,
    'strategy', v_member.base,
    'timeframe', v_member.tf,
    'dataset_version', v_member.dataset_version,
    'recipe', v_member.recipe,
    'asset_metrics', v_asset_metrics,
    'metric_scope', v_metric_scope,
    'taker_fee', case
      when pg_catalog.jsonb_typeof(v_unit -> 'taker_fee') = 'number'
        then (v_unit ->> 'taker_fee')::numeric
      else null
    end,
    'slippage', case
      when pg_catalog.jsonb_typeof(v_unit -> 'slippage') = 'number'
        then (v_unit ->> 'slippage')::numeric
      else null
    end
  );
end;
$$;

comment on function public.survivor_lab_preset(text) is
  'Entitlement-gated resolver from an opaque survivor ID to a Lab preset. Locked, '
  'missing, and malformed requests return no recipe bytes.';

revoke all on function public.survivor_lab_preset(text) from public;
grant execute on function public.survivor_lab_preset(text) to anon, authenticated;
