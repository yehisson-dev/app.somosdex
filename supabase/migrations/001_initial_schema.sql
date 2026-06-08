-- Enable required extensions
create extension if not exists "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================
create type user_role as enum ('admin', 'project_manager', 'collaborator');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type deliverable_status as enum ('pending', 'approved', 'rejected');
create type notification_type as enum ('task_assigned', 'deliverable_uploaded', 'deliverable_approved', 'deliverable_rejected', 'comment_mention', 'task_due');

-- =============================================
-- USERS (extends Supabase auth.users)
-- =============================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'collaborator',
  job_title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- PROJECTS
-- =============================================
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  color text not null default '#6366f1',
  icon text,
  manager_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- PROJECT STATUSES (Kanban columns)
-- =============================================
create table public.project_statuses (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  color text not null default '#94a3b8',
  position integer not null default 0,
  created_at timestamptz default now()
);

-- =============================================
-- PROJECT MEMBERS
-- =============================================
create table public.project_members (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  added_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- =============================================
-- CLIENTS
-- =============================================
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  company text,
  email text,
  logo_url text,
  color text not null default '#8b5cf6',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- CLIENT PROJECTS (many-to-many)
-- =============================================
create table public.client_projects (
  client_id uuid references public.clients(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  primary key (client_id, project_id)
);

-- =============================================
-- TASKS
-- =============================================
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  content text,
  content_type text,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade not null,
  status_id uuid references public.project_statuses(id) on delete set null,
  assignee_id uuid references public.users(id) on delete set null,
  approver_id uuid references public.users(id) on delete set null,
  priority task_priority not null default 'medium',
  due_date date,
  scheduled_date date,
  position integer default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- TASK DELIVERABLES
-- =============================================
create table public.task_deliverables (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  uploaded_by uuid references public.users(id) on delete set null,
  version integer not null default 1,
  file_name text not null,
  file_url text not null,
  file_type text,
  thumbnail_url text,
  status deliverable_status not null default 'pending',
  review_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- TASK COMMENTS
-- =============================================
create table public.task_comments (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null,
  content text not null,
  mentions uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- TASK ACTIVITY LOG
-- =============================================
create table public.task_activity (
  id uuid default uuid_generate_v4() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type notification_type not null,
  title text not null,
  body text,
  task_id uuid references public.tasks(id) on delete cascade,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =============================================
-- INDEXES
-- =============================================
create index idx_tasks_project_id on public.tasks(project_id);
create index idx_tasks_client_id on public.tasks(client_id);
create index idx_tasks_assignee_id on public.tasks(assignee_id);
create index idx_tasks_status_id on public.tasks(status_id);
create index idx_task_deliverables_task_id on public.task_deliverables(task_id);
create index idx_task_comments_task_id on public.task_comments(task_id);
create index idx_task_activity_task_id on public.task_activity(task_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_project_members_user_id on public.project_members(user_id);

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users for each row execute function update_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function update_updated_at();
create trigger clients_updated_at before update on public.clients for each row execute function update_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function update_updated_at();
create trigger task_comments_updated_at before update on public.task_comments for each row execute function update_updated_at();

-- =============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- FUNCTION: next deliverable version
-- =============================================
create or replace function get_next_deliverable_version(p_task_id uuid)
returns integer as $$
  select coalesce(max(version), 0) + 1
  from public.task_deliverables
  where task_id = p_task_id;
$$ language sql;
