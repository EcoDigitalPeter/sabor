create table ai_generation_log (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    meal_generation_id bigint references meal_generations(id) on delete set null,
    meal_plan_id bigint references meal_plans(id) on delete set null,
    ad_hoc_request_id bigint references ad_hoc_recipe_requests(id) on delete set null,
    model varchar(80) not null,
    prompt_tokens integer,
    completion_tokens integer,
    duration_ms integer,
    outcome varchar(24) not null check (outcome in ('SUCCESS', 'FAILED', 'PARTIAL')),
    error_detail text,
    created_at timestamptz not null default now()
);

create index ix_ai_generation_log_user on ai_generation_log (user_id, created_at desc);
create index ix_ai_generation_log_plan on ai_generation_log (meal_plan_id);

create view v_recipe_feedback_summary as
select
    r.id as recipe_id,
    coalesce(sum(case when mf.value = 'LIKE' then 1 else 0 end), 0) as like_count,
    coalesce(sum(case when mf.value = 'DISLIKE' then 1 else 0 end), 0) as dislike_count
from recipes r
left join meal_feedback mf on mf.recipe_id = r.id
group by r.id;

create view v_store_product_counts as
select
    s.id as store_id,
    count(p.id) as product_count
from stores s
left join products p on p.store_id = s.id
group by s.id;

create view v_admin_recipe_list as
select
    r.id,
    r.name,
    r.meal_tag,
    r.status,
    r.estimated_cost_mt,
    r.prep_minutes,
    r.created_at,
    coalesce(f.like_count, 0) as like_count,
    coalesce(f.dislike_count, 0) as dislike_count
from recipes r
left join v_recipe_feedback_summary f on f.recipe_id = r.id;

create view v_order_status_counts as
select
    store_id,
    status,
    count(*) as total
from orders
group by store_id, status;

create view v_admin_metrics_daily as
select
    day::date as date,
    count(distinct mp.id) as meal_plans_generated,
    count(distinct ahr.id) as ad_hoc_recipe_requests
from generate_series(current_date - interval '90 days', current_date, interval '1 day') as day
left join meal_plans mp on mp.created_at::date = day::date
left join ad_hoc_recipe_requests ahr on ahr.created_at::date = day::date
group by day::date;

create view v_user_engagement_monthly as
select
    u.id as user_id,
    date_trunc('month', day)::date as month,
    count(distinct mp.id) as meal_plans_generated,
    count(distinct ahr.id) as ad_hoc_recipe_requests,
    count(distinct o.id) as orders_created
from users u
cross join generate_series(current_date - interval '12 months', current_date, interval '1 month') as day
left join meal_plans mp
    on mp.user_id = u.id
    and date_trunc('month', mp.created_at) = date_trunc('month', day)
left join ad_hoc_recipe_requests ahr
    on ahr.user_id = u.id
    and date_trunc('month', ahr.created_at) = date_trunc('month', day)
left join orders o
    on o.user_id = u.id
    and date_trunc('month', o.created_at) = date_trunc('month', day)
group by u.id, date_trunc('month', day)::date;

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        alter publication supabase_realtime add table meal_generations;
        alter publication supabase_realtime add table ad_hoc_recipe_requests;
        alter publication supabase_realtime add table meal_plan_entries;
        alter publication supabase_realtime add table shopping_list_items;
        alter publication supabase_realtime add table orders;
        alter publication supabase_realtime add table order_items;
    end if;
end $$;
