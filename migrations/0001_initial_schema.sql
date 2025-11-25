-- TaskFlow Lite Database Schema
-- Cloudflare D1 (SQLite)

-- Users table (simple local auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
  start_date TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'in-progress', 'completed', 'overdue')),
  category TEXT,
  archived INTEGER DEFAULT 0,
  google_event_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Settings table (user preferences)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT,
  notifications_enabled INTEGER DEFAULT 1,
  email_reminders INTEGER DEFAULT 1,
  whatsapp_reminders INTEGER DEFAULT 1,
  theme TEXT DEFAULT 'light',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
