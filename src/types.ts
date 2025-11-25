// Type definitions for TaskFlow Lite

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'upcoming' | 'in-progress' | 'completed' | 'overdue';

export interface User {
  id: string;
  name: string;
  email: string;
  google_access_token?: string;
  google_refresh_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  priority: Priority;
  start_date?: string;
  due_date?: string;
  status: TaskStatus;
  category?: string;
  archived: number;
  google_event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  whatsapp_number?: string;
  notifications_enabled: number;
  email_reminders: number;
  whatsapp_reminders: number;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  start_date?: string;
  due_date?: string;
  category?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  start_date?: string;
  due_date?: string;
  status?: TaskStatus;
  category?: string;
  archived?: number;
  google_event_id?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CloudflareBindings {
  DB: D1Database;
}
