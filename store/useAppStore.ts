"use client";

import { create } from "zustand";
import type { Project, Client, Task, User, Notification, Channel, Message } from "@/types/database";

export interface WorkspaceSettings {
  id: string;
  platform_name: string;
  logo_url: string | null;
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_address: string | null;
}

interface AppState {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Clients
  clients: Client[];
  setClients: (clients: Client[]) => void;
  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, statusId: string) => void;
  updateTaskPosition: (taskId: string, statusId: string, position: number) => void;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;

  // Chat
  channels: Channel[];
  setChannels: (channels: Channel[]) => void;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  messages: Record<string, Message[]>; // channelId → messages
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (msg: Message) => void;
  totalUnreadMessages: number;
  setTotalUnreadMessages: (n: number) => void;

  // Workspace
  workspaceSettings: WorkspaceSettings | null;
  setWorkspaceSettings: (s: WorkspaceSettings | null) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  expandedProjects: string[];
  toggleProjectExpanded: (projectId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  projects: [],
  setProjects: (projects) => set({ projects }),
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  clients: [],
  setClients: (clients) => set({ clients }),
  activeClientId: null,
  setActiveClientId: (id) => set({ activeClientId: id }),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  updateTaskStatus: (taskId, statusId) =>
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status_id: statusId } : t),
    })),
  updateTaskPosition: (taskId, statusId, position) =>
    set((state) => ({
      tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status_id: statusId, position } : t),
    })),
  activeTaskId: null,
  setActiveTaskId: (id) => set({ activeTaskId: id }),

  // ── Notifications ────────────────────────────────────────────────────────────
  notifications: [],
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.is_read).length }),
  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markNotificationRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n);
      return { notifications: updated, unreadCount: updated.filter((n) => !n.is_read).length };
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
  unreadCount: 0,

  // ── Chat ─────────────────────────────────────────────────────────────────────
  channels: [],
  setChannels: (channels) => set({ channels }),
  activeChannelId: null,
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  messages: {},
  setMessages: (channelId, messages) =>
    set((state) => ({ messages: { ...state.messages, [channelId]: messages } })),
  addMessage: (msg) =>
    set((state) => {
      const existing = state.messages[msg.channel_id] ?? [];
      return { messages: { ...state.messages, [msg.channel_id]: [...existing, msg] } };
    }),
  totalUnreadMessages: 0,
  setTotalUnreadMessages: (n) => set({ totalUnreadMessages: n }),

  workspaceSettings: null,
  setWorkspaceSettings: (s) => set({ workspaceSettings: s }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  expandedProjects: [],
  toggleProjectExpanded: (projectId) =>
    set((state) => ({
      expandedProjects: state.expandedProjects.includes(projectId)
        ? state.expandedProjects.filter((id) => id !== projectId)
        : [...state.expandedProjects, projectId],
    })),
}));
