-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_statuses enable row level security;
alter table public.project_members enable row level security;
alter table public.clients enable row level security;
alter table public.client_projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_deliverables enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;
alter table public.notifications enable row level security;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================
create or replace function auth_user_role()
returns user_role as $$
  select role from public.users where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_admin()
returns boolean as $$
  select auth_user_role() = 'admin';
$$ language sql security definer stable;

create or replace function is_project_member(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and manager_id = auth.uid()
  );
$$ language sql security definer stable;

-- =============================================
-- USERS POLICIES
-- =============================================
create policy "users_select_all" on public.users
  for select using (auth.uid() is not null);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_admin" on public.users
  for insert with check (is_admin() or auth.uid() = id);

-- =============================================
-- PROJECTS POLICIES
-- =============================================
create policy "projects_select" on public.projects
  for select using (
    is_admin()
    or is_project_manager(id)
    or is_project_member(id)
  );

create policy "projects_insert_admin" on public.projects
  for insert with check (is_admin());

create policy "projects_update_admin_or_manager" on public.projects
  for update using (is_admin() or is_project_manager(id));

-- =============================================
-- PROJECT STATUSES POLICIES
-- =============================================
create policy "statuses_select" on public.project_statuses
  for select using (
    is_admin()
    or is_project_manager(project_id)
    or is_project_member(project_id)
  );

create policy "statuses_manage_admin_manager" on public.project_statuses
  for all using (is_admin() or is_project_manager(project_id));

-- =============================================
-- PROJECT MEMBERS POLICIES
-- =============================================
create policy "members_select" on public.project_members
  for select using (
    is_admin()
    or is_project_manager(project_id)
    or user_id = auth.uid()
  );

create policy "members_manage_admin_manager" on public.project_members
  for all using (is_admin() or is_project_manager(project_id));

-- =============================================
-- CLIENTS POLICIES
-- =============================================
create policy "clients_select" on public.clients
  for select using (
    is_admin()
    or exists (
      select 1 from public.client_projects cp
      where cp.client_id = clients.id
      and (is_project_manager(cp.project_id) or is_project_member(cp.project_id))
    )
  );

create policy "clients_manage_admin" on public.clients
  for all using (is_admin());

-- =============================================
-- CLIENT PROJECTS POLICIES
-- =============================================
create policy "client_projects_select" on public.client_projects
  for select using (
    is_admin()
    or is_project_manager(project_id)
    or is_project_member(project_id)
  );

create policy "client_projects_manage_admin" on public.client_projects
  for all using (is_admin());

-- =============================================
-- TASKS POLICIES
-- =============================================
create policy "tasks_select_admin" on public.tasks
  for select using (is_admin());

create policy "tasks_select_manager" on public.tasks
  for select using (is_project_manager(project_id));

create policy "tasks_select_collaborator" on public.tasks
  for select using (
    auth_user_role() = 'collaborator'
    and assignee_id = auth.uid()
    and is_project_member(project_id)
  );

create policy "tasks_insert_admin_manager" on public.tasks
  for insert with check (is_admin() or is_project_manager(project_id));

create policy "tasks_update_admin_manager" on public.tasks
  for update using (is_admin() or is_project_manager(project_id));

create policy "tasks_update_collaborator_status" on public.tasks
  for update using (
    auth_user_role() = 'collaborator'
    and assignee_id = auth.uid()
  );

-- =============================================
-- TASK DELIVERABLES POLICIES
-- =============================================
create policy "deliverables_select" on public.task_deliverables
  for select using (
    is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_deliverables.task_id
      and (is_project_manager(t.project_id) or t.assignee_id = auth.uid())
    )
  );

create policy "deliverables_insert" on public.task_deliverables
  for insert with check (
    is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_deliverables.task_id
      and (is_project_manager(t.project_id) or t.assignee_id = auth.uid())
    )
  );

create policy "deliverables_update_approver" on public.task_deliverables
  for update using (
    is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_deliverables.task_id
      and (is_project_manager(t.project_id) or t.approver_id = auth.uid())
    )
  );

-- =============================================
-- TASK COMMENTS POLICIES
-- =============================================
create policy "comments_select" on public.task_comments
  for select using (
    is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
      and (is_project_manager(t.project_id) or is_project_member(t.project_id))
    )
  );

create policy "comments_insert" on public.task_comments
  for insert with check (
    auth.uid() is not null
    and user_id = auth.uid()
  );

create policy "comments_update_own" on public.task_comments
  for update using (user_id = auth.uid());

-- =============================================
-- TASK ACTIVITY POLICIES
-- =============================================
create policy "activity_select" on public.task_activity
  for select using (
    is_admin()
    or exists (
      select 1 from public.tasks t
      where t.id = task_activity.task_id
      and (is_project_manager(t.project_id) or is_project_member(t.project_id))
    )
  );

create policy "activity_insert" on public.task_activity
  for insert with check (auth.uid() is not null);

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_insert" on public.notifications
  for insert with check (true);
