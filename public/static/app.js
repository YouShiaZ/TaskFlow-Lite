// TaskFlow Lite - React Frontend Application
// Using React 18 UMD build from CDN

const { useState, useEffect, useCallback, useMemo } = React;
const API_BASE = window.location.origin;

// ============================================
// Google Calendar API Integration
// ============================================
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.compose';

class GoogleCalendarAPI {
    constructor() {
        this.accessToken = localStorage.getItem('google_access_token');
        this.tokenClient = null;
    }

    async initGoogleAPI() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: CALENDAR_SCOPES,
                    callback: (response) => {
                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            localStorage.setItem('google_access_token', response.access_token);
                        }
                    },
                });
                resolve();
            };
            document.head.appendChild(script);
        });
    }

    requestAuth() {
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        }
    }

    isAuthorized() {
        return !!this.accessToken;
    }

    async createEvent(task) {
        if (!this.accessToken) return null;

        const event = {
            summary: task.title,
            description: task.description || '',
            start: {
                dateTime: task.start_date || task.due_date,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
                dateTime: task.due_date,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        try {
            const response = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(event),
                }
            );

            if (response.ok) {
                const data = await response.json();
                return data.id;
            }
        } catch (error) {
            console.error('Create calendar event error:', error);
        }
        return null;
    }

    async updateEvent(eventId, task) {
        if (!this.accessToken || !eventId) return;

        const event = {
            summary: task.title,
            description: task.description || '',
            start: {
                dateTime: task.start_date || task.due_date,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
                dateTime: task.due_date,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
        };

        try {
            await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(event),
                }
            );
        } catch (error) {
            console.error('Update calendar event error:', error);
        }
    }

    async deleteEvent(eventId) {
        if (!this.accessToken || !eventId) return;

        try {
            await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }
            );
        } catch (error) {
            console.error('Delete calendar event error:', error);
        }
    }
}

const googleCalendar = new GoogleCalendarAPI();

// ============================================
// Notification Helpers
// ============================================
function openGmailCompose(task, userEmail) {
    const subject = encodeURIComponent(`⚠️ Task Overdue: ${task.title}`);
    const body = encodeURIComponent(
        `Your task "${task.title}" is overdue!\n\nDue Date: ${new Date(task.due_date).toLocaleString()}\n\nDescription: ${task.description || 'No description'}\n\nPlease complete it as soon as possible.`
    );
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${userEmail}&su=${subject}&body=${body}`;
    window.open(url, '_blank');
}

function openWhatsApp(task, phoneNumber) {
    const message = encodeURIComponent(
        `⚠️ Task Overdue Alert!\n\nTask: ${task.title}\nDue: ${new Date(task.due_date).toLocaleString()}\n\nPlease complete it ASAP!`
    );
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, '_blank');
}

// ============================================
// Storage & State Management
// ============================================
class AppState {
    constructor() {
        this.listeners = [];
        this.state = {
            user: JSON.parse(localStorage.getItem('user') || 'null'),
            tasks: [],
            settings: null,
            loading: false,
            currentPage: 'dashboard',
            filter: 'all',
        };
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener(this.state));
    }

    getState() {
        return this.state;
    }
}

const appState = new AppState();

// ============================================
// API Service
// ============================================
const api = {
    async register(name, email, password) {
        const response = await axios.post(`${API_BASE}/api/auth/register`, { name, email, password });
        return response.data;
    },

    async login(email, password) {
        const response = await axios.post(`${API_BASE}/api/auth/login`, { email, password });
        if (response.data.success) {
            localStorage.setItem('user', JSON.stringify(response.data.data));
            appState.setState({ user: response.data.data });
        }
        return response.data;
    },

    async getUser(userId) {
        const response = await axios.get(`${API_BASE}/api/auth/me/${userId}`);
        return response.data;
    },

    async getTasks(userId, archived = false, status = null) {
        let url = `${API_BASE}/api/tasks/${userId}?archived=${archived}`;
        if (status) url += `&status=${status}`;
        const response = await axios.get(url);
        return response.data;
    },

    async createTask(userId, taskData) {
        const response = await axios.post(`${API_BASE}/api/tasks/${userId}`, taskData);
        return response.data;
    },

    async updateTask(userId, taskId, updates) {
        const response = await axios.patch(`${API_BASE}/api/tasks/${userId}/${taskId}`, updates);
        return response.data;
    },

    async deleteTask(userId, taskId) {
        const response = await axios.delete(`${API_BASE}/api/tasks/${userId}/${taskId}`);
        return response.data;
    },

    async batchUpdateStatus(userId) {
        const response = await axios.post(`${API_BASE}/api/tasks/${userId}/batch-status`);
        return response.data;
    },

    async getSettings(userId) {
        const response = await axios.get(`${API_BASE}/api/settings/${userId}`);
        return response.data;
    },

    async updateSettings(userId, settings) {
        const response = await axios.patch(`${API_BASE}/api/settings/${userId}`, settings);
        return response.data;
    },

    async getStats(userId) {
        const response = await axios.get(`${API_BASE}/api/stats/${userId}`);
        return response.data;
    },
};

// ============================================
// Background Scheduler (runs every 60 seconds)
// ============================================
class BackgroundScheduler {
    constructor() {
        this.interval = null;
    }

    start(userId) {
        if (this.interval) return;
        
        this.interval = setInterval(async () => {
            try {
                // Check and update overdue tasks
                const result = await api.batchUpdateStatus(userId);
                
                if (result.success && result.data.overdue_tasks.length > 0) {
                    const settings = await api.getSettings(userId);
                    const user = appState.getState().user;
                    
                    result.data.overdue_tasks.forEach(task => {
                        // Show browser notification
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Task Overdue!', {
                                body: `${task.title} is overdue`,
                                icon: '/static/icon-192.png',
                            });
                        }
                    });
                }
                
                // Refresh tasks
                const tasksResult = await api.getTasks(userId);
                if (tasksResult.success) {
                    appState.setState({ tasks: tasksResult.data });
                }
            } catch (error) {
                console.error('Background check error:', error);
            }
        }, 60000); // Every 60 seconds
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

const scheduler = new BackgroundScheduler();

// ============================================
// React Components
// ============================================

// Auth Page Component
function AuthPage({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const result = await api.login(formData.email, formData.password);
                if (result.success) {
                    onLogin(result.data);
                } else {
                    setError(result.error);
                }
            } else {
                const result = await api.register(formData.name, formData.email, formData.password);
                if (result.success) {
                    // Auto login after register
                    const loginResult = await api.login(formData.email, formData.password);
                    if (loginResult.success) {
                        onLogin(loginResult.data);
                    }
                } else {
                    setError(result.error);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return React.createElement('div', { className: 'min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4' },
        React.createElement('div', { className: 'bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md' },
            React.createElement('div', { className: 'text-center mb-8' },
                React.createElement('i', { className: 'fas fa-tasks text-5xl text-indigo-600 mb-4' }),
                React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' }, 'TaskFlow Lite'),
                React.createElement('p', { className: 'text-gray-600 mt-2' }, 'Smart Task Management')
            ),
            
            React.createElement('div', { className: 'flex gap-2 mb-6' },
                React.createElement('button', {
                    className: `flex-1 py-2 rounded-lg font-medium transition ${isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`,
                    onClick: () => setIsLogin(true)
                }, 'Login'),
                React.createElement('button', {
                    className: `flex-1 py-2 rounded-lg font-medium transition ${!isLogin ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`,
                    onClick: () => setIsLogin(false)
                }, 'Register')
            ),

            React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
                !isLogin && React.createElement('input', {
                    type: 'text',
                    placeholder: 'Full Name',
                    value: formData.name,
                    onChange: (e) => setFormData({ ...formData, name: e.target.value }),
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    required: !isLogin
                }),
                React.createElement('input', {
                    type: 'email',
                    placeholder: 'Email',
                    value: formData.email,
                    onChange: (e) => setFormData({ ...formData, email: e.target.value }),
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    required: true
                }),
                React.createElement('input', {
                    type: 'password',
                    placeholder: 'Password',
                    value: formData.password,
                    onChange: (e) => setFormData({ ...formData, password: e.target.value }),
                    className: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    required: true
                }),
                error && React.createElement('div', { className: 'bg-red-100 text-red-700 p-3 rounded-lg text-sm' }, error),
                React.createElement('button', {
                    type: 'submit',
                    disabled: loading,
                    className: 'w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50'
                }, loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account'))
            )
        )
    );
}

// Task Card Component
function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
    const priorityClass = `priority-${task.priority}`;
    const statusClass = `status-${task.status}`;
    
    return React.createElement('div', { className: `task-card bg-white rounded-lg shadow p-4 ${priorityClass} ${statusClass}` },
        React.createElement('div', { className: 'flex justify-between items-start mb-2' },
            React.createElement('h3', { className: 'font-semibold text-lg text-gray-800' }, task.title),
            React.createElement('div', { className: 'flex gap-2' },
                React.createElement('button', {
                    onClick: () => onEdit(task),
                    className: 'text-blue-600 hover:text-blue-800'
                }, React.createElement('i', { className: 'fas fa-edit' })),
                React.createElement('button', {
                    onClick: () => onDelete(task.id),
                    className: 'text-red-600 hover:text-red-800'
                }, React.createElement('i', { className: 'fas fa-trash' }))
            )
        ),
        task.description && React.createElement('p', { className: 'text-gray-600 text-sm mb-3' }, task.description),
        React.createElement('div', { className: 'flex flex-wrap gap-2 mb-3' },
            React.createElement('span', { className: `px-2 py-1 rounded text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}` },
                React.createElement('i', { className: 'fas fa-flag mr-1' }), task.priority
            ),
            React.createElement('span', { className: `px-2 py-1 rounded text-xs font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-700' : task.status === 'overdue' ? 'bg-red-100 text-red-700' : task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}` },
                React.createElement('i', { className: 'fas fa-circle mr-1' }), task.status
            ),
            task.category && React.createElement('span', { className: 'px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium' },
                React.createElement('i', { className: 'fas fa-tag mr-1' }), task.category
            )
        ),
        task.due_date && React.createElement('div', { className: 'text-xs text-gray-500 mb-3' },
            React.createElement('i', { className: 'fas fa-calendar mr-1' }),
            'Due: ', new Date(task.due_date).toLocaleString()
        ),
        React.createElement('div', { className: 'flex gap-2' },
            task.status !== 'completed' && React.createElement('button', {
                onClick: () => onStatusChange(task.id, 'completed'),
                className: 'flex-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700'
            }, React.createElement('i', { className: 'fas fa-check mr-1' }), 'Complete'),
            task.status === 'upcoming' && React.createElement('button', {
                onClick: () => onStatusChange(task.id, 'in-progress'),
                className: 'flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700'
            }, React.createElement('i', { className: 'fas fa-play mr-1' }), 'Start')
        )
    );
}

// Task Form Modal
function TaskFormModal({ isOpen, onClose, onSubmit, task = null }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: '',
        start_date: '',
        due_date: '',
    });

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || 'medium',
                category: task.category || '',
                start_date: task.start_date ? task.start_date.slice(0, 16) : '',
                due_date: task.due_date ? task.due_date.slice(0, 16) : '',
            });
        } else {
            setFormData({
                title: '',
                description: '',
                priority: 'medium',
                category: '',
                start_date: '',
                due_date: '',
            });
        }
    }, [task, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
            due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        };
        onSubmit(data);
    };

    if (!isOpen) return null;

    return React.createElement('div', { className: 'modal show', onClick: onClose },
        React.createElement('div', { className: 'bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4', onClick: (e) => e.stopPropagation() },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h2', { className: 'text-2xl font-bold text-gray-800' },
                    React.createElement('i', { className: 'fas fa-tasks text-indigo-600 mr-2' }),
                    task ? 'Edit Task' : 'New Task'
                ),
                React.createElement('button', {
                    onClick: onClose,
                    className: 'text-gray-500 hover:text-gray-700 text-2xl'
                }, '×')
            ),
            React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
                React.createElement('input', {
                    type: 'text',
                    placeholder: 'Task Title *',
                    value: formData.title,
                    onChange: (e) => setFormData({ ...formData, title: e.target.value }),
                    className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500',
                    required: true
                }),
                React.createElement('textarea', {
                    placeholder: 'Description',
                    value: formData.description,
                    onChange: (e) => setFormData({ ...formData, description: e.target.value }),
                    className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500',
                    rows: 3
                }),
                React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
                    React.createElement('select', {
                        value: formData.priority,
                        onChange: (e) => setFormData({ ...formData, priority: e.target.value }),
                        className: 'px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'
                    },
                        React.createElement('option', { value: 'low' }, '🟢 Low Priority'),
                        React.createElement('option', { value: 'medium' }, '🟡 Medium Priority'),
                        React.createElement('option', { value: 'high' }, '🔴 High Priority')
                    ),
                    React.createElement('input', {
                        type: 'text',
                        placeholder: 'Category (optional)',
                        value: formData.category,
                        onChange: (e) => setFormData({ ...formData, category: e.target.value }),
                        className: 'px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'
                    })
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm text-gray-600 mb-1' }, 'Start Date'),
                        React.createElement('input', {
                            type: 'datetime-local',
                            value: formData.start_date,
                            onChange: (e) => setFormData({ ...formData, start_date: e.target.value }),
                            className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { className: 'block text-sm text-gray-600 mb-1' }, 'Due Date'),
                        React.createElement('input', {
                            type: 'datetime-local',
                            value: formData.due_date,
                            onChange: (e) => setFormData({ ...formData, due_date: e.target.value }),
                            className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'
                        })
                    )
                ),
                React.createElement('div', { className: 'flex gap-3 pt-4' },
                    React.createElement('button', {
                        type: 'submit',
                        className: 'flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium'
                    }, React.createElement('i', { className: 'fas fa-save mr-2' }), task ? 'Update Task' : 'Create Task'),
                    React.createElement('button', {
                        type: 'button',
                        onClick: onClose,
                        className: 'px-6 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300'
                    }, 'Cancel')
                )
            )
        )
    );
}

// Dashboard Component
function Dashboard({ user, tasks, stats, onNavigate }) {
    const todayTasks = tasks.filter(t => {
        const today = new Date().toDateString();
        const taskDate = t.due_date ? new Date(t.due_date).toDateString() : null;
        return taskDate === today && !t.archived;
    });

    const upcomingTasks = tasks.filter(t => t.status === 'upcoming' && !t.archived).slice(0, 5);
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress' && !t.archived);
    const overdueTasks = tasks.filter(t => t.status === 'overdue' && !t.archived);

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' },
            React.createElement('i', { className: 'fas fa-chart-line text-indigo-600 mr-3' }),
            `Welcome back, ${user.name}!`
        ),
        
        // Stats Cards
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
            React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', null,
                        React.createElement('p', { className: 'text-gray-500 text-sm' }, 'Today'),
                        React.createElement('p', { className: 'text-3xl font-bold text-gray-800' }, todayTasks.length)
                    ),
                    React.createElement('i', { className: 'fas fa-calendar-day text-4xl text-blue-500' })
                )
            ),
            React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', null,
                        React.createElement('p', { className: 'text-gray-500 text-sm' }, 'In Progress'),
                        React.createElement('p', { className: 'text-3xl font-bold text-gray-800' }, inProgressTasks.length)
                    ),
                    React.createElement('i', { className: 'fas fa-play-circle text-4xl text-yellow-500' })
                )
            ),
            React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', null,
                        React.createElement('p', { className: 'text-gray-500 text-sm' }, 'Overdue'),
                        React.createElement('p', { className: 'text-3xl font-bold text-gray-800' }, overdueTasks.length)
                    ),
                    React.createElement('i', { className: 'fas fa-exclamation-triangle text-4xl text-red-500' })
                )
            ),
            React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
                React.createElement('div', { className: 'flex items-center justify-between' },
                    React.createElement('div', null,
                        React.createElement('p', { className: 'text-gray-500 text-sm' }, 'Total Active'),
                        React.createElement('p', { className: 'text-3xl font-bold text-gray-800' }, tasks.filter(t => !t.archived).length)
                    ),
                    React.createElement('i', { className: 'fas fa-tasks text-4xl text-indigo-500' })
                )
            )
        ),

        // Quick Actions
        React.createElement('div', { className: 'bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white' },
            React.createElement('h2', { className: 'text-xl font-bold mb-4' },
                React.createElement('i', { className: 'fas fa-bolt mr-2' }),
                'Quick Actions'
            ),
            React.createElement('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                React.createElement('button', {
                    onClick: () => onNavigate('tasks'),
                    className: 'bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 px-4 rounded-lg transition'
                },
                    React.createElement('i', { className: 'fas fa-list text-2xl mb-2' }),
                    React.createElement('p', { className: 'text-sm font-medium' }, 'All Tasks')
                ),
                React.createElement('button', {
                    onClick: () => onNavigate('focus'),
                    className: 'bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 px-4 rounded-lg transition'
                },
                    React.createElement('i', { className: 'fas fa-crosshairs text-2xl mb-2' }),
                    React.createElement('p', { className: 'text-sm font-medium' }, 'Focus Mode')
                ),
                React.createElement('button', {
                    onClick: () => {
                        if (!googleCalendar.isAuthorized()) {
                            googleCalendar.requestAuth();
                        } else {
                            alert('Already connected to Google Calendar!');
                        }
                    },
                    className: 'bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 px-4 rounded-lg transition'
                },
                    React.createElement('i', { className: 'fab fa-google text-2xl mb-2' }),
                    React.createElement('p', { className: 'text-sm font-medium' }, 'Connect Calendar')
                ),
                React.createElement('button', {
                    onClick: () => onNavigate('settings'),
                    className: 'bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 px-4 rounded-lg transition'
                },
                    React.createElement('i', { className: 'fas fa-cog text-2xl mb-2' }),
                    React.createElement('p', { className: 'text-sm font-medium' }, 'Settings')
                )
            )
        ),

        // Upcoming Tasks
        upcomingTasks.length > 0 && React.createElement('div', { className: 'bg-white rounded-xl shadow p-6' },
            React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-4' },
                React.createElement('i', { className: 'fas fa-clock text-indigo-600 mr-2' }),
                'Upcoming Tasks'
            ),
            React.createElement('div', { className: 'space-y-3' },
                upcomingTasks.map(task => React.createElement('div', { key: task.id, className: 'flex items-center justify-between p-3 bg-gray-50 rounded-lg' },
                    React.createElement('div', null,
                        React.createElement('p', { className: 'font-medium text-gray-800' }, task.title),
                        task.due_date && React.createElement('p', { className: 'text-sm text-gray-500' },
                            React.createElement('i', { className: 'fas fa-calendar mr-1' }),
                            new Date(task.due_date).toLocaleDateString()
                        )
                    ),
                    React.createElement('span', { className: `px-3 py-1 rounded-full text-xs font-medium ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}` }, task.priority)
                ))
            )
        )
    );
}

// Tasks Page Component
function TasksPage({ user, tasks, onRefresh }) {
    const [filter, setFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const filteredTasks = tasks.filter(t => {
        if (filter === 'all') return !t.archived;
        return t.status === filter && !t.archived;
    });

    const handleCreateTask = async (taskData) => {
        try {
            const result = await api.createTask(user.id, taskData);
            if (result.success) {
                // Create Google Calendar event if authorized
                if (googleCalendar.isAuthorized() && taskData.due_date) {
                    const eventId = await googleCalendar.createEvent(result.data);
                    if (eventId) {
                        await api.updateTask(user.id, result.data.id, { google_event_id: eventId });
                    }
                }
                setIsModalOpen(false);
                onRefresh();
            }
        } catch (error) {
            console.error('Create task error:', error);
            alert('Failed to create task');
        }
    };

    const handleUpdateTask = async (taskData) => {
        try {
            const result = await api.updateTask(user.id, editingTask.id, taskData);
            if (result.success) {
                // Update Google Calendar event if exists
                if (editingTask.google_event_id && googleCalendar.isAuthorized()) {
                    await googleCalendar.updateEvent(editingTask.google_event_id, result.data);
                }
                setIsModalOpen(false);
                setEditingTask(null);
                onRefresh();
            }
        } catch (error) {
            console.error('Update task error:', error);
            alert('Failed to update task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!confirm('Delete this task?')) return;
        
        try {
            const task = tasks.find(t => t.id === taskId);
            const result = await api.deleteTask(user.id, taskId);
            if (result.success) {
                // Delete Google Calendar event if exists
                if (task.google_event_id && googleCalendar.isAuthorized()) {
                    await googleCalendar.deleteEvent(task.google_event_id);
                }
                onRefresh();
            }
        } catch (error) {
            console.error('Delete task error:', error);
            alert('Failed to delete task');
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            const result = await api.updateTask(user.id, taskId, { status: newStatus });
            if (result.success) {
                const task = tasks.find(t => t.id === taskId);
                // Delete calendar event if completed
                if (newStatus === 'completed' && task.google_event_id && googleCalendar.isAuthorized()) {
                    await googleCalendar.deleteEvent(task.google_event_id);
                }
                onRefresh();
            }
        } catch (error) {
            console.error('Status change error:', error);
        }
    };

    return React.createElement('div', { className: 'space-y-6' },
        React.createElement('div', { className: 'flex justify-between items-center' },
            React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' },
                React.createElement('i', { className: 'fas fa-list text-indigo-600 mr-3' }),
                'My Tasks'
            ),
            React.createElement('button', {
                onClick: () => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                },
                className: 'bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium shadow-lg'
            },
                React.createElement('i', { className: 'fas fa-plus mr-2' }),
                'New Task'
            )
        ),

        // Filter Buttons
        React.createElement('div', { className: 'bg-white rounded-lg shadow p-4' },
            React.createElement('div', { className: 'flex flex-wrap gap-2' },
                ['all', 'upcoming', 'in-progress', 'completed', 'overdue'].map(f =>
                    React.createElement('button', {
                        key: f,
                        onClick: () => setFilter(f),
                        className: `px-4 py-2 rounded-lg font-medium transition ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
                    },
                        React.createElement('i', { className: `fas ${f === 'all' ? 'fa-list' : f === 'completed' ? 'fa-check-circle' : f === 'overdue' ? 'fa-exclamation-triangle' : f === 'in-progress' ? 'fa-play-circle' : 'fa-clock'} mr-2` }),
                        f.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    )
                )
            )
        ),

        // Tasks Grid
        filteredTasks.length === 0 ? React.createElement('div', { className: 'bg-white rounded-lg shadow p-12 text-center' },
            React.createElement('i', { className: 'fas fa-inbox text-6xl text-gray-300 mb-4' }),
            React.createElement('p', { className: 'text-xl text-gray-500' }, 'No tasks found'),
            React.createElement('p', { className: 'text-gray-400 mt-2' }, 'Create a new task to get started!')
        ) : React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
            filteredTasks.map(task =>
                React.createElement(TaskCard, {
                    key: task.id,
                    task: task,
                    onEdit: (t) => {
                        setEditingTask(t);
                        setIsModalOpen(true);
                    },
                    onDelete: handleDeleteTask,
                    onStatusChange: handleStatusChange
                })
            )
        ),

        React.createElement(TaskFormModal, {
            isOpen: isModalOpen,
            onClose: () => {
                setIsModalOpen(false);
                setEditingTask(null);
            },
            onSubmit: editingTask ? handleUpdateTask : handleCreateTask,
            task: editingTask
        })
    );
}

// Focus Mode Page
function FocusPage({ user, tasks }) {
    const [timer, setTimer] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const activeTasks = tasks.filter(t => t.status === 'in-progress' && !t.archived);

    useEffect(() => {
        let interval = null;
        if (isRunning && timer > 0) {
            interval = setInterval(() => {
                setTimer(t => t - 1);
            }, 1000);
        } else if (timer === 0) {
            setIsRunning(false);
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Focus Session Complete!', {
                    body: 'Great job! Take a break.',
                    icon: '/static/icon-192.png',
                });
            }
        }
        return () => clearInterval(interval);
    }, [isRunning, timer]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return React.createElement('div', { className: 'max-w-4xl mx-auto space-y-6' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-800 text-center' },
            React.createElement('i', { className: 'fas fa-crosshairs text-indigo-600 mr-3' }),
            'Focus Mode'
        ),

        // Pomodoro Timer
        React.createElement('div', { className: 'bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-12 text-white text-center' },
            React.createElement('div', { className: 'text-8xl font-bold mb-8' }, formatTime(timer)),
            React.createElement('div', { className: 'flex justify-center gap-4 mb-6' },
                React.createElement('button', {
                    onClick: () => setIsRunning(!isRunning),
                    className: 'bg-white text-indigo-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition'
                },
                    React.createElement('i', { className: `fas ${isRunning ? 'fa-pause' : 'fa-play'} mr-2` }),
                    isRunning ? 'Pause' : 'Start'
                ),
                React.createElement('button', {
                    onClick: () => {
                        setTimer(25 * 60);
                        setIsRunning(false);
                    },
                    className: 'bg-white/20 backdrop-blur-sm text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-white/30 transition'
                },
                    React.createElement('i', { className: 'fas fa-redo mr-2' }),
                    'Reset'
                )
            ),
            React.createElement('div', { className: 'flex justify-center gap-3' },
                [25, 15, 5].map(minutes =>
                    React.createElement('button', {
                        key: minutes,
                        onClick: () => setTimer(minutes * 60),
                        className: 'bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/30 transition'
                    }, `${minutes} min`)
                )
            )
        ),

        // Task Selection
        activeTasks.length > 0 && React.createElement('div', { className: 'bg-white rounded-xl shadow p-6' },
            React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-4' },
                React.createElement('i', { className: 'fas fa-tasks text-indigo-600 mr-2' }),
                'Focus on Task'
            ),
            React.createElement('div', { className: 'space-y-2' },
                activeTasks.map(task =>
                    React.createElement('button', {
                        key: task.id,
                        onClick: () => setSelectedTask(task),
                        className: `w-full text-left p-4 rounded-lg transition ${selectedTask?.id === task.id ? 'bg-indigo-100 border-2 border-indigo-600' : 'bg-gray-50 hover:bg-gray-100'}`
                    },
                        React.createElement('p', { className: 'font-medium text-gray-800' }, task.title),
                        task.description && React.createElement('p', { className: 'text-sm text-gray-600 mt-1' }, task.description)
                    )
                )
            )
        )
    );
}

// Settings Page
function SettingsPage({ user, settings, onUpdate }) {
    const [formData, setFormData] = useState({
        whatsapp_number: '',
        notifications_enabled: true,
        email_reminders: true,
        whatsapp_reminders: true,
        theme: 'light',
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                whatsapp_number: settings.whatsapp_number || '',
                notifications_enabled: !!settings.notifications_enabled,
                email_reminders: !!settings.email_reminders,
                whatsapp_reminders: !!settings.whatsapp_reminders,
                theme: settings.theme || 'light',
            });
        }
    }, [settings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const result = await api.updateSettings(user.id, formData);
            if (result.success) {
                alert('Settings saved successfully!');
                onUpdate();
            }
        } catch (error) {
            console.error('Update settings error:', error);
            alert('Failed to save settings');
        }
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                alert('Notifications enabled!');
            }
        }
    };

    return React.createElement('div', { className: 'max-w-2xl mx-auto space-y-6' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-800' },
            React.createElement('i', { className: 'fas fa-cog text-indigo-600 mr-3' }),
            'Settings'
        ),

        React.createElement('form', { onSubmit: handleSubmit, className: 'bg-white rounded-xl shadow p-6 space-y-6' },
            // Profile Section
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-4' },
                    React.createElement('i', { className: 'fas fa-user text-indigo-600 mr-2' }),
                    'Profile'
                ),
                React.createElement('div', { className: 'space-y-3 bg-gray-50 p-4 rounded-lg' },
                    React.createElement('p', null,
                        React.createElement('span', { className: 'font-medium text-gray-700' }, 'Name: '),
                        user.name
                    ),
                    React.createElement('p', null,
                        React.createElement('span', { className: 'font-medium text-gray-700' }, 'Email: '),
                        user.email
                    )
                )
            ),

            // Google Calendar
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-4' },
                    React.createElement('i', { className: 'fab fa-google text-indigo-600 mr-2' }),
                    'Google Calendar Integration'
                ),
                React.createElement('button', {
                    type: 'button',
                    onClick: () => {
                        if (!googleCalendar.isAuthorized()) {
                            googleCalendar.requestAuth();
                        } else {
                            alert('Already connected!');
                        }
                    },
                    className: `w-full ${googleCalendar.isAuthorized() ? 'bg-green-600' : 'bg-indigo-600'} text-white py-3 rounded-lg hover:opacity-90 font-medium`
                },
                    React.createElement('i', { className: `fas ${googleCalendar.isAuthorized() ? 'fa-check-circle' : 'fa-link'} mr-2` }),
                    googleCalendar.isAuthorized() ? 'Connected to Google Calendar' : 'Connect Google Calendar'
                )
            ),

            // Notifications
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-4' },
                    React.createElement('i', { className: 'fas fa-bell text-indigo-600 mr-2' }),
                    'Notifications'
                ),
                React.createElement('div', { className: 'space-y-3' },
                    React.createElement('label', { className: 'flex items-center justify-between' },
                        React.createElement('span', { className: 'text-gray-700' }, 'Browser Notifications'),
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: formData.notifications_enabled,
                            onChange: (e) => setFormData({ ...formData, notifications_enabled: e.target.checked }),
                            className: 'w-5 h-5 text-indigo-600'
                        })
                    ),
                    React.createElement('label', { className: 'flex items-center justify-between' },
                        React.createElement('span', { className: 'text-gray-700' }, 'Email Reminders'),
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: formData.email_reminders,
                            onChange: (e) => setFormData({ ...formData, email_reminders: e.target.checked }),
                            className: 'w-5 h-5 text-indigo-600'
                        })
                    ),
                    React.createElement('label', { className: 'flex items-center justify-between' },
                        React.createElement('span', { className: 'text-gray-700' }, 'WhatsApp Reminders'),
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: formData.whatsapp_reminders,
                            onChange: (e) => setFormData({ ...formData, whatsapp_reminders: e.target.checked }),
                            className: 'w-5 h-5 text-indigo-600'
                        })
                    ),
                    React.createElement('button', {
                        type: 'button',
                        onClick: requestNotificationPermission,
                        className: 'w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium'
                    }, 'Enable Browser Notifications')
                )
            ),

            // WhatsApp Number
            React.createElement('div', null,
                React.createElement('h2', { className: 'text-xl font-bold text-gray-800 mb-4' },
                    React.createElement('i', { className: 'fab fa-whatsapp text-green-600 mr-2' }),
                    'WhatsApp'
                ),
                React.createElement('input', {
                    type: 'tel',
                    placeholder: 'WhatsApp Number (e.g., +1234567890)',
                    value: formData.whatsapp_number,
                    onChange: (e) => setFormData({ ...formData, whatsapp_number: e.target.value }),
                    className: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500'
                }),
                React.createElement('p', { className: 'text-sm text-gray-500 mt-2' }, 'Include country code (e.g., +1 for US)')
            ),

            React.createElement('button', {
                type: 'submit',
                className: 'w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium'
            },
                React.createElement('i', { className: 'fas fa-save mr-2' }),
                'Save Settings'
            )
        ),

        // Logout Button
        React.createElement('button', {
            onClick: () => {
                localStorage.clear();
                window.location.reload();
            },
            className: 'w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 font-medium'
        },
            React.createElement('i', { className: 'fas fa-sign-out-alt mr-2' }),
            'Logout'
        )
    );
}

// Main App Component
function App() {
    const [state, setState] = useState(appState.getState());
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const unsubscribe = appState.subscribe(setState);
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (state.user) {
            loadData();
            googleCalendar.initGoogleAPI();
            scheduler.start(state.user.id);
        }
        return () => scheduler.stop();
    }, [state.user]);

    const loadData = async () => {
        if (!state.user) return;
        
        try {
            const [tasksResult, settingsResult, statsResult] = await Promise.all([
                api.getTasks(state.user.id),
                api.getSettings(state.user.id),
                api.getStats(state.user.id),
            ]);

            if (tasksResult.success) {
                appState.setState({ tasks: tasksResult.data });
            }
            if (settingsResult.success) {
                appState.setState({ settings: settingsResult.data });
            }
            if (statsResult.success) {
                setStats(statsResult.data);
            }
        } catch (error) {
            console.error('Load data error:', error);
        }
    };

    const handleLogin = (user) => {
        appState.setState({ user });
    };

    const handleNavigate = (page) => {
        appState.setState({ currentPage: page });
    };

    if (!state.user) {
        return React.createElement(AuthPage, { onLogin: handleLogin });
    }

    // Navigation
    const NavBar = React.createElement('nav', { className: 'bg-white shadow-lg sticky top-0 z-40' },
        React.createElement('div', { className: 'container mx-auto px-4' },
            React.createElement('div', { className: 'flex items-center justify-between h-16' },
                React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('i', { className: 'fas fa-tasks text-2xl text-indigo-600' }),
                    React.createElement('span', { className: 'text-xl font-bold text-gray-800' }, 'TaskFlow Lite')
                ),
                React.createElement('div', { className: 'flex gap-1' },
                    ['dashboard', 'tasks', 'focus', 'settings'].map(page =>
                        React.createElement('button', {
                            key: page,
                            onClick: () => handleNavigate(page),
                            className: `px-4 py-2 rounded-lg font-medium transition ${state.currentPage === page ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`
                        },
                            React.createElement('i', { className: `fas ${page === 'dashboard' ? 'fa-chart-line' : page === 'tasks' ? 'fa-list' : page === 'focus' ? 'fa-crosshairs' : 'fa-cog'} mr-2` }),
                            page.charAt(0).toUpperCase() + page.slice(1)
                        )
                    )
                )
            )
        )
    );

    // Page Content
    let PageContent;
    switch (state.currentPage) {
        case 'tasks':
            PageContent = React.createElement(TasksPage, { user: state.user, tasks: state.tasks, onRefresh: loadData });
            break;
        case 'focus':
            PageContent = React.createElement(FocusPage, { user: state.user, tasks: state.tasks });
            break;
        case 'settings':
            PageContent = React.createElement(SettingsPage, { user: state.user, settings: state.settings, onUpdate: loadData });
            break;
        default:
            PageContent = React.createElement(Dashboard, { user: state.user, tasks: state.tasks, stats: stats, onNavigate: handleNavigate });
    }

    return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
        NavBar,
        React.createElement('main', { className: 'container mx-auto px-4 py-8' }, PageContent)
    );
}

// Render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
