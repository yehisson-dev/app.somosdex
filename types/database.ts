export type UserRole = "admin" | "project_manager" | "collaborator";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type DeliverableStatus = "pending" | "approved" | "rejected";
export type NotificationType =
  | "task_assigned"
  | "deliverable_uploaded"
  | "deliverable_approved"
  | "deliverable_rejected"
  | "comment_mention"
  | "task_due"
  | "message_mention"
  | "task_comment"
  | "task_due_soon";

// ─── Domain types ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  job_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  manager?: User;
  members?: User[];
  statuses?: ProjectStatus[];
  clients?: Client[];
}

export interface ProjectStatus {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  added_at: string;
  user?: User;
}

export interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  logo_url: string | null;
  color: string;
  // profile fields
  brief: string | null;
  visual_identity: string | null;
  action_plan: string | null;
  schedule: string | null;
  address: string | null;
  support_phone: string | null;
  objective: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  content_type: string | null;
  client_id: string | null;
  project_id: string;
  status_id: string | null;
  assignee_id: string | null;
  approver_id: string | null;
  priority: TaskPriority;
  due_date: string | null;
  scheduled_date: string | null;
  scheduled_at: string | null;
  estimated_hours: number | null;
  price: number | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client?: Client;
  project?: Project;
  status?: ProjectStatus;
  assignee?: User;
  approver?: User;
  deliverables?: TaskDeliverable[];
  comments?: TaskComment[];
  activity?: TaskActivity[];
  _count?: { deliverables: number; comments: number };
}

export interface TaskDeliverable {
  id: string;
  task_id: string;
  uploaded_by: string | null;
  version: number;
  file_name: string;
  file_url: string;
  file_type: string | null;
  thumbnail_url: string | null;
  status: DeliverableStatus;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  uploader?: User;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string | null;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: User;
}

// ─── Content Plan ─────────────────────────────────────────────────────────────

export type ContentPlatform =
  | "instagram" | "facebook" | "tiktok" | "youtube"
  | "linkedin"  | "blog"     | "podcast" | "twitter";

export type PostStatus = "pending" | "approved" | "rejected";

export interface ContentPlan {
  id: string;
  client_id: string;
  platform: ContentPlatform;
  title: string;
  share_token: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // joined
  client?: Client;
  posts?: ContentPost[];
}

export interface ContentPost {
  id: string;
  plan_id: string;
  media_urls: string[];
  publish_date: string | null;
  description: string | null;
  caption: string | null;
  post_type: string | null;
  status: PostStatus;
  position: number;
  created_at: string;
  updated_at: string;
  // joined
  comments?: ContentPostComment[];
}

export interface ContentPostComment {
  id: string;
  post_id: string;
  content: string;
  author_name: string;
  is_client: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  task_id: string | null;
  channel_id: string | null;
  message_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export type ChannelType = "general" | "direct" | "project" | "task" | "custom";

export interface Channel {
  id: string;
  name: string | null;
  type: ChannelType;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  members?: User[];
  last_message?: Message | null;
  unread_count?: number;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  last_read_at: string;
  user?: User;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string | null;
  content: string;
  mentions: string[];
  created_at: string;
  updated_at: string;
  // joined
  user?: User;
}

// ─── Supabase Database type ─────────────────────────────────────────────────
// Insert/Update only include persisted columns (no joined fields)

type UserInsert = { id?: string; email: string; full_name?: string | null; avatar_url?: string | null; role?: UserRole; job_title?: string | null };
type UserUpdate = Partial<UserInsert>;

type ProjectInsert = { name: string; slug: string; color?: string; icon?: string | null; manager_id?: string | null };
type ProjectUpdate = Partial<ProjectInsert>;

type ProjectStatusInsert = { project_id: string; name: string; color?: string; position?: number };
type ProjectStatusUpdate = Partial<ProjectStatusInsert>;

type ProjectMemberInsert = { project_id: string; user_id: string };

type ClientInsert = {
  name: string;
  company?: string | null;
  email?: string | null;
  logo_url?: string | null;
  color?: string;
  brief?: string | null;
  visual_identity?: string | null;
  action_plan?: string | null;
  schedule?: string | null;
  address?: string | null;
  support_phone?: string | null;
  objective?: string | null;
};
type ClientUpdate = Partial<ClientInsert>;

type ClientProjectInsert = { client_id: string; project_id: string };

type TaskInsert = {
  title: string;
  description?: string | null;
  content?: string | null;
  content_type?: string | null;
  client_id?: string | null;
  project_id: string;
  status_id?: string | null;
  assignee_id?: string | null;
  approver_id?: string | null;
  priority?: TaskPriority;
  due_date?: string | null;
  scheduled_date?: string | null;
  estimated_hours?: number | null;
  price?: number | null;
  position?: number;
  created_by?: string | null;
};
type TaskUpdate = Partial<TaskInsert>;

type TaskDeliverableInsert = {
  task_id: string;
  uploaded_by?: string | null;
  version: number;
  file_name: string;
  file_url: string;
  file_type?: string | null;
  thumbnail_url?: string | null;
  status?: DeliverableStatus;
  review_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};
type TaskDeliverableUpdate = Partial<TaskDeliverableInsert>;

type TaskCommentInsert = { task_id: string; user_id?: string | null; content: string; mentions?: string[] };
type TaskCommentUpdate = Partial<TaskCommentInsert>;

type TaskActivityInsert = { task_id: string; user_id?: string | null; action: string; metadata?: Record<string, unknown> };

type NotificationInsert = { user_id: string; type: NotificationType; title: string; body?: string | null; task_id?: string | null; is_read?: boolean };
type NotificationUpdate = Partial<NotificationInsert>;

export type Database = {
  public: {
    Tables: {
      users: { Row: User; Insert: UserInsert; Update: UserUpdate };
      projects: { Row: Project; Insert: ProjectInsert; Update: ProjectUpdate };
      project_statuses: { Row: ProjectStatus; Insert: ProjectStatusInsert; Update: ProjectStatusUpdate };
      project_members: { Row: ProjectMember; Insert: ProjectMemberInsert; Update: Partial<ProjectMemberInsert> };
      clients: { Row: Client; Insert: ClientInsert; Update: ClientUpdate };
      client_projects: { Row: { client_id: string; project_id: string }; Insert: ClientProjectInsert; Update: Partial<ClientProjectInsert> };
      tasks: { Row: Task; Insert: TaskInsert; Update: TaskUpdate };
      task_deliverables: { Row: TaskDeliverable; Insert: TaskDeliverableInsert; Update: TaskDeliverableUpdate };
      task_comments: { Row: TaskComment; Insert: TaskCommentInsert; Update: TaskCommentUpdate };
      task_activity: { Row: TaskActivity; Insert: TaskActivityInsert; Update: Partial<TaskActivityInsert> };
      notifications: { Row: Notification; Insert: NotificationInsert; Update: NotificationUpdate };
    };
  };
};
