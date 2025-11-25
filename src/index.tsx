import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { CloudflareBindings, User, Task, CreateTaskInput, UpdateTaskInput, Settings } from './types';
import {
  generateId,
  hashPassword,
  verifyPassword,
  getCurrentTimestamp,
  isValidEmail,
  updateTaskStatus,
  successResponse,
  errorResponse,
} from './utils';

type Bindings = CloudflareBindings;

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all routes
app.use('*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/favicon.ico', serveStatic({ path: './public/favicon.ico' }));

// ============================================
// AUTH ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', async (c) => {
  try {
    const { name, email, password } = await c.req.json();

    if (!name || !email || !password) {
      return errorResponse('Name, email, and password are required', 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400);
    }

    const db = c.env.DB;

    // Check if user exists
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existingUser) {
      return errorResponse('Email already registered', 409);
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const userId = generateId();
    const now = getCurrentTimestamp();

    await db
      .prepare(
        'INSERT INTO users (id, name, email, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(userId, name, email, hashedPassword, now, now)
      .run();

    // Create default settings
    const settingsId = generateId();
    await db
      .prepare(
        'INSERT INTO settings (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .bind(settingsId, userId, now, now)
      .run();

    const user: Partial<User> = {
      id: userId,
      name,
      email,
      created_at: now,
      updated_at: now,
    };

    return successResponse(user, 'User registered successfully');
  } catch (error: any) {
    console.error('Register error:', error);
    return errorResponse('Registration failed', 500);
  }
});

// Login user
app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    const db = c.env.DB;

    const user = await db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first() as User | null;

    if (!user || !user.password) {
      return errorResponse('Invalid credentials', 401);
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user as any;

    return successResponse(userWithoutPassword, 'Login successful');
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
});

// Get user profile
app.get('/api/auth/me/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;

    const user = await db
      .prepare('SELECT id, name, email, google_access_token, google_refresh_token, created_at, updated_at FROM users WHERE id = ?')
      .bind(userId)
      .first() as User | null;

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user);
  } catch (error: any) {
    console.error('Get user error:', error);
    return errorResponse('Failed to fetch user', 500);
  }
});

// Update Google tokens
app.patch('/api/auth/google-tokens/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { access_token, refresh_token } = await c.req.json();
    const db = c.env.DB;

    await db
      .prepare(
        'UPDATE users SET google_access_token = ?, google_refresh_token = ?, updated_at = ? WHERE id = ?'
      )
      .bind(access_token || null, refresh_token || null, getCurrentTimestamp(), userId)
      .run();

    return successResponse(null, 'Google tokens updated');
  } catch (error: any) {
    console.error('Update tokens error:', error);
    return errorResponse('Failed to update tokens', 500);
  }
});

// ============================================
// TASK ROUTES
// ============================================

// Get all tasks for user
app.get('/api/tasks/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const archived = c.req.query('archived') === 'true';
    const status = c.req.query('status');
    
    const db = c.env.DB;

    let query = 'SELECT * FROM tasks WHERE user_id = ? AND archived = ?';
    const params: any[] = [userId, archived ? 1 : 0];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db
      .prepare(query)
      .bind(...params)
      .all();

    const tasks = (result.results || []) as Task[];

    // Update task statuses
    const updatedTasks = tasks.map((task) => ({
      ...task,
      status: updateTaskStatus(task),
    }));

    return successResponse(updatedTasks);
  } catch (error: any) {
    console.error('Get tasks error:', error);
    return errorResponse('Failed to fetch tasks', 500);
  }
});

// Get single task
app.get('/api/tasks/:userId/:taskId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const taskId = c.req.param('taskId');
    const db = c.env.DB;

    const task = await db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(taskId, userId)
      .first() as Task | null;

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    return successResponse(task);
  } catch (error: any) {
    console.error('Get task error:', error);
    return errorResponse('Failed to fetch task', 500);
  }
});

// Create new task
app.post('/api/tasks/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const input: CreateTaskInput = await c.req.json();

    if (!input.title) {
      return errorResponse('Title is required', 400);
    }

    const db = c.env.DB;
    const taskId = generateId();
    const now = getCurrentTimestamp();

    const task: Partial<Task> = {
      id: taskId,
      user_id: userId,
      title: input.title,
      description: input.description || null,
      priority: input.priority || 'medium',
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      status: 'upcoming',
      category: input.category || null,
      archived: 0,
      created_at: now,
      updated_at: now,
    };

    await db
      .prepare(
        `INSERT INTO tasks (id, user_id, title, description, priority, start_date, due_date, status, category, archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        task.id,
        task.user_id,
        task.title,
        task.description,
        task.priority,
        task.start_date,
        task.due_date,
        task.status,
        task.category,
        task.archived,
        task.created_at,
        task.updated_at
      )
      .run();

    return successResponse(task, 'Task created successfully');
  } catch (error: any) {
    console.error('Create task error:', error);
    return errorResponse('Failed to create task', 500);
  }
});

// Update task
app.patch('/api/tasks/:userId/:taskId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const taskId = c.req.param('taskId');
    const input: UpdateTaskInput = await c.req.json();

    const db = c.env.DB;

    // Check if task exists
    const existingTask = await db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(taskId, userId)
      .first() as Task | null;

    if (!existingTask) {
      return errorResponse('Task not found', 404);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.title !== undefined) {
      updates.push('title = ?');
      params.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push('description = ?');
      params.push(input.description);
    }
    if (input.priority !== undefined) {
      updates.push('priority = ?');
      params.push(input.priority);
    }
    if (input.start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(input.start_date);
    }
    if (input.due_date !== undefined) {
      updates.push('due_date = ?');
      params.push(input.due_date);
    }
    if (input.status !== undefined) {
      updates.push('status = ?');
      params.push(input.status);
    }
    if (input.category !== undefined) {
      updates.push('category = ?');
      params.push(input.category);
    }
    if (input.archived !== undefined) {
      updates.push('archived = ?');
      params.push(input.archived);
    }
    if (input.google_event_id !== undefined) {
      updates.push('google_event_id = ?');
      params.push(input.google_event_id);
    }

    updates.push('updated_at = ?');
    params.push(getCurrentTimestamp());

    params.push(taskId, userId);

    await db
      .prepare(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
      )
      .bind(...params)
      .run();

    const updatedTask = await db
      .prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(taskId, userId)
      .first() as Task;

    return successResponse(updatedTask, 'Task updated successfully');
  } catch (error: any) {
    console.error('Update task error:', error);
    return errorResponse('Failed to update task', 500);
  }
});

// Delete task
app.delete('/api/tasks/:userId/:taskId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const taskId = c.req.param('taskId');
    const db = c.env.DB;

    const result = await db
      .prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?')
      .bind(taskId, userId)
      .run();

    if (result.meta.changes === 0) {
      return errorResponse('Task not found', 404);
    }

    return successResponse(null, 'Task deleted successfully');
  } catch (error: any) {
    console.error('Delete task error:', error);
    return errorResponse('Failed to delete task', 500);
  }
});

// Batch update task statuses (for checking overdue)
app.post('/api/tasks/:userId/batch-status', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;

    const result = await db
      .prepare('SELECT * FROM tasks WHERE user_id = ? AND archived = 0')
      .bind(userId)
      .all();

    const tasks = (result.results || []) as Task[];
    const overdueTasks: Task[] = [];

    for (const task of tasks) {
      const newStatus = updateTaskStatus(task);
      if (newStatus !== task.status) {
        await db
          .prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
          .bind(newStatus, getCurrentTimestamp(), task.id)
          .run();

        if (newStatus === 'overdue') {
          overdueTasks.push({ ...task, status: newStatus });
        }
      }
    }

    return successResponse({ overdue_tasks: overdueTasks });
  } catch (error: any) {
    console.error('Batch status error:', error);
    return errorResponse('Failed to update statuses', 500);
  }
});

// ============================================
// SETTINGS ROUTES
// ============================================

// Get user settings
app.get('/api/settings/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;

    const settings = await db
      .prepare('SELECT * FROM settings WHERE user_id = ?')
      .bind(userId)
      .first() as Settings | null;

    if (!settings) {
      return errorResponse('Settings not found', 404);
    }

    return successResponse(settings);
  } catch (error: any) {
    console.error('Get settings error:', error);
    return errorResponse('Failed to fetch settings', 500);
  }
});

// Update user settings
app.patch('/api/settings/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const input = await c.req.json();
    const db = c.env.DB;

    const updates: string[] = [];
    const params: any[] = [];

    if (input.whatsapp_number !== undefined) {
      updates.push('whatsapp_number = ?');
      params.push(input.whatsapp_number);
    }
    if (input.notifications_enabled !== undefined) {
      updates.push('notifications_enabled = ?');
      params.push(input.notifications_enabled ? 1 : 0);
    }
    if (input.email_reminders !== undefined) {
      updates.push('email_reminders = ?');
      params.push(input.email_reminders ? 1 : 0);
    }
    if (input.whatsapp_reminders !== undefined) {
      updates.push('whatsapp_reminders = ?');
      params.push(input.whatsapp_reminders ? 1 : 0);
    }
    if (input.theme !== undefined) {
      updates.push('theme = ?');
      params.push(input.theme);
    }

    updates.push('updated_at = ?');
    params.push(getCurrentTimestamp());

    params.push(userId);

    await db
      .prepare(
        `UPDATE settings SET ${updates.join(', ')} WHERE user_id = ?`
      )
      .bind(...params)
      .run();

    const updatedSettings = await db
      .prepare('SELECT * FROM settings WHERE user_id = ?')
      .bind(userId)
      .first() as Settings;

    return successResponse(updatedSettings, 'Settings updated successfully');
  } catch (error: any) {
    console.error('Update settings error:', error);
    return errorResponse('Failed to update settings', 500);
  }
});

// ============================================
// DASHBOARD STATS
// ============================================

app.get('/api/stats/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;

    // Get task counts by status
    const statusCounts = await db
      .prepare(
        `SELECT status, COUNT(*) as count 
         FROM tasks 
         WHERE user_id = ? AND archived = 0 
         GROUP BY status`
      )
      .bind(userId)
      .all();

    // Get completed tasks this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyCompleted = await db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM tasks 
         WHERE user_id = ? AND status = 'completed' AND updated_at >= ?`
      )
      .bind(userId, oneWeekAgo.toISOString())
      .first() as { count: number } | null;

    // Get tasks by priority
    const priorityCounts = await db
      .prepare(
        `SELECT priority, COUNT(*) as count 
         FROM tasks 
         WHERE user_id = ? AND archived = 0 AND status != 'completed'
         GROUP BY priority`
      )
      .bind(userId)
      .all();

    // Get tasks by category
    const categoryCounts = await db
      .prepare(
        `SELECT category, COUNT(*) as count 
         FROM tasks 
         WHERE user_id = ? AND archived = 0 AND category IS NOT NULL
         GROUP BY category
         ORDER BY count DESC
         LIMIT 5`
      )
      .bind(userId)
      .all();

    const stats = {
      by_status: statusCounts.results || [],
      weekly_completed: weeklyCompleted?.count || 0,
      by_priority: priorityCounts.results || [],
      by_category: categoryCounts.results || [],
    };

    return successResponse(stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    return errorResponse('Failed to fetch stats', 500);
  }
});

// ============================================
// FRONTEND - Serve React App
// ============================================

app.get('*', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#6366f1">
    <meta name="description" content="TaskFlow Lite - Smart task management with Google Calendar sync">
    <title>TaskFlow Lite - Smart Task Manager</title>
    <link rel="manifest" href="/static/manifest.json">
    <link rel="icon" type="image/png" href="/static/icon-192.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        .task-card { transition: all 0.2s ease; }
        .task-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 50; align-items: center; justify-content: center; }
        .modal.show { display: flex; }
        .priority-low { border-left: 4px solid #10b981; }
        .priority-medium { border-left: 4px solid #f59e0b; }
        .priority-high { border-left: 4px solid #ef4444; }
        .status-upcoming { background: #eff6ff; }
        .status-in-progress { background: #fef3c7; }
        .status-completed { background: #d1fae5; }
        .status-overdue { background: #fee2e2; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
    <script>
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/static/sw.js')
                    .then(reg => console.log('Service Worker registered'))
                    .catch(err => console.log('Service Worker registration failed', err));
            });
        }
    </script>
</body>
</html>
  `);
});

export default app;
