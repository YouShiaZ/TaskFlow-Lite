// Utility functions for TaskFlow Lite

import type { Task, TaskStatus } from './types';

/**
 * Generate a unique ID (UUID v4 alternative for edge runtime)
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Hash password using Web Crypto API (available in Cloudflare Workers)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

/**
 * Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed' || task.archived) {
    return false;
  }
  const dueDate = new Date(task.due_date);
  const now = new Date();
  return now > dueDate;
}

/**
 * Update task status based on dates
 */
export function updateTaskStatus(task: Task): TaskStatus {
  if (task.status === 'completed') {
    return 'completed';
  }
  
  if (isTaskOverdue(task)) {
    return 'overdue';
  }
  
  const now = new Date();
  const startDate = task.start_date ? new Date(task.start_date) : null;
  
  if (startDate && now >= startDate) {
    return task.status === 'upcoming' ? 'in-progress' : task.status;
  }
  
  return task.status;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Create JSON response with CORS
 */
export function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create error response
 */
export function errorResponse(message: string, status: number = 400) {
  return jsonResponse({ success: false, error: message }, status);
}

/**
 * Create success response
 */
export function successResponse(data: any, message?: string) {
  return jsonResponse({ success: true, data, message });
}
