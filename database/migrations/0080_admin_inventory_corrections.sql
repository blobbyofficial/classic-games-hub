-- Atomic administrator-only inventory correction. Apply to Supabase before enabling UI.
-- Items are unique per account; this is deliberately not a player trading endpoint.
create or replace function public.admin_correct_inventory(
 p_owner uuid, p_inventory_id bigint, p_mode text, p_recipient uuid default null,
 p_refund boolean default false, p_reason text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_actor uuid := (select auth.uid());
 v_row record;
 v_price bigint := 0;
 v_ref text;
begin
 if not exists (select 1 from public.profiles where id=v_actor and role='admin') then
   raise exception 'administrator permission required';
 end if;
 if p_reason is null or length(trim(p_reason)) < 5 or length(p_reason)>400 then
   return jsonb_build_object('ok',false,'error','Provide a reason of 5 to 400 characters');
 end if;
 if p_mode not in ('remove','transfer') or (p_mode='transfer' and (p_refund or p_recipient is null or p_recipient=p_owner)) then
   return jsonb_build_object('ok',false,'error','Invalid inventory operation');
 end if;
 select i.id,i.user_id,i.item_id,i.expires_at,s.slug,s.name
 into v_row from public.inventory_items i join public.shop_items s on s.id=i.item_id
 where i.id=p_inventory_id and i.user_id=p_owner for update of i;
 if not found then return jsonb_build_object('ok',false,'error','Item no longer belongs to this user'); end if;
 if p_mode='transfer' then
   perform 1 from public.profiles where id=p_recipient for update;
   if not found then return jsonb_build_object('ok',false,'error','Recipient does not exist'); end if;
   if exists(select 1 from public.inventory_items where user_id=p_recipient and item_id=v_row.item_id) then
     return jsonb_build_object('ok',false,'error','Recipient already owns this cosmetic');
   end if;
 end if;
 -- Clear active cosmetics on the source account, but do not touch achievements.
 update public.profiles p set equipped = coalesce((
   select jsonb_object_agg(e.key,e.value) from jsonb_each(p.equipped) e
   where e.value <> to_jsonb(v_row.slug)
 ),'{}'::jsonb)
 where p.id=p_owner;
 if p_mode='remove' then
   delete from public.inventory_items where id=v_row.id;
   if p_refund then
     -- Only refund what this owner actually paid for this cosmetic, not a listing
     -- price that may since have changed. Gifts and prizes have no paid record.
     select -t.amount into v_price from public.credit_transactions t
     where t.user_id=p_owner and t.ref_type='shop_item'
       and t.ref_id=v_row.slug and t.reason='shop_purchase' and t.amount<0
     order by t.created_at desc,t.id desc limit 1;
     v_price := coalesce(v_price,0);
     if v_price>0 then
       perform public.award_credits(p_owner,v_price,'admin_inventory_refund','inventory_correction',v_row.id::text,
         jsonb_build_object('actor',v_actor,'item',v_row.slug,'reason',p_reason));
     end if;
   end if;
 else
   update public.inventory_items set user_id=p_recipient where id=v_row.id;
 end if;
 insert into public.audit_logs(actor_id,action,target_type,target_id,details)
 values(v_actor,'admin_inventory_'||p_mode,'inventory_item',v_row.id::text,
   jsonb_build_object('from',p_owner,'to',p_recipient,'item',v_row.slug,
    'refunded',v_price,'reason',p_reason));
 return jsonb_build_object('ok',true,'refunded',v_price);
end; $$;
revoke all on function public.admin_correct_inventory(uuid,bigint,text,uuid,boolean,text) from public,anon;
grant execute on function public.admin_correct_inventory(uuid,bigint,text,uuid,boolean,text) to authenticated;
