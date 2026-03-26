// Centralized Content Type Configuration
window.CONTENT_TYPE_CONFIG = {
    PAGE: { icon: 'description', color: 'indigo', label: 'Page' },
    PDF: { icon: 'picture_as_pdf', color: 'cyan', label: 'PDF Document' },
    VIDEO: { icon: 'play_circle', color: 'red', label: 'Video' },
    AUDIO: { icon: 'mic', color: 'purple', label: 'Audio' },
    IMAGE: { icon: 'image', color: 'emerald', label: 'Image' },
    SLIDES: { icon: 'present_to_all', color: 'amber', label: 'Slides' },
    QUIZ: { icon: 'quiz', color: 'teal', label: 'Quiz' },
    LINK: { icon: 'link', color: 'indigo', label: 'Link' },
    DEFAULT: { icon: 'draft', color: 'slate', label: 'Content Item' }
};
const CONTENT_TYPE_CONFIG = window.CONTENT_TYPE_CONFIG;

// // Security: DOMPurify Sanitization Helpers
const sanitizeHTML = (content, config = {}) => {
    if (!window.DOMPurify) return content;
    const defaultConfig = {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'class', 'style', 'src']
    };
    return window.DOMPurify.sanitize(content, { ...defaultConfig, ...config });
};

const sanitizeText = str => {
    if (!str) return '';
    if (!window.DOMPurify) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    return window.DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });
};

// Shared Design System Variables
const injectSharedStyles = () => {
    if (document.getElementById('ai-academy-shared-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-academy-shared-styles';
    style.textContent = `
        :root {
            --ai-primary: #1b5ffe;
            --ai-primary-hover: #154cd6;
            --ai-primary-soft: rgba(27, 95, 254, 0.1);
            --ai-bg-dark: #0f1523;
            --ai-bg-card: #0a0f1a;
            --ai-bg-active: rgba(255, 255, 255, 0.05);
            --ai-border: #1e293b;
            --ai-border-bright: #334155;
            --ai-text-main: #f8fafc;
            --ai-text-dim: #94a3b8;
            --ai-text-muted: #64748b;
            --ai-danger: #ef4444;
            --ai-danger-hover: #dc2626;
            --ai-danger-soft: rgba(239, 68, 68, 0.1);
            --ai-success: #10b981;
            --ai-warning: #f59e0b;
            --ai-radius-sm: 0.375rem;
            --ai-radius-md: 0.5rem;
            --ai-radius-lg: 0.75rem;
            --ai-radius-xl: 1rem;
            --ai-radius-2xl: 1.5rem;
            --ai-blur: blur(12px);
            --ai-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            --ai-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
        }
        .apple-blur {
            backdrop-filter: var(--ai-blur);
            -webkit-backdrop-filter: var(--ai-blur);
        }
        .ai-dropdown-menu {
            display: none;
            position: absolute;
            right: 0;
            top: 100%;
            background: var(--ai-bg-dark);
            border: 1px solid var(--ai-border);
            border-radius: var(--ai-radius-md);
            box-shadow: var(--ai-shadow-lg);
            z-index: 50;
            min-width: 160px;
            overflow: hidden;
            animation: aiFadeIn 0.2s ease-out;
        }
        .ai-dropdown-menu.show {
            display: block;
        }
        @keyframes aiFadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiPulse {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 20px var(--ai-primary); }
            100% { transform: scale(1); opacity: 0.8; }
        }
        .ai-pulse {
            animation: aiPulse 2s infinite ease-in-out;
        }
        .ai-dropdown-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            color: var(--ai-text-dim);
            transition: all 0.2s;
            width: 100%;
            text-align: left;
            border: none;
            background: transparent;
            cursor: pointer;
        }
        .ai-dropdown-item:hover {
            background: var(--ai-bg-active);
            color: var(--ai-text-main);
        }
        .ai-dropdown-item.delete:hover {
            background: var(--ai-danger);
            color: white;
        }
    `;
    document.head.appendChild(style);
};

// IndexedDB File Store for Persistence
class AiFileStore {
    constructor() {
        this.dbName = 'AiAcademyEditor';
        this.storeName = 'Files';
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            request.onsuccess = e => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = e => reject(e.target.error);
        });
    }

    async save(id, file) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(file, id);
            request.onsuccess = () => resolve();
            request.onerror = e => reject(e.target.error);
        });
    }

    async get(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = e => reject(e.target.error);
        });
    }

    async delete(id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = e => reject(e.target.error);
        });
    }
}

const aiFileStore = new AiFileStore();
injectSharedStyles();

async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        sessionStorage.clear();
        // Clear track specific local storage if needed, but sessionStorage is the main one used here
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        sessionStorage.clear();
        window.location.href = 'index.html';
    }
}
window.handleLogout = handleLogout;

window.getInitials = name => {
    if (!name || typeof name !== 'string') return '??';
    const trimmed = name.trim();
    if (!trimmed) return '??';

    // Split by any whitespace
    const parts = trimmed.split(/\s+/).filter(p => p.length > 0);

    if (parts.length > 1) {
        const first = parts[0][0];
        const last = parts[parts.length - 1][0];
        return (first + last).toUpperCase();
    }

    // Single word fallback
    if (trimmed.length >= 2) {
        return trimmed.substring(0, 2).toUpperCase();
    }
    return (trimmed[0] + trimmed[0]).toUpperCase();
};

class LearnerHeader extends HTMLElement {
    connectedCallback() {
        injectSharedStyles();
        this.innerHTML = `
        <header class="sticky top-0 z-50 w-full border-b border-[var(--ai-border)] bg-[var(--ai-bg-dark)]/80 apple-blur">
            <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <div class="flex items-center gap-3">
                    <img alt="Four Js Logo" class="h-6 w-auto object-contain" src="logo.png">
                    <span class="text-[18px] md:text-[20px] font-normal tracking-wide text-white font-display">Academy</span>
                </div>
                <div class="flex items-center gap-3">
                    <div id="admin-link-container"></div>
                    <div class="relative notifications-dropdown-container">
                        <button class="w-9 h-9 flex items-center justify-center text-[var(--ai-text-dim)] bg-[var(--ai-bg-active)] hover:bg-slate-700 rounded-[var(--ai-radius-md)] transition-all border border-[var(--ai-border)] notifications-toggle-btn">
                            <span class="material-symbols-outlined text-[20px]">notifications</span>
                            <span class="notification-dot"></span>
                        </button>
                        <div class="ai-dropdown-menu notifications-menu p-0">
                            <div class="px-4 py-3 border-b border-[var(--ai-border)] flex justify-between items-center bg-slate-900/80">
                                <span class="text-[10px] font-bold text-white uppercase tracking-wider">Notifications</span>
                                <button class="text-[9px] font-bold text-primary hover:text-white transition-colors read-all-btn uppercase">Mark all as read</button>
                            </div>
                            <div id="notifications-list" class="max-h-[320px] overflow-y-auto">
                                <div class="notifications-empty">Loading...</div>
                            </div>
                        </div>
                    </div>
                    <div class="relative profile-dropdown-container">
                        <button class="w-9 h-9 flex items-center justify-center text-[11px] font-bold text-[var(--ai-primary)] bg-[var(--ai-primary-soft)] hover:bg-slate-700 rounded-[var(--ai-radius-md)] transition-all border border-[var(--ai-border)] profile-toggle-btn">
                            <span class="profile-initials-display">??</span>
                        </button>
                            <div class="ai-dropdown-menu profile-menu pt-1">
                                <div class="px-4 py-2 border-b border-[var(--ai-border)] mb-1">
                                    <p class="text-xs font-bold text-white truncate" id="dropdown-user-name">User</p>
                                    <p class="text-[10px] text-[var(--ai-text-muted)] truncate" id="dropdown-user-role">Learner</p>
                                </div>
                                <button class="ai-dropdown-item edit-profile-btn">
                                    <span class="material-symbols-outlined text-lg">manage_accounts</span>
                                    Edit Profile
                                </button>
                                <button onclick="handleLogout()" class="ai-dropdown-item delete">
                                    <span class="material-symbols-outlined text-lg">logout</span>
                                    Sign Out
                                </button>
                            </div>
                    </div>
                </div>
            </div>
        </header>
        `;

        // Execute the fetch asynchronously without blocking the component rendering
        this.checkAdminStatus();
        this.setupDropdown();
        this.fetchNotificationsCount();
    }

    setupDropdown() {
        const toggleBtn = this.querySelector('.profile-toggle-btn');
        const menu = this.querySelector('.profile-menu');

        if (toggleBtn && menu) {
            toggleBtn.addEventListener('click', e => {
                e.stopPropagation();
                menu.classList.toggle('show');
                // Close other menus
                const notifMenu = this.querySelector('.notifications-menu');
                if (notifMenu) notifMenu.classList.remove('show');
            });

            const editBtn = this.querySelector('.edit-profile-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    const profileModal = document.querySelector('ai-profile-modal');
                    if (profileModal) profileModal.show();
                });
            }

            document.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        }

        // Notifications Dropdown
        const notifBtn = this.querySelector('.notifications-toggle-btn');
        const notifMenu = this.querySelector('.notifications-menu');

        if (notifBtn && notifMenu) {
            notifBtn.addEventListener('click', e => {
                e.stopPropagation();
                notifMenu.classList.toggle('show');
                // Close other menus
                const profileMenu = this.querySelector('.profile-menu');
                if (profileMenu) profileMenu.classList.remove('show');

                if (notifMenu.classList.contains('show')) {
                    this.fetchNotificationsList();
                }
            });

            // Close notifications menu when clicking outside
            document.addEventListener('click', () => {
                notifMenu.classList.remove('show');
            });

            const readAllBtn = this.querySelector('.read-all-btn');
            if (readAllBtn) {
                readAllBtn.addEventListener('click', async e => {
                    e.stopPropagation();
                    await this.markAllAsRead();
                });
            }
        }

        // Update name/role from session if available
        const nameEl = this.querySelector('#dropdown-user-name');
        const roleEl = this.querySelector('#dropdown-user-role');
        const storedName = sessionStorage.getItem('userName');
        const storedRole = sessionStorage.getItem('userRole');

        if (nameEl && storedName) {
            nameEl.textContent = storedName;
            const initialsEl = this.querySelector('.profile-initials-display');
            if (initialsEl) {
                const initials = window.getInitials(storedName);
                initialsEl.textContent = initials;
                window.__ai_last_learner_info = { name: storedName, initials: initials };
            }
        }
        if (roleEl && storedRole) roleEl.textContent = storedRole;
    }

    async checkAdminStatus() {
        try {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                if (data.user && data.user.role === 'ADMIN') {
                    const adminLinkContainer = this.querySelector('#admin-link-container');
                    if (adminLinkContainer) {
                        adminLinkContainer.innerHTML = `
                            <a href="admin-dashboard.html" class="flex items-center gap-2 px-3 h-9 text-slate-300 bg-[#1e293b] hover:bg-[#1b5ffe]/10 hover:text-[#1b5ffe] rounded-lg transition-all border border-slate-700/50 hover:border-[#1b5ffe]/30 text-sm font-medium mr-2">
                                <span class="material-symbols-outlined text-[18px]">shield_person</span>
                                Admin Portal
                            </a>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user info for header:', error);
        }
    }

    async fetchNotificationsCount() {
        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const dot = this.querySelector('.notification-dot');
                if (dot) {
                    if (data.unreadCount > 0) dot.classList.add('show');
                    else dot.classList.remove('show');
                }
            }
        } catch (err) {
            console.error('Fetch count error:', err);
        }
    }

    async fetchNotificationsList() {
        const list = this.querySelector('#notifications-list');
        if (!list) return;

        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.notifications.length === 0) {
                    list.innerHTML = '<div class="notifications-empty">No notifications yet</div>';
                } else {
                    list.innerHTML = data.notifications
                        .map(
                            n => `
                        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                            <div class="flex justify-between items-start">
                                <div class="time">${new Date(n.createdAt).toLocaleTimeString()} · ${new Date(n.createdAt).toLocaleDateString()}</div>
                                <button class="delete-notification-btn text-[var(--ai-text-muted)] hover:text-[var(--ai-danger)] transition-colors" title="Delete notification">
                                    <span class="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                            <div class="title">${sanitizeHTML(n.title)}</div>
                            <div class="message">${sanitizeHTML(n.message)}</div>
                        </div>
                    `
                        )
                        .join('');

                    // Add click listeners to items
                    list.querySelectorAll('.notification-item').forEach(item => {
                        item.addEventListener('click', async e => {
                            e.stopPropagation();
                            const id = item.dataset.id;
                            await this.markAsRead(id);
                            item.classList.remove('unread');
                        });

                        // Add click listener to delete button
                        const deleteBtn = item.querySelector('.delete-notification-btn');
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', async e => {
                                e.stopPropagation();
                                console.log('[LearnerHeader] Deleting notification:', item.dataset.id);
                                const id = item.dataset.id;
                                await this.deleteNotification(id);
                            });
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Fetch list error:', err);
            list.innerHTML = '<div class="notifications-empty">Error loading alerts</div>';
        }
    }

    async deleteNotification(id) {
        try {
            const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                this.fetchNotificationsCount();
                this.fetchNotificationsList();
            }
        } catch (err) {
            console.error('Delete notification error:', err);
        }
    }

    async markAsRead(id) {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
            this.fetchNotificationsCount();
        } catch (err) {
            console.error('Mark read error:', err);
        }
    }

    async markAllAsRead() {
        try {
            await fetch('/api/notifications/read-all', { method: 'PATCH', credentials: 'include' });
            this.fetchNotificationsCount();
            this.fetchNotificationsList();
        } catch (err) {
            console.error('Mark all read error:', err);
        }
    }
}

class AdminHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <header class="border-b border-[var(--ai-border)] bg-[var(--ai-bg-dark)]/90 apple-blur px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm z-50 w-full shrink-0 h-[60px] sticky top-0">
            <div class="flex items-center gap-4">
                <button id="mobile-menu-toggle" class="lg:hidden w-10 h-10 flex items-center justify-center text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-all border border-slate-700">
                    <span class="material-symbols-outlined">menu</span>
                </button>
                <span class="text-[18px] lg:text-[20px] font-normal tracking-wide text-white font-display flex items-center">
                    <img alt="Four Js Logo" class="h-6 w-auto object-contain mr-3" src="logo.png">
                    <span class="hidden sm:inline">Academy</span>
                    <span class="ml-2 lg:ml-4 pl-2 lg:pl-4 border-l border-[var(--ai-border)] text-[var(--ai-text-muted)] text-[10px] lg:text-xs font-semibold tracking-wider uppercase flex items-center pt-1">Admin Portal</span>
                </span>
            </div>
            <div class="flex items-center gap-3">
                <div class="relative notifications-dropdown-container">
                    <button class="w-9 h-9 flex items-center justify-center text-[var(--ai-text-dim)] bg-[var(--ai-bg-active)] hover:bg-slate-700 rounded-[var(--ai-radius-md)] transition-all border border-[var(--ai-border)] notifications-toggle-btn">
                        <span class="material-symbols-outlined text-[20px]">notifications</span>
                        <span class="notification-dot"></span>
                    </button>
                    <div class="ai-dropdown-menu notifications-menu p-0">
                        <div class="px-4 py-3 border-b border-[var(--ai-border)] flex justify-between items-center bg-slate-900/80">
                            <span class="text-[10px] font-bold text-white uppercase tracking-wider">Notifications</span>
                            <button class="text-[9px] font-bold text-primary hover:text-white transition-colors read-all-btn uppercase">Mark all as read</button>
                        </div>
                        <div id="notifications-list" class="max-h-[320px] overflow-y-auto">
                            <div class="notifications-empty">Loading...</div>
                        </div>
                    </div>
                </div>
                <div class="relative profile-dropdown-container">
                    <button class="w-9 h-9 flex items-center justify-center text-[11px] font-bold text-[var(--ai-primary)] bg-[var(--ai-primary-soft)] hover:bg-slate-700 rounded-[var(--ai-radius-md)] transition-all border border-[var(--ai-border)] profile-toggle-btn">
                        <span class="profile-initials-display">??</span>
                    </button>
                    <div class="ai-dropdown-menu profile-menu pt-1">
                        <div class="px-4 py-2 border-b border-[var(--ai-border)] mb-1">
                            <p class="text-xs font-bold text-white truncate" id="admin-dropdown-name">Admin User</p>
                            <p class="text-[10px] text-[var(--ai-text-muted)] truncate" id="admin-dropdown-role">System Administrator</p>
                        </div>
                        <button class="ai-dropdown-item edit-profile-btn">
                            <span class="material-symbols-outlined text-lg">manage_accounts</span>
                            Edit Profile
                        </button>
                        <button onclick="handleLogout()" class="ai-dropdown-item delete">
                            <span class="material-symbols-outlined text-lg">logout</span>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>
        `;
        this.setupDropdown();
        this.setupMobileToggle();
        this.fetchNotificationsCount();
    }

    setupMobileToggle() {
        const toggleBtn = this.querySelector('#mobile-menu-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', e => {
                e.stopPropagation();
                const sidebar = document.querySelector('admin-sidebar');
                if (sidebar) sidebar.toggleMobile();
            });
        }
    }

    setupDropdown() {
        const toggleBtn = this.querySelector('.profile-toggle-btn');
        const menu = this.querySelector('.profile-menu');

        if (toggleBtn && menu) {
            toggleBtn.addEventListener('click', e => {
                e.stopPropagation();
                menu.classList.toggle('show');
                const notifMenu = this.querySelector('.notifications-menu');
                if (notifMenu) notifMenu.classList.remove('show');
            });

            const editBtn = this.querySelector('.edit-profile-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    const profileModal = document.querySelector('ai-profile-modal');
                    if (profileModal) profileModal.show();
                });
            }

            document.addEventListener('click', () => {
                menu.classList.remove('show');
            });
        }

        // Notifications Dropdown for Admin
        const notifBtn = this.querySelector('.notifications-toggle-btn');
        const notifMenu = this.querySelector('.notifications-menu');
        if (notifBtn && notifMenu) {
            notifBtn.addEventListener('click', e => {
                e.stopPropagation();
                notifMenu.classList.toggle('show');
                const adminMenu = this.querySelector('.profile-menu');
                if (adminMenu) adminMenu.classList.remove('show');
                if (notifMenu.classList.contains('show')) {
                    this.fetchNotificationsList();
                }
            });
            document.addEventListener('click', () => {
                notifMenu.classList.remove('show');
            });

            const readAllBtn = this.querySelector('.read-all-btn');
            if (readAllBtn) {
                readAllBtn.addEventListener('click', async e => {
                    e.stopPropagation();
                    await this.markAllAsRead();
                });
            }
        }

        // Update admin info from session
        const nameEl = this.querySelector('#admin-dropdown-name');
        const roleEl = this.querySelector('#admin-dropdown-role');
        const storedName = sessionStorage.getItem('userName');
        const storedRole = sessionStorage.getItem('userRole');

        if (nameEl && storedName) {
            nameEl.textContent = storedName;
            const initialsEl = this.querySelector('.profile-initials-display');
            if (initialsEl) {
                const initials = window.getInitials(storedName);
                initialsEl.textContent = initials;
                window.__ai_last_admin_info = { name: storedName, initials: initials };
            }
        }
        if (roleEl && storedRole) roleEl.textContent = storedRole;
    }

    async fetchNotificationsCount() {
        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const dot = this.querySelector('.notification-dot');
                if (dot) {
                    if (data.unreadCount > 0) dot.classList.add('show');
                    else dot.classList.remove('show');
                }
            }
        } catch (err) {
            console.error('Admin Fetch count error:', err);
        }
    }

    async fetchNotificationsList() {
        const list = this.querySelector('#notifications-list');
        if (!list) return;
        try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.notifications.length === 0) {
                    list.innerHTML = '<div class="notifications-empty">No notifications yet</div>';
                } else {
                    list.innerHTML = data.notifications
                        .map(
                            n => `
                        <div class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
                            <div class="flex justify-between items-start">
                                <div class="time">${new Date(n.createdAt).toLocaleTimeString()} · ${new Date(n.createdAt).toLocaleDateString()}</div>
                                <button class="delete-notification-btn text-[var(--ai-text-muted)] hover:text-[var(--ai-danger)] transition-colors" title="Delete notification">
                                    <span class="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                            <div class="title">${sanitizeHTML(n.title)}</div>
                            <div class="message">${sanitizeHTML(n.message)}</div>
                        </div>
                    `
                        )
                        .join('');

                    list.querySelectorAll('.notification-item').forEach(item => {
                        item.addEventListener('click', async e => {
                            e.stopPropagation();
                            const id = item.dataset.id;
                            await this.markAsRead(id);
                            item.classList.remove('unread');
                        });
                        const deleteBtn = item.querySelector('.delete-notification-btn');
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', async e => {
                                e.stopPropagation();
                                console.log('[AdminHeader] Deleting notification:', item.dataset.id);
                                await this.deleteNotification(item.dataset.id);
                            });
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Admin Fetch list error:', err);
            list.innerHTML = '<div class="notifications-empty">Error loading alerts</div>';
        }
    }

    async deleteNotification(id) {
        try {
            const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                this.fetchNotificationsCount();
                this.fetchNotificationsList();
            }
        } catch (err) {
            console.error('Admin Delete error:', err);
        }
    }

    async markAsRead(id) {
        try {
            await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
            this.fetchNotificationsCount();
        } catch (err) {
            console.error('Admin Mark as read error:', err);
        }
    }

    async markAllAsRead() {
        try {
            const res = await fetch('/api/notifications/read-all', { method: 'PATCH', credentials: 'include' });
            if (res.ok) {
                this.fetchNotificationsCount();
                this.fetchNotificationsList();
            }
        } catch (err) {
            console.error('Admin Mark all read error:', err);
        }
    }
}

class AdminSidebar extends HTMLElement {
    constructor() {
        super();
        this.isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        this.isMobileOpen = false;
    }

    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        localStorage.setItem('sidebar-collapsed', this.isCollapsed);
        this.render();
    }

    toggleMobile() {
        this.isMobileOpen = !this.isMobileOpen;
        this.render();
    }

    connectedCallback() {
        this.classList.add('flex', 'flex-col', 'h-full', 'shrink-0');
        this.render();

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024 && this.isMobileOpen) {
                this.isMobileOpen = false;
                this.render();
            }
        });

        // Close mobile menu on click outside
        document.addEventListener('click', e => {
            if (this.isMobileOpen && !this.contains(e.target)) {
                this.isMobileOpen = false;
                this.render();
            }
        });
    }

    render() {
        const activePage = this.getAttribute('active-page') || 'dashboard';

        // Update host classes
        this.classList.toggle('sidebar-collapsed', this.isCollapsed);

        const collapsedClass = this.isCollapsed ? 'sidebar-collapsed' : '';
        const mobileClass = this.isMobileOpen ? 'mobile-open' : '';

        const getLinkClasses = page => {
            const base =
                page === activePage
                    ? 'bg-[#1b5ffe]/10 border border-[#1b5ffe]/20 text-[#1b5ffe] font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 font-medium';
            return `flex items-center ${this.isCollapsed ? 'justify-center' : 'gap-4 px-4'} py-3 rounded-lg text-sm transition-all duration-200 ${base}`;
        };

        const getIconClasses = page => {
            if (page === activePage) {
                return 'material-symbols-outlined text-xl bg-[#1b5ffe] text-white rounded p-0.5';
            }
            return 'material-symbols-outlined text-xl';
        };

        this.innerHTML = `
        <style>
            admin-sidebar {
                width: var(--sidebar-width);
                transition: var(--sidebar-transition);
                background: var(--ai-bg-card);
                border-right: 1px solid var(--ai-border);
            }
            admin-sidebar.sidebar-collapsed {
                width: var(--sidebar-collapsed-width);
            }
            @media (max-width: 1023px) {
                admin-sidebar {
                    position: fixed;
                    inset: 0;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 10000;
                    pointer-events: none;
                    display: block;
                    visibility: hidden;
                    background: transparent;
                    border-right: none;
                }
                admin-sidebar[data-mobile-open="true"] {
                    visibility: visible;
                }
                .mobile-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    z-index: 10001;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                admin-sidebar[data-mobile-open="true"] .mobile-overlay {
                    opacity: 1;
                    pointer-events: auto;
                }
                .sidebar-drawer {
                    position: fixed;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    width: 280px !important;
                    background: var(--ai-bg-card) !important;
                    border-right: 1px solid var(--ai-border);
                    z-index: 10002;
                    pointer-events: auto;
                    transform: translateX(-100%);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 20px 0 50px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                }
                admin-sidebar[data-mobile-open="true"] .sidebar-drawer {
                    transform: translateX(0);
                }
            }
        </style>
        <div class="mobile-overlay lg:hidden"></div>
        <aside class="sidebar-drawer ${collapsedClass} flex flex-col p-4 h-full w-full transition-all duration-300">
            <div class="flex items-center ${this.isCollapsed ? 'justify-center' : 'justify-between'} mb-6">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ${this.isCollapsed ? 'hidden' : ''}">Navigation</p>
                <div class="flex items-center gap-1">
                    <button id="sidebar-toggle" class="hidden lg:flex w-8 h-8 items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                        <span class="material-symbols-outlined text-xl">${this.isCollapsed ? 'last_page' : 'first_page'}</span>
                    </button>
                    <button id="mobile-close" class="lg:hidden w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-slate-700">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </div>

            <nav class="space-y-1.5 flex-1">
                <a href="admin-dashboard.html" class="${getLinkClasses('dashboard')}" title="Reports">
                    <span class="${getIconClasses('dashboard')}">bar_chart</span>
                    <span class="sidebar-label ${this.isCollapsed ? 'hidden' : ''}">Reports</span>
                </a>
                <a href="admin-employees.html" class="${getLinkClasses('employees')}" title="Employees">
                    <span class="${getIconClasses('employees')}">group</span>
                    <span class="sidebar-label ${this.isCollapsed ? 'hidden' : ''}">Employees</span>
                </a>
                <a href="admin-tracks.html" class="${getLinkClasses('tracks')}" title="Tracks">
                    <span class="${getIconClasses('tracks')}">route</span>
                    <span class="sidebar-label ${this.isCollapsed ? 'hidden' : ''}">Tracks</span>
                </a>
                <span class="${getLinkClasses('settings')} cursor-not-allowed opacity-50" title="Settings">
                    <span class="${getIconClasses('settings')}">settings</span>
                    <span class="sidebar-label ${this.isCollapsed ? 'hidden' : ''}">Settings</span>
                </span>
            </nav>

            <div class="flex items-center ${this.isCollapsed ? 'justify-center' : 'gap-3 px-2'} py-4 border-t border-[var(--ai-border)] mt-auto w-full">
                <div class="w-9 h-9 rounded-full bg-[var(--ai-primary-soft)] flex items-center justify-center text-[var(--ai-primary)] text-sm font-bold shrink-0 sidebar-avatar">??</div>
                <div class="flex-1 overflow-hidden ${this.isCollapsed ? 'hidden' : ''}">
                    <p class="text-white text-[13px] font-semibold truncate leading-tight sidebar-user-name">User</p>
                    <p class="text-[var(--ai-text-muted)] text-[10px] truncate sidebar-user-role">Role</p>
                </div>
            </div>
        </aside>
        `;

        // Update technical attributes for CSS matching
        this.setAttribute('data-mobile-open', this.isMobileOpen);

        this.setupEventListeners();
        this.updateUserInfo();
    }

    setupEventListeners() {
        // Sidebar Toggle (Desktop Collapse)
        this.querySelector('#sidebar-toggle')?.addEventListener('click', e => {
            e.stopPropagation();
            this.toggleCollapse();
        });

        // Mobile Close Button
        this.querySelector('#mobile-close')?.addEventListener('click', e => {
            e.stopPropagation();
            this.toggleMobile();
        });

        // Overlay Close Click
        this.querySelector('.mobile-overlay')?.addEventListener('click', e => {
            e.stopPropagation();
            this.toggleMobile();
        });
    }

    updateUserInfo() {
        const nameEl = this.querySelector('.sidebar-user-name');
        const roleEl = this.querySelector('.sidebar-user-role');
        const avatarEl = this.querySelector('.sidebar-avatar');
        const storedName = sessionStorage.getItem('userName');
        const storedRole = sessionStorage.getItem('userRole');

        if (nameEl && storedName) {
            nameEl.textContent = storedName;
            if (avatarEl) {
                const initials = window.getInitials(storedName);
                avatarEl.textContent = initials;
                window.__ai_last_sidebar_info = { name: storedName, initials: initials };
            }
        }
        if (roleEl && storedRole) roleEl.textContent = storedRole;
    }
}

class AiModule extends HTMLElement {
    connectedCallback() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        const step = this.getAttribute('step') || '01';
        let title = this.getAttribute('title') || 'Module Title';

        // Preserve children by moving them out temporarily
        const children = Array.from(this.childNodes);

        this.innerHTML = `
            <style>
                ai-module {
                    display: block;
                    width: 100%;
                }
            </style>
            <section class="group relative bg-slate-900/40 border border-slate-800 rounded-xl overflow-visible module-container w-full">
                <!-- Module Header -->
                <div class="p-5 flex items-center justify-between bg-slate-900/60 border-b border-slate-800">
                    <div class="flex items-center gap-4">
                        <div class="drag-handle text-slate-600 hover:text-slate-400 transition-colors cursor-pointer ${sessionStorage.getItem('userRole') === 'ADMIN' && !window.location.search.includes('preview=true') ? '' : 'hidden'}">
                            <span class="material-symbols-outlined">drag_indicator</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                                    Module ${sanitizeText(step)}
                                </span>
                                <div id="module-progress-stat" class="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full uppercase tracking-widest hidden">
                                    0/0 Completed
                                </div>
                            </div>
                            <h3 class="text-lg font-bold">${sanitizeHTML(title)}</h3>
                            <div class="w-48 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden hidden" id="module-progress-bar-container">
                                <div class="h-full bg-emerald-500 transition-all duration-500" id="module-progress-bar" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 group-hover:opacity-100 transition-opacity opacity-100 relative">
                        <button class="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors flex items-center justify-center toggle-module">
                            <span class="material-symbols-outlined text-2xl chevron-icon cursor-pointer transition-transform duration-300">
                                expand_less
                            </span>
                        </button>
                        <div class="relative module-options-container ${sessionStorage.getItem('userRole') === 'ADMIN' && !window.location.search.includes('preview=true') ? '' : 'hidden'}">
                            <button class="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors more-options-btn" title="Options">
                                <span class="material-symbols-outlined text-xl">more_vert</span>
                            </button>
                            <div class="ai-dropdown-menu">
                                <button class="ai-dropdown-item edit-module">
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                    Edit Title
                                </button>
                                <button class="ai-dropdown-item edit-subtitle">
                                    <span class="material-symbols-outlined text-lg">format_list_numbered</span>
                                    Edit Subtitle
                                </button>
                                <button class="ai-dropdown-item delete delete-module">
                                    <span class="material-symbols-outlined text-lg">delete</span>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Lessons/Blocks Container -->
                <div class="p-4 space-y-3 module-content transition-all duration-300 overflow-visible" style="max-height: 2500px; padding-top: 1rem; padding-bottom: 1rem; opacity: 1;">
                </div>
                
                <!-- Insert Content Button built into the module -->
                <div class="p-4 border-t border-slate-800/50 ${sessionStorage.getItem('userRole') === 'ADMIN' && !window.location.search.includes('preview=true') ? '' : 'hidden'}">
                    <button class="w-full py-4 border-2 border-dashed border-slate-800 rounded-lg text-slate-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest insert-content-btn">
                        <span class="material-symbols-outlined text-sm">add_circle</span>
                        Insert Content Item
                    </button>
                </div>
            </section>
        `;

        // Restore children into the new content container
        const contentContainer = this.querySelector('.module-content');
        children.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE || child.nodeType === Node.TEXT_NODE) {
                contentContainer.appendChild(child);
            }
        });

        this.setupEvents(contentContainer);
        this.processLocking();

        // Listen for global quiz passed events to update locking and card status
        document.addEventListener('ai-quiz-passed', e => {
            // Re-render quiz content items so score/status badges update
            this.querySelectorAll('ai-content-item').forEach(item => {
                if (item.getAttribute('type') === 'QUIZ') {
                    item.render();
                    item.setupEvents();
                }
            });
            this.processLocking();
        });

        // Listen for progress updates to refresh module completion stats
        window.addEventListener('ai-progress-update', () => {
            // Give content items a moment to update their 'completed' attribute
            setTimeout(() => this.updateCompletionStats(), 50);
        });

        // Initial stat update
        setTimeout(() => this.updateCompletionStats(), 100);
    }

    updateCompletionStats() {
        const items = Array.from(this.querySelectorAll('ai-content-item'));
        if (items.length === 0) return;

        const isLearnerView =
            sessionStorage.getItem('userRole') !== 'ADMIN' || window.location.search.includes('preview=true');
        if (!isLearnerView) return;

        const completedCount = items.filter(item => item.getAttribute('completed') === 'true').length;
        console.log(
            `[AiModule] updateCompletionStats for ${this.getAttribute('title') || 'module'}: ${completedCount}/${items.length} completed`
        );
        const totalCount = items.length;
        const percent = Math.round((completedCount / totalCount) * 100);

        const statEl = this.querySelector('#module-progress-stat');
        const progressBarContainer = this.querySelector('#module-progress-bar-container');
        const progressBar = this.querySelector('#module-progress-bar');

        if (statEl) {
            statEl.textContent = `${completedCount}/${totalCount} Completed`;
            statEl.classList.remove('hidden');
        }
        if (progressBarContainer && progressBar) {
            progressBarContainer.classList.remove('hidden');
            progressBar.style.width = `${percent}%`;
        }
    }

    processLocking() {
        const isAdmin = sessionStorage.getItem('userRole') === 'ADMIN';
        const items = Array.from(this.querySelectorAll('ai-content-item'));
        let isLocked = false;

        items.forEach((item, index) => {
            if (isLocked && !isAdmin) {
                item.setAttribute('locked', 'true');
            } else {
                item.removeAttribute('locked');
            }

            // A content item represents a potential lock point
            // If it's a quiz, it MUST be passed to unlock subsequent items
            if (item.getAttribute('type') === 'QUIZ') {
                const title = item.getAttribute('title');
                const results = JSON.parse(localStorage.getItem(`quiz-results-${title}`) || '{}');
                if (!results.passed) {
                    isLocked = true;
                }
            }
        });
    }

    setupEvents(contentContainer) {
        const icon = this.querySelector('.chevron-icon');
        const moduleContainer = this.querySelector('.module-container');

        // Chevron toggle logic
        if (icon && moduleContainer && contentContainer) {
            contentContainer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            icon.addEventListener('click', () => {
                moduleContainer.classList.toggle('module-collapsed');
                if (moduleContainer.classList.contains('module-collapsed')) {
                    contentContainer.style.maxHeight = '0px';
                    contentContainer.style.paddingTop = '0px';
                    contentContainer.style.paddingBottom = '0px';
                    contentContainer.style.opacity = '0';
                    contentContainer.style.overflow = 'hidden';
                    icon.style.transform = 'rotate(-90deg)';
                } else {
                    contentContainer.style.maxHeight = '2500px';
                    contentContainer.style.paddingTop = '1rem';
                    contentContainer.style.paddingBottom = '1rem';
                    contentContainer.style.opacity = '1';
                    icon.style.transform = 'rotate(0deg)';
                    setTimeout(() => {
                        if (!moduleContainer.classList.contains('module-collapsed')) {
                            contentContainer.style.overflow = 'visible';
                        }
                    }, 400);
                }
            });
        }

        // Dropdown toggle logic
        const moreBtn = this.querySelector('.more-options-btn');
        const dropdown = this.querySelector('.ai-dropdown-menu');
        if (moreBtn && dropdown) {
            moreBtn.addEventListener('click', e => {
                e.stopPropagation();
                // Close all other dropdowns first
                document.querySelectorAll('.ai-dropdown-menu.show').forEach(d => {
                    if (d !== dropdown) d.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });
        }

        // Module actions
        this.querySelector('.edit-module')?.addEventListener('click', async () => {
            const renameModal = document.querySelector('ai-rename-modal');
            if (renameModal) {
                const currentTitle = this.getAttribute('title') || '';
                const newTitle = await renameModal.show(currentTitle, 'Rename Module', 'Module Title');
                if (newTitle && newTitle !== currentTitle) {
                    this.setAttribute('title', newTitle);
                    this.querySelector('h3').textContent = newTitle;
                    // MutationObserver will trigger save
                }
            }
            dropdown.classList.remove('show');
        });

        this.querySelector('.edit-subtitle')?.addEventListener('click', async () => {
            const renameModal = document.querySelector('ai-rename-modal');
            if (renameModal) {
                const currentStep = this.getAttribute('step') || '01';
                const newStep = await renameModal.show(currentStep, 'Edit Subtitle', 'Subtitle (e.g. Module 01)');
                if (newStep && newStep !== currentStep) {
                    this.setAttribute('step', newStep);
                    const subtitleEl = this.querySelector('span.uppercase.tracking-\\[0\\.2em\\]');
                    if (subtitleEl) {
                        subtitleEl.textContent = `Module ${newStep}`;
                    }
                    // MutationObserver will trigger save
                }
            }
            dropdown.classList.remove('show');
        });

        this.querySelector('.delete-module')?.addEventListener('click', async () => {
            const modal = document.querySelector('ai-confirm-modal');
            if (modal) {
                const confirmed = await modal.show({
                    title: 'Delete Module',
                    message: `Are you sure you want to delete Module: ${this.getAttribute('title')}? This action cannot be undone.`,
                    confirmText: 'Delete Module',
                    type: 'danger'
                });
                if (confirmed) {
                    this.remove();
                }
            }
            dropdown.classList.remove('show');
        });

        // Global click to close dropdowns
        document.addEventListener('click', () => {
            dropdown?.classList.remove('show');
        });

        // Sortable logic for internal items
        if (typeof Sortable !== 'undefined' && contentContainer) {
            new Sortable(contentContainer, {
                group: 'shared',
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'bg-slate-800/50',
                chosenClass: 'border-primary/50',
                dragClass: 'opacity-50'
            });
        }

        // Insert Content Button Logic
        const insertBtn = this.querySelector('.insert-content-btn');
        if (insertBtn && contentContainer) {
            insertBtn.addEventListener('click', async () => {
                const picker = document.querySelector('ai-content-picker-modal');
                if (picker) {
                    const result = await picker.show();
                    if (result) {
                        // Special handling for Link
                        if (result.type === 'LINK') {
                            const linkModal = document.querySelector('ai-link-insert-modal');
                            if (linkModal) {
                                const linkResult = await linkModal.show();
                                if (linkResult) {
                                    const newItem = document.createElement('ai-content-item');
                                    newItem.setAttribute('title', linkResult.title);
                                    newItem.setAttribute('type', 'LINK');
                                    newItem.setAttribute('icon', 'link');
                                    newItem.setAttribute('color', 'indigo');
                                    newItem.setAttribute('blob-url', linkResult.url);
                                    contentContainer.appendChild(newItem);
                                }
                            }
                            return;
                        }

                        // Special handling for Video
                        if (result.type === 'VIDEO') {
                            const videoModal = document.querySelector('ai-video-insert-modal');
                            if (videoModal) {
                                const videoResult = await videoModal.show();
                                if (videoResult) {
                                    const newItem = document.createElement('ai-content-item');
                                    newItem.setAttribute('title', videoResult.title);
                                    newItem.setAttribute('type', 'VIDEO');
                                    newItem.setAttribute('icon', 'play_circle');
                                    newItem.setAttribute('color', 'red');

                                    if (videoResult.subtype === 'LOCAL' && videoResult.file) {
                                        newItem.setAttribute('blob-url', URL.createObjectURL(videoResult.file));
                                        if (videoResult.fileId) newItem.setAttribute('file-id', videoResult.fileId);
                                    } else if (videoResult.url) {
                                        newItem.setAttribute('blob-url', videoResult.url);
                                    }

                                    newItem.setAttribute('subtype', videoResult.subtype);
                                    if (videoResult.videoId) newItem.setAttribute('video-id', videoResult.videoId);

                                    contentContainer.appendChild(newItem);
                                }
                            }
                            return;
                        }

                        // Special handling for Quiz
                        if (result.type === 'QUIZ') {
                            const quizUploadModal = document.querySelector('ai-quiz-upload-modal');
                            if (quizUploadModal) {
                                const quizResult = await quizUploadModal.show();
                                if (quizResult) {
                                    const newItem = document.createElement('ai-content-item');
                                    newItem.setAttribute('title', quizResult.title);
                                    newItem.setAttribute('type', 'QUIZ');
                                    newItem.setAttribute('icon', 'quiz');
                                    newItem.setAttribute('color', 'teal');
                                    newItem.setAttribute('success-threshold', quizResult.threshold);
                                    if (quizResult.blobUrl) {
                                        newItem.setAttribute('blob-url', quizResult.blobUrl);
                                    }
                                    if (quizResult.fileId) newItem.setAttribute('file-id', quizResult.fileId);
                                    contentContainer.appendChild(newItem);
                                    this.processLocking();
                                }
                            }
                            return;
                        }

                        // Special handling for Media types (PDF, IMAGE, AUDIO, SLIDES)
                        const mediaTypes = ['PDF', 'IMAGE', 'AUDIO', 'SLIDES'];
                        if (mediaTypes.includes(result.type)) {
                            const uploadModal = document.querySelector('ai-media-upload-modal');
                            if (uploadModal) {
                                const uploadResult = await uploadModal.show({
                                    title: `Upload ${result.type}`,
                                    icon: result.icon,
                                    color: result.color,
                                    accept:
                                        result.type === 'PDF'
                                            ? '.pdf'
                                            : result.type === 'AUDIO'
                                              ? '.mp3,.wav'
                                              : result.type === 'SLIDES'
                                                ? '.ppt,.pptx'
                                                : 'image/*'
                                });

                                if (uploadResult && uploadResult.title) {
                                    const newItem = document.createElement('ai-content-item');
                                    newItem.setAttribute('title', uploadResult.title);
                                    newItem.setAttribute('type', result.type);
                                    newItem.setAttribute('icon', result.icon);
                                    newItem.setAttribute('color', result.color);
                                    if (uploadResult.fileId) newItem.setAttribute('file-id', uploadResult.fileId);
                                    if (uploadResult.url) {
                                        newItem.setAttribute('blob-url', uploadResult.url);
                                    } else if (uploadResult.file) {
                                        newItem.setAttribute('blob-url', URL.createObjectURL(uploadResult.file));
                                    }
                                    contentContainer.appendChild(newItem);
                                }
                            }
                        } else if (result.type === 'PAGE') {
                            const editor = document.querySelector('ai-page-editor-modal');
                            if (editor) {
                                const pageResult = await editor.show({
                                    title: 'New Page',
                                    content: ''
                                });
                                if (pageResult) {
                                    const newItem = document.createElement('ai-content-item');
                                    newItem.setAttribute('title', pageResult.title);
                                    newItem.setAttribute('type', 'PAGE');
                                    newItem.setAttribute('icon', result.icon);
                                    newItem.setAttribute('color', result.color);
                                    newItem.setAttribute('blob-url', pageResult.content);
                                    contentContainer.appendChild(newItem);
                                }
                            }
                        } else {
                            const newItem = document.createElement('ai-content-item');
                            newItem.setAttribute('title', result.title);
                            newItem.setAttribute('type', result.type);
                            newItem.setAttribute('icon', result.icon);
                            newItem.setAttribute('color', result.color);
                            contentContainer.appendChild(newItem);
                        }
                    }
                }
            });
        }

        // Drag and Drop Logic
        const container = this.querySelector('.module-container');
        if (container) {
            container.addEventListener('dragover', e => {
                e.preventDefault();
                container.classList.add('border-primary', 'bg-primary/5');
            });

            container.addEventListener('dragleave', () => {
                container.classList.remove('border-primary', 'bg-primary/5');
            });

            container.addEventListener('drop', e => {
                e.preventDefault();
                container.classList.remove('border-primary', 'bg-primary/5');

                const files = Array.from(e.dataTransfer.files);
                (async () => {
                    for (const file of files) {
                        const ext = file.name.split('.').pop().toLowerCase();
                        let type = 'PAGE';
                        let icon = 'description';
                        let color = 'indigo';

                        if (
                            ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp3', 'wav', 'ppt', 'pptx'].includes(
                                ext
                            )
                        ) {
                            const isPdf = ext === 'pdf';
                            const isAudio = ['mp3', 'wav'].includes(ext);
                            const isSlides = ['ppt', 'pptx'].includes(ext);
                            type = isPdf ? 'PDF' : isAudio ? 'AUDIO' : isSlides ? 'SLIDES' : 'IMAGE';

                            const config = CONTENT_TYPE_CONFIG[type] || CONTENT_TYPE_CONFIG.DEFAULT;
                            icon = config.icon;
                            color = config.color;

                            const uploadModal = document.querySelector('ai-media-upload-modal');
                            if (uploadModal) {
                                const uploadResult = await uploadModal.show({
                                    title: `Add ${type}`,
                                    currentTitle: file.name.split('.').shift(),
                                    icon: icon,
                                    color: color,
                                    accept: isPdf ? '.pdf' : isAudio ? '.mp3,.wav' : isSlides ? '.ppt,.pptx' : 'image/*'
                                });

                                if (uploadResult && uploadResult.title) {
                                    const newItem = document.createElement('ai-content-item');
                                    newItem.setAttribute('title', uploadResult.title);
                                    newItem.setAttribute('type', type);
                                    newItem.setAttribute('icon', icon);
                                    newItem.setAttribute('color', color);

                                    const finalUrl = uploadResult.url || URL.createObjectURL(uploadResult.file || file);
                                    newItem.setAttribute('blob-url', finalUrl);
                                    if (uploadResult.fileId) newItem.setAttribute('file-id', uploadResult.fileId);
                                    contentContainer.appendChild(newItem);
                                }
                            }
                            continue;
                        } else if (['mp4', 'mov', 'webm'].includes(ext)) {
                            type = 'VIDEO';
                            icon = 'play_circle';
                            color = 'red';
                        } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                            type = 'AUDIO';
                            icon = 'mic';
                            color = 'purple';
                        } else if (['ppt', 'pptx'].includes(ext)) {
                            type = 'SLIDES';
                            icon = 'present_to_all';
                            color = 'amber';
                        }

                        const newItem = document.createElement('ai-content-item');
                        newItem.setAttribute('title', file.name);
                        newItem.setAttribute('type', type);
                        newItem.setAttribute('icon', icon);
                        newItem.setAttribute('color', color);
                        contentContainer.appendChild(newItem);
                    }
                })();
            });
        }
    }
}

class AiContentItem extends HTMLElement {
    static get observedAttributes() {
        return ['title', 'type', 'icon', 'color', 'duration', 'blob-url', 'locked', 'module-id', 'completed'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
            this.setupEvents(); // Re-bind events because render() overwrites innerHTML
        }
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.restoreLocalFile();
    }

    async restoreLocalFile() {
        // Proactive restoration for local files
        const blobUrl = this.getAttribute('blob-url') || '';
        let fileId = this.getAttribute('file-id');

        if (blobUrl.startsWith('local:')) {
            const parts = blobUrl.replace('local:', '').split('|');
            fileId = parts[0];
            this.setAttribute('file-id', fileId);
            this.setAttribute('blob-url', '#');
        }

        if (
            fileId &&
            (!this.getAttribute('blob-url') ||
                this.getAttribute('blob-url') === '#' ||
                this.getAttribute('blob-url') === '')
        ) {
            try {
                const file = await aiFileStore.get(fileId);
                if (file) {
                    this.setAttribute('blob-url', URL.createObjectURL(file));
                }
            } catch (err) {
                console.error('Proactive restoration failed:', err);
            }
        }
    }

    renderQuizStatus() {
        if (this.getAttribute('type') !== 'QUIZ') return '';
        const title = this.getAttribute('title');
        const results = JSON.parse(localStorage.getItem(`quiz-results-${title}`) || 'null');

        if (!results) return '';

        const statusClass = results.passed ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';
        const statusText = results.passed ? 'Passed' : 'To Retake';

        return `
            <span class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight ${statusClass}">
                ${results.score}% • ${statusText}
            </span>
        `;
    }

    render() {
        const type = this.getAttribute('type') || 'DEFAULT';
        const config = CONTENT_TYPE_CONFIG[type] || CONTENT_TYPE_CONFIG.DEFAULT;

        const title = this.getAttribute('title') || `New ${config.label}`;
        const icon = this.getAttribute('icon') || config.icon;
        const color = this.getAttribute('color') || config.color;

        const colorClasses = {
            red: 'bg-red-500/10 text-red-500',
            orange: 'bg-orange-500/10 text-orange-500',
            purple: 'bg-purple-500/10 text-purple-500',
            pink: 'bg-pink-500/10 text-pink-500',
            emerald: 'bg-emerald-500/10 text-emerald-500',
            amber: 'bg-amber-500/10 text-amber-500',
            indigo: 'bg-indigo-500/10 text-indigo-500',
            cyan: 'bg-cyan-500/10 text-cyan-500',
            teal: 'bg-teal-500/10 text-teal-500',
            slate: 'bg-slate-500/10 text-slate-500'
        };

        const colorClass = colorClasses[color] || colorClasses.slate;
        const isLocked = this.hasAttribute('locked') && this.getAttribute('locked') !== 'false';

        const isClickable =
            ['PDF', 'IMAGE', 'AUDIO', 'SLIDES', 'VIDEO', 'QUIZ', 'PAGE', 'DOCUMENT', 'LINK'].includes(type) &&
            !isLocked;
        const clickableClasses = isClickable ? 'cursor-pointer hover:bg-slate-800/40 clickable-content' : '';
        const lockedClasses = isLocked ? 'opacity-50 grayscale pointer-events-none' : '';

        this.innerHTML = `
            <style>
                ai-content-item {
                    display: block;
                    width: 100%;
                }
            </style>
            <div class="flex items-center justify-between bg-[var(--ai-bg-card)] border border-slate-800 p-4 rounded-lg hover:border-slate-600 transition-colors group/item relative overflow-visible ai-content-body ${clickableClasses} ${lockedClasses}">
                <div class="flex items-center gap-4">
                    <div class="drag-handle text-slate-700 cursor-pointer hover:text-slate-400 transition-colors ${sessionStorage.getItem('userRole') === 'ADMIN' && !window.location.search.includes('preview=true') ? '' : 'hidden'}">
                        <span class="material-symbols-outlined text-sm">drag_handle</span>
                    </div>
                    <div class="size-10 ${colorClass} rounded flex items-center justify-center relative">
                        <span class="material-symbols-outlined">${icon}</span>
                        ${isLocked ? '<span class="material-symbols-outlined absolute -top-1 -right-1 text-[12px] bg-slate-900 rounded-full p-0.5 text-slate-400">lock</span>' : ''}
                    </div>
                    <div>
                        <p class="text-sm font-semibold">${sanitizeHTML(title)}</p>
                        <div class="flex items-center gap-2">
                            <p class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                ${sanitizeText(type)}
                            </p>
                            ${this.renderQuizStatus()}
                            ${this.getAttribute('completed') === 'true' ? '<span class="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-tight flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">check_circle</span>Done</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1 group-hover/item:opacity-100 transition-opacity opacity-100 relative ${sessionStorage.getItem('userRole') === 'ADMIN' && !window.location.search.includes('preview=true') ? '' : 'hidden'}">
                    <div class="relative content-options-container">
                        <button class="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-white more-options-btn">
                            <span class="material-symbols-outlined text-lg">more_vert</span>
                        </button>
                        <div class="ai-dropdown-menu">
                            <button class="ai-dropdown-item rename-content">
                                <span class="material-symbols-outlined text-lg">edit_note</span>
                                Rename
                            </button>
                            ${
                                type === 'PAGE'
                                    ? `
                            <button class="ai-dropdown-item edit-page-content">
                                <span class="material-symbols-outlined text-lg">edit_document</span>
                                Edit Page
                            </button>
                            `
                                    : `
                            <button class="ai-dropdown-item edit-content">
                                <span class="material-symbols-outlined text-lg">edit</span>
                                Replace File
                            </button>
                            `
                            }
                            <button class="ai-dropdown-item delete delete-content">
                                <span class="material-symbols-outlined text-lg">delete</span>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEvents() {
        const moreBtn = this.querySelector('.more-options-btn');
        const dropdown = this.querySelector('.ai-dropdown-menu');

        if (moreBtn && dropdown) {
            moreBtn.addEventListener('click', e => {
                e.stopPropagation();
                // Close all other dropdowns
                document.querySelectorAll('.ai-dropdown-menu.show').forEach(d => {
                    if (d !== dropdown) d.classList.remove('show');
                });
                dropdown.classList.toggle('show');
            });
        }

        this.querySelector('.rename-content')?.addEventListener('click', async () => {
            const renameModal = document.querySelector('ai-rename-modal');
            if (renameModal) {
                const newTitle = await renameModal.show(this.getAttribute('title'));
                if (newTitle) {
                    this.setAttribute('title', newTitle);
                }
            }
            dropdown?.classList.remove('show');
        });

        this.querySelector('.edit-page-content')?.addEventListener('click', async () => {
            const editor = document.querySelector('ai-page-editor-modal');
            if (editor) {
                const result = await editor.show({
                    title: this.getAttribute('title'),
                    content: this.getAttribute('blob-url') || ''
                });
                if (result) {
                    this.setAttribute('title', result.title);
                    this.setAttribute('blob-url', result.content);
                }
            }
            dropdown?.classList.remove('show');
        });

        this.querySelector('.edit-content')?.addEventListener('click', async () => {
            const type = this.getAttribute('type');
            const mediaTypes = ['PDF', 'IMAGE', 'AUDIO', 'SLIDES', 'QUIZ'];

            if (mediaTypes.includes(type)) {
                const uploadModal = document.querySelector('ai-media-upload-modal');
                if (uploadModal) {
                    let acceptAttr = 'image/*';
                    if (type === 'PDF') acceptAttr = '.pdf';
                    else if (type === 'AUDIO') acceptAttr = '.mp3,.wav';
                    else if (type === 'SLIDES') acceptAttr = '.ppt,.pptx';
                    else if (type === 'QUIZ') acceptAttr = '.json';

                    const result = await uploadModal.show({
                        title: `Edit ${type}`,
                        currentTitle: this.getAttribute('title'),
                        icon: this.getAttribute('icon'),
                        accept: acceptAttr
                    });
                    if (result && result.title) {
                        this.setAttribute('title', result.title);
                        if (result.file || result.url) {
                            if (result.fileId) this.setAttribute('file-id', result.fileId);
                            const blobUrl = result.url || (result.file ? URL.createObjectURL(result.file) : '#');
                            this.setAttribute('blob-url', blobUrl);
                        }
                    }
                }
            } else if (type === 'QUIZ') {
                const quizUploadModal = document.querySelector('ai-quiz-upload-modal');
                if (quizUploadModal) {
                    const result = await quizUploadModal.show({
                        title: this.getAttribute('title'),
                        threshold: this.getAttribute('success-threshold') || '80'
                    });
                    if (result) {
                        this.setAttribute('title', result.title);
                        this.setAttribute('success-threshold', result.threshold);
                        if (result.blobUrl || result.fileId) {
                            if (result.fileId) this.setAttribute('file-id', result.fileId);
                            if (result.blobUrl) this.setAttribute('blob-url', result.blobUrl);
                        }
                    }
                }
            } else if (type === 'LINK') {
                const linkModal = document.querySelector('ai-link-insert-modal');
                if (linkModal) {
                    const result = await linkModal.show({
                        title: this.getAttribute('title'),
                        url: this.getAttribute('blob-url')
                    });
                    if (result) {
                        this.setAttribute('title', result.title);
                        this.setAttribute('blob-url', result.url);
                    }
                }
            } else if (type === 'VIDEO') {
                const videoModal = document.querySelector('ai-video-insert-modal');
                if (videoModal) {
                    const result = await videoModal.show({
                        title: this.getAttribute('title'),
                        url: this.getAttribute('blob-url')
                    });
                    if (result && result.url) {
                        this.setAttribute('title', result.title);
                        this.setAttribute('blob-url', result.url);
                    }
                }
            } else {
                const modal = document.querySelector('ai-confirm-modal');
                if (modal) {
                    await modal.show({
                        title: 'Edit Content',
                        message: `Open editor for: ${this.getAttribute('title')}?`,
                        confirmText: 'Open Editor',
                        type: 'info'
                    });
                }
            }
            dropdown?.classList.remove('show');
        });

        this.querySelector('.delete-content')?.addEventListener('click', async () => {
            const modal = document.querySelector('ai-confirm-modal');
            if (modal) {
                const confirmed = await modal.show({
                    title: 'Delete Content',
                    message: `Are you sure you want to delete this content item?`,
                    confirmText: 'Delete Item',
                    type: 'danger'
                });
                if (confirmed) {
                    this.remove();
                }
            }
            dropdown?.classList.remove('show');
        });

        const itemBody = this.querySelector('.ai-content-body');
        if (itemBody) {
            itemBody.addEventListener('click', async e => {
                if (e.target.closest('.content-options-container') || e.target.closest('.drag-handle')) {
                    return;
                }

                const type = this.getAttribute('type');
                let url =
                    this.getAttribute('blob-url') || this.getAttribute('src') || this.getAttribute('video-id') || '#';
                let fileId = this.getAttribute('file-id');

                console.log(`[AiContentItem] Clicked on ${type}. URL: ${url}, FileID: ${fileId}`);

                // Handle 'local:' prefix from DB
                if (url.startsWith('local:')) {
                    fileId = url.split('|')[0].replace('local:', '');
                    url = '#';
                    console.log(`[AiContentItem] Detected local URL, set fileId to ${fileId}`);
                }

                if (url.startsWith('blob:') || url === '#') {
                    try {
                        if (url.startsWith('blob:')) {
                            const res = await fetch(url);
                            if (!res.ok) throw new Error();
                        } else if (url === '#' || !url) {
                            if (type !== 'QUIZ' && type !== 'PAGE') {
                                throw new Error('MISSING_URL');
                            }
                        }

                        this._openViewer(type, url);
                    } catch (err) {
                        console.log(`[AiContentItem] Link dead or local redirection, checking IndexedDB for ${fileId}`);
                        if (fileId) {
                            const file = await aiFileStore.get(fileId);
                            if (file) {
                                console.log(`[AiContentItem] File found in IndexedDB, creating new blob URL`);
                                const newUrl = URL.createObjectURL(file);
                                if (type !== 'QUIZ') this.setAttribute('blob-url', newUrl);
                                this._openViewer(type, newUrl);
                                return;
                            } else {
                                console.error(`[AiContentItem] File ${fileId} NOT found in IndexedDB`);
                                // Don't throw, just fall through to the error message handling below
                            }
                        }

                        const isLearner = sessionStorage.getItem('userRole') !== 'ADMIN';
                        const message = isLearner
                            ? 'This resource is currently unavailable. It looks like it was not properly uploaded to the server yet. Please contact your administrator.'
                            : `CRITICAL: This content only exists in another browser's local storage. FileID [${fileId || 'None'}]. You MUST re-upload this file to Cloudflare R2 to make it accessible to everyone.`;

                        if (window.showToast) {
                            window.showToast(message, isLearner ? 'error' : 'info');
                        } else {
                            alert(message);
                        }
                    }
                } else {
                    this._openViewer(type, url);
                }
            });
        }

        document.addEventListener('click', () => {
            dropdown?.classList.remove('show');
        });

        // Listen for progress updates
        if (this._progressUpdateHandler) {
            window.removeEventListener('ai-progress-update', this._progressUpdateHandler);
        }
        this._progressUpdateHandler = e => {
            if (e.detail?.moduleId === this.getAttribute('module-id')) {
                console.log(`[AiContentItem] Matching module progress update received for ${e.detail.moduleId}`);
                this.setAttribute('completed', 'true');
            }
        };
        window.addEventListener('ai-progress-update', this._progressUpdateHandler);
    }

    disconnectedCallback() {
        if (this._progressUpdateHandler) {
            window.removeEventListener('ai-progress-update', this._progressUpdateHandler);
        }
    }

    _openViewer(type, url) {
        console.log(`[AiContentItem] _openViewer called. type: ${type}, moduleId: ${this.getAttribute('module-id')}`);
        const mediaTypes = ['PDF', 'IMAGE', 'AUDIO', 'SLIDES', 'VIDEO', 'PAGE', 'DOCUMENT'];
        if (mediaTypes.includes(type)) {
            const viewer = document.querySelector('ai-media-viewer-modal');
            if (viewer) {
                const config = CONTENT_TYPE_CONFIG[type] || CONTENT_TYPE_CONFIG.DEFAULT;
                viewer.show({
                    title: this.getAttribute('title'),
                    url: url,
                    type,
                    icon: config.icon,
                    color: config.color,
                    moduleId: this.getAttribute('module-id'),
                    isPlaceholder: type === 'SLIDES' && (!url || url === '#' || url.startsWith('blob:')) // Use Office Viewer for server URLs
                });
            }
        } else if (type === 'LINK') {
            window.open(url, '_blank');
            // Mark as complete immediately on click for learners
            const moduleId = this.getAttribute('module-id');
            const isLearner =
                sessionStorage.getItem('userRole') !== 'ADMIN' || window.location.search.includes('preview=true');
            if (moduleId && isLearner) {
                console.log(`[AiContentItem] Link clicked. Marking module ${moduleId} as complete...`);
                fetch('/api/progress/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ moduleId })
                })
                    .then(res => {
                        if (res.ok) {
                            console.log(`[AiContentItem] Progress updated for link: ${moduleId}`);
                            this.setAttribute('completed', 'true');
                            window.dispatchEvent(
                                new CustomEvent('ai-progress-update', {
                                    detail: { moduleId }
                                })
                            );
                        }
                    })
                    .catch(err => console.error('[AiContentItem] Link progress update error:', err));
            }
        } else if (type === 'QUIZ') {
            const quizModal = document.querySelector('ai-quiz-modal');
            if (quizModal) {
                const quizSrc = url && url !== '#' ? url : this.getAttribute('src');
                quizModal.show(
                    this.getAttribute('title'),
                    this.getAttribute('success-threshold') || 80,
                    quizSrc,
                    this.getAttribute('module-id'),
                    this.getAttribute('file-id')
                );
            }
        }
    }
}

class AiConfirmModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-modal-container" class="fixed inset-0 z-[1002] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                
                <!-- Modal Card -->
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-md p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-modal-card">
                    <div class="flex items-center gap-4 mb-6">
                        <div id="ai-modal-icon-container" class="size-12 rounded-full flex items-center justify-center">
                            <span id="ai-modal-icon" class="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        <h3 id="ai-modal-title" class="text-xl font-bold tracking-tight text-white font-display">
                            Confirm Action
                        </h3>
                    </div>
                    
                    <p id="ai-modal-message" class="text-[var(--ai-text-dim)] text-sm leading-relaxed mb-8">
                        Are you sure you want to proceed? This action may be permanent.
                    </p>
                    
                    <div class="flex items-center justify-end gap-3">
                        <button id="ai-modal-cancel" class="px-5 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold text-[var(--ai-text-dim)] hover:text-white hover:bg-[var(--ai-bg-active)] transition-all">
                            Cancel
                        </button>
                        <button id="ai-modal-confirm" class="px-6 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold transition-all shadow-lg">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container = this.querySelector('#ai-modal-container');
        this.card = this.querySelector('.ai-modal-card');
        this.titleEl = this.querySelector('#ai-modal-title');
        this.messageEl = this.querySelector('#ai-modal-message');
        this.iconEl = this.querySelector('#ai-modal-icon');
        this.iconContainer = this.querySelector('#ai-modal-icon-container');
        this.cancelBtn = this.querySelector('#ai-modal-cancel');
        this.confirmBtn = this.querySelector('#ai-modal-confirm');

        this.cancelBtn.addEventListener('click', () => this.close(false));
        this.confirmBtn.addEventListener('click', () => this.close(true));
        this.container.querySelector('.absolute').addEventListener('click', () => this.close(false));
    }

    async show({ title, message, confirmText, type = 'danger' }) {
        this.titleEl.textContent = title;
        this.messageEl.textContent = message;
        this.confirmBtn.textContent = confirmText || (type === 'danger' ? 'Delete' : 'Confirm');

        // Apply type styles
        if (type === 'danger') {
            this.iconEl.textContent = 'report';
            this.iconContainer.className =
                'size-12 rounded-full flex items-center justify-center bg-red-500/10 text-red-500';
            this.confirmBtn.className =
                'bg-[var(--ai-danger)] hover:bg-[#dc2626] text-white px-6 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold transition-all shadow-lg shadow-red-500/20';
        } else if (type === 'info') {
            this.iconEl.textContent = 'info';
            this.iconContainer.className =
                'size-12 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500';
            this.confirmBtn.className =
                'bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white px-6 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold transition-all shadow-lg shadow-blue-500/20';
        }

        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');

        return new Promise(resolve => {
            this.resolve = resolve;
        });
    }

    close(result) {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');

        if (this.resolve) {
            this.resolve(result);
            this.resolve = null;
        }
    }
}

class AiContentPickerModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-picker-container" class="fixed inset-0 z-[1000] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                
                <!-- Modal Card -->
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-2xl p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-picker-card">
                    <div class="text-center mb-8">
                        <h3 class="text-2xl font-bold tracking-tight text-white font-display mb-2 uppercase tracking-widest">
                            Insert Content
                        </h3>
                        <p class="text-[var(--ai-text-dim)] text-sm">Select the type of content you want to add to this module.</p>
                    </div>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        ${Object.entries(CONTENT_TYPE_CONFIG)
                            .filter(([key]) => key !== 'DEFAULT')
                            .map(
                                ([type, config]) => `
                            <button class="picker-option group" data-type="${type}" data-icon="${config.icon}" data-color="${config.color}">
                                <div class="size-14 rounded-[var(--ai-radius-xl)] bg-${config.color}-500/10 text-${config.color}-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <span class="material-symbols-outlined text-3xl">${config.icon}</span>
                                </div>
                                <span class="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">${config.label}</span>
                            </button>
                        `
                            )
                            .join('')}
                    </div>
                    
                    <div class="flex justify-center">
                        <button id="ai-picker-cancel" class="px-8 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            <style>
                .picker-option {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid var(--ai-border);
                    border-radius: 1.5rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .picker-option:hover {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.1);
                    transform: translateY(-4px);
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
                }
            </style>
        `;

        this.container = this.querySelector('#ai-picker-container');
        this.card = this.querySelector('.ai-picker-card');
        this.cancelBtn = this.querySelector('#ai-picker-cancel');

        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.container.querySelector('.absolute').addEventListener('click', () => this.close(null));

        this.querySelectorAll('.picker-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.close({
                    type: btn.dataset.type,
                    icon: btn.dataset.icon,
                    color: btn.dataset.color,
                    title: `New ${btn.querySelector('span:last-child').textContent}`
                });
            });
        });
    }

    async show() {
        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');

        return new Promise(resolve => {
            this.resolve = resolve;
        });
    }

    close(result) {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');

        if (this.resolve) {
            this.resolve(result);
            this.resolve = null;
        }
    }
}

class AiMediaUploadModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-media-modal-container" class="fixed inset-0 z-[1001] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                
                <!-- Modal Card -->
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-xl p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-media-card">
                    <div class="text-center mb-8">
                        <div class="size-16 rounded-[var(--ai-radius-xl)] bg-[var(--ai-primary-soft)] text-[var(--ai-primary)] flex items-center justify-center mx-auto mb-4" id="ai-media-icon-container">
                            <span class="material-symbols-outlined text-4xl" id="ai-media-icon">cloud_upload</span>
                        </div>
                        <h3 class="text-2xl font-bold tracking-tight text-white font-display mb-2 uppercase tracking-widest" id="ai-media-title">
                            Upload Media
                        </h3>
                        <p class="text-[var(--ai-text-dim)] text-sm" id="ai-media-hint">Drag and drop your file here or click to browse.</p>
                    </div>
                    
                    <!-- Title Input -->
                    <div class="mb-6 text-left">
                        <label class="block text-xs font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Content Title</label>
                        <input type="text" id="ai-media-title-input" 
                               class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white placeholder-[var(--ai-text-muted)] focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all"
                               placeholder="Enter a name for this content...">
                    </div>

                    <!-- Drop Zone -->
                    <div id="media-drop-zone" class="border-2 border-dashed border-[var(--ai-border)] rounded-[var(--ai-radius-xl)] p-10 flex flex-col items-center justify-center gap-3 hover:border-[var(--ai-primary)]/50 hover:bg-[var(--ai-primary-soft)] transition-all cursor-pointer mb-8 group">
                        <span class="material-symbols-outlined text-4xl text-[var(--ai-text-muted)] group-hover:text-[var(--ai-primary)] transition-colors">cloud_upload</span>
                        <div id="media-selected-feedback" class="hidden text-center">
                            <p class="text-[var(--ai-primary)] font-bold" id="selected-filename">File selected</p>
                            <p class="text-[var(--ai-text-muted)] text-xs mt-1">Click to change file</p>
                        </div>
                        <div id="media-default-feedback" class="text-center">
                            <p class="text-[var(--ai-text-main)] font-bold text-sm">Drop your file here</p>
                            <p class="text-[var(--ai-text-muted)] text-xs mt-1">Maximum size: 50MB</p>
                        </div>
                        <input type="file" id="media-file-input" class="hidden">
                    </div>
                    
                    <div class="flex items-center justify-end gap-4">
                        <button id="ai-media-cancel" class="px-6 py-3 rounded-[var(--ai-radius-lg)] text-sm font-bold text-[var(--ai-text-dim)] hover:text-white hover:bg-[var(--ai-bg-active)] transition-all border border-[var(--ai-border)]">
                            Cancel
                        </button>
                        <button id="ai-media-confirm" class="px-8 py-3 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white rounded-[var(--ai-radius-lg)] text-sm font-bold transition-all shadow-lg shadow-primary/20">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
            <style>
                #media-drop-zone.drag-over {
                    border-color: var(--ai-primary);
                    background-color: rgba(var(--ai-primary-rgb), 0.05);
                }
            </style>
        `;

        this.container = this.querySelector('#ai-media-modal-container');
        this.card = this.querySelector('.ai-media-card');
        this.dropZone = this.querySelector('#media-drop-zone');
        this.fileInput = this.querySelector('#media-file-input');
        this.cancelBtn = this.querySelector('#ai-media-cancel');
        this.confirmBtn = this.querySelector('#ai-media-confirm');
        this.titleEl = this.querySelector('#ai-media-title');
        this.iconEl = this.querySelector('#ai-media-icon');
        this.hintEl = this.querySelector('#ai-media-hint');
        this.titleInput = this.querySelector('#ai-media-title-input');
        this.defaultFeedback = this.querySelector('#media-default-feedback');
        this.selectedFeedback = this.querySelector('#media-selected-feedback');
        this.selectedFilenameEl = this.querySelector('#selected-filename');

        this.currentFile = null;

        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.confirmBtn.addEventListener('click', async () => {
            if (!this.currentFile && !this.titleInput.value) return;

            // Show loading state on button
            const originalText = this.confirmBtn.textContent;
            this.confirmBtn.disabled = true;
            this.confirmBtn.textContent = 'Uploading...';

            try {
                // 1. Upload to server for permanent hosting
                const formData = new FormData();
                formData.append('file', this.currentFile);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorMessage = 'Upload failed';
                    try {
                        const errData = await response.json();
                        errorMessage = errData.error || errorMessage;
                    } catch (e) {}
                    throw new Error(errorMessage);
                }
                const result = await response.json();

                // Return only the server URL. Local IndexedDB storage is disabled to ensure global access.
                this.close({
                    title: this.titleInput.value,
                    url: result.url
                });
            } catch (err) {
                console.error('Upload error:', err);
                window.alert(
                    `CRITICAL ERROR: Failed to upload file to Cloudflare R2. ${err.message}. Content must be hosted on R2 for global accessibility. Please check server credentials.`
                );
                this.confirmBtn.disabled = false;
                this.confirmBtn.textContent = originalText;
            } finally {
                this.confirmBtn.disabled = false;
                this.confirmBtn.textContent = originalText;
            }
        });
        this.container.querySelector('.absolute').addEventListener('click', () => this.close(null));

        this.dropZone.addEventListener('click', () => this.fileInput.click());

        this.dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            this.dropZone.classList.add('drag-over');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('drag-over');
        });

        this.dropZone.addEventListener('drop', e => {
            e.preventDefault();
            this.dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        this.fileInput.addEventListener('change', () => {
            if (this.fileInput.files.length > 0) {
                this.handleFile(this.fileInput.files[0]);
            }
        });
    }

    close(file) {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
        if (this.resolve) {
            this.resolve(file);
            this.resolve = null;
        }
    }

    handleFile(file) {
        // Validation based on accept attribute of file input
        const accept = this.fileInput.accept;
        let isValid = false;

        if (accept === 'image/*') {
            isValid = file.type.startsWith('image/');
        } else if (accept === '.pdf') {
            isValid = file.type === 'application/pdf';
        } else if (accept.includes('.ppt')) {
            isValid =
                file.name.endsWith('.ppt') ||
                file.name.endsWith('.pptx') ||
                file.type.includes('presentation') ||
                file.type.includes('powerpoint');
        } else {
            isValid = true;
        }

        if (isValid) {
            this.currentFile = file;
            this.defaultFeedback.classList.add('hidden');
            this.selectedFeedback.classList.remove('hidden');
            this.selectedFilenameEl.textContent = file.name;

            // Auto-fill title if empty
            if (!this.titleInput.value) {
                this.titleInput.value = file.name.split('.').shift();
            }
        } else {
            const modal = document.querySelector('ai-confirm-modal');
            if (modal) {
                modal.show({
                    title: 'Invalid File',
                    message: `Please select a valid ${accept === 'image/*' ? 'image' : 'document'}.`,
                    confirmText: 'OK',
                    type: 'danger'
                });
            }
        }
    }

    async show(config = {}) {
        const {
            title = 'Upload Media',
            icon = 'cloud_upload',
            color = 'indigo',
            accept = '*/*',
            currentTitle = ''
        } = config;

        this.titleEl.textContent = title;
        this.iconEl.textContent = icon;
        this.fileInput.accept = accept;
        this.titleInput.value = currentTitle;
        this.currentFile = null;

        // Apply color theme to icon container
        const iconContainer = this.querySelector('#ai-media-icon-container');
        if (iconContainer) {
            // Remove existing bg/text classes
            iconContainer.className = iconContainer.className.replace(/\b(bg|text)-[a-z]+-500\/?[0-9]*\b/g, '').trim();
            iconContainer.classList.add(`bg-${color}-500/10`, `text-${color}-500`);
        }

        // Apply color to primary button and focus border
        if (this.confirmBtn) {
            this.confirmBtn.className = this.confirmBtn.className.replace(/\bbg-[a-z]+-500\b/g, '').trim();
            this.confirmBtn.classList.add(`bg-${color}-500`);
            // Update shadow
            this.confirmBtn.style.boxShadow = `0 10px 15px -3px rgba(var(--ai-${color}-rgb, 0, 0, 0), 0.3)`;
        }

        // Reset view
        this.defaultFeedback.classList.remove('hidden');
        this.selectedFeedback.classList.add('hidden');

        this.hintEl.textContent = `Drag and drop your ${accept === 'image/*' ? 'image' : 'file'} here or click to browse.`;

        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');
        this.fileInput.value = '';

        return new Promise(resolve => {
            this.resolve = resolve;
        });
    }
}

// Only define VideoUtils if it's not already defined (avoids collision with video-utils.js)
if (typeof VideoUtils === 'undefined') {
    window.VideoUtils = {
        REGEX: {
            YOUTUBE: /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
            VIMEO: /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/
        },
        parse(url) {
            if (!url) return null;
            const ytMatch = url.match(this.REGEX.YOUTUBE);
            if (ytMatch)
                return {
                    type: 'YOUTUBE',
                    id: ytMatch[1],
                    embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`
                };
            const vimeoMatch = url.match(this.REGEX.VIMEO);
            if (vimeoMatch)
                return {
                    type: 'VIMEO',
                    id: vimeoMatch[1],
                    embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
                };
            return null;
        }
    };
}

class AiMediaViewerModal extends HTMLElement {
    constructor() {
        super();
        this.audioEl = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-viewer-container" class="fixed inset-0 z-[1001] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
                <button id="ai-viewer-close" class="absolute top-6 right-8 text-white/50 hover:text-white transition-all z-10">
                    <span class="material-symbols-outlined text-4xl">close</span>
                </button>
                <div class="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-8 transform scale-95 transition-all duration-300 ai-viewer-card">
                    <div class="w-full max-w-[95%] flex items-center gap-4 mb-4">
                        <div class="size-12 rounded-full bg-[var(--ai-primary-soft)] text-[var(--ai-primary)] flex items-center justify-center">
                            <span class="material-symbols-outlined text-3xl" id="viewer-icon">visibility</span>
                        </div>
                        <div>
                            <h3 id="viewer-title" class="text-xl md:text-2xl font-bold tracking-tight text-white font-display uppercase tracking-widest mb-1">Preview</h3>
                            <p id="viewer-subtitle" class="text-xs font-bold text-[var(--ai-text-muted)] uppercase tracking-widest opacity-60">Viewer Mode</p>
                        </div>
                    </div>
                    <div class="w-full max-w-[95%] h-[80vh] bg-black/60 rounded-[var(--ai-radius-2xl)] border border-white/5 shadow-2xl overflow-hidden relative group">
                        <div id="viewer-loading" class="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                            <div class="size-12 border-4 border-[var(--ai-primary)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <iframe id="viewer-frame" class="w-full h-full border-none hidden" allow="autoplay; fullscreen"></iframe>
                        <img id="viewer-image" class="w-full h-full object-contain hidden transition-opacity duration-500" src="">
                        <video id="viewer-video" class="w-full h-full hidden" controls playsinline></video>
                        <div id="viewer-audio-player" class="w-full h-full hidden flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950">
                             <div class="relative mb-8">
                                <div class="size-40 rounded-full bg-[var(--ai-primary-soft)] flex items-center justify-center overflow-hidden border-4 border-white/5 shadow-2xl">
                                    <span class="material-symbols-outlined text-7xl text-[var(--ai-primary)]">audio_file</span>
                                </div>
                                <div class="absolute -inset-4 border-2 border-[var(--ai-primary)]/20 rounded-full animate-ping opacity-20 hidden" id="audio-ping"></div>
                            </div>
                            <div class="w-full max-w-lg space-y-6">
                                <div class="text-center">
                                    <h4 class="text-xl font-bold text-white mb-1" id="audio-filename">Track Name</h4>
                                    <p class="text-[10px] text-[var(--ai-text-muted)] uppercase tracking-widest font-bold opacity-60">Audio Playback</p>
                                </div>
                                <div class="space-y-4">
                                    <div class="relative h-1.5 w-full bg-white/10 rounded-full cursor-pointer" id="audio-seek-bar">
                                        <div class="absolute inset-y-0 left-0 bg-[var(--ai-primary)] rounded-full" id="audio-progress"></div>
                                    </div>
                                    <div class="flex justify-between text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-tighter">
                                        <span id="audio-current-time">0:00</span>
                                        <span id="audio-duration">0:00</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-center gap-8">
                                    <button class="text-white/40 hover:text-white transition-all" id="audio-rewind"><span class="material-symbols-outlined text-2xl">replay_10</span></button>
                                    <button class="size-16 rounded-full bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white flex items-center justify-center transition-all" id="audio-play-toggle">
                                        <span class="material-symbols-outlined text-3xl" id="audio-play-icon">play_arrow</span>
                                    </button>
                                    <button class="text-white/40 hover:text-white transition-all" id="audio-forward"><span class="material-symbols-outlined text-2xl">forward_10</span></button>
                                </div>
                                <div class="flex items-center justify-center gap-4 pt-4 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity">
                                    <span class="material-symbols-outlined text-white text-lg">volume_up</span>
                                    <input type="range" class="w-24 accent-[var(--ai-primary)]" min="0" max="1" step="0.1" value="0.7" id="audio-volume-range">
                                </div>
                            </div>
                        </div>
                        <div id="viewer-page-content" class="w-full h-full hidden overflow-y-auto p-8 md:p-12 bg-white text-slate-900 quill-content-view">
                            <!-- Page content will be injected here -->
                        </div>
                        <style>${this.viewerStyles}</style>
                        <div id="viewer-placeholder" class="w-full h-full hidden flex flex-col items-center justify-center p-12 text-center bg-slate-900 pb-20">
                             <div class="size-20 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
                                <span class="material-symbols-outlined text-5xl" id="placeholder-icon">present_to_all</span>
                             </div>
                             <h4 class="text-xl font-bold text-white mb-2" id="placeholder-title">Ready</h4>
                             <p class="text-xs text-[var(--ai-text-dim)] max-w-sm mx-auto mb-8" id="placeholder-text"></p>
                             <button id="viewer-download" class="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[var(--ai-radius-lg)] text-xs text-white font-bold transition-all">
                                <span class="material-symbols-outlined text-xl">download</span> Download
                             </button>
                        </div>
                        <div id="viewer-slides-download" class="hidden absolute bottom-4 right-4 z-10">
                            <button id="viewer-slides-download-btn" class="flex items-center gap-2 px-4 py-2 bg-amber-500/90 hover:bg-amber-500 text-white rounded-[var(--ai-radius-lg)] text-xs font-bold transition-all shadow-lg">
                                <span class="material-symbols-outlined text-base">download</span> Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container = this.querySelector('#ai-viewer-container');
        this.card = this.querySelector('.ai-viewer-card');
        this.closeBtn = this.querySelector('#ai-viewer-close');
        this.titleEl = this.querySelector('#viewer-title');
        this.subtitleEl = this.querySelector('#viewer-subtitle');
        this.iconEl = this.querySelector('#viewer-icon');
        this.loading = this.querySelector('#viewer-loading');
        this.frame = this.querySelector('#viewer-frame');
        this.image = this.querySelector('#viewer-image');
        this.video = this.querySelector('#viewer-video');
        this.pageContent = this.querySelector('#viewer-page-content');
        this.placeholder = this.querySelector('#viewer-placeholder');
        this.placeholderIcon = this.querySelector('#placeholder-icon');
        this.placeholderTitle = this.querySelector('#placeholder-title');
        this.placeholderText = this.querySelector('#placeholder-text');
        this.downloadBtn = this.querySelector('#viewer-download');
        this.audioPlayer = this.querySelector('#viewer-audio-player');
        this.audioEl = new Audio();
        this.audioPlayToggle = this.querySelector('#audio-play-toggle');
        this.audioPlayIcon = this.querySelector('#audio-play-icon');
        this.audioProgress = this.querySelector('#audio-progress');
        this.audioSeekBar = this.querySelector('#audio-seek-bar');
        this.audioCurrentTimeEl = this.querySelector('#audio-current-time');
        this.audioDurationEl = this.querySelector('#audio-duration');
        this.audioVolumeRange = this.querySelector('#audio-volume-range');
        this.audioRewind = this.querySelector('#audio-rewind');
        this.audioForward = this.querySelector('#audio-forward');
        this.audioPing = this.querySelector('#audio-ping');
        this.audioFilenameEl = this.querySelector('#audio-filename');
        this.slidesDownloadOverlay = this.querySelector('#viewer-slides-download');
        const slidesDownloadBtn = this.querySelector('#viewer-slides-download-btn');

        this.closeBtn.addEventListener('click', () => this.close());
        this.container.querySelector('.absolute').addEventListener('click', () => this.close());
        this.audioEl.addEventListener('error', e => {
            console.error('Audio playback error:', e, this.audioEl.src);
            this.loading.classList.add('hidden');
            if (this.audioPlayer) this.audioPlayer.classList.add('hidden');
            if (this.placeholder) {
                this.placeholder.classList.remove('hidden');
                this.placeholderTitle.textContent = 'Audio Load Failed';
                this.placeholderText.textContent = `Could not load audio source. The file might be missing from your browser storage or the link is invalid.`;
                this.placeholderIcon.textContent = 'error_outline';
                this.downloadBtn.classList.add('hidden');
            }
        });
        this.frame.addEventListener('load', () => {
            this.loading.classList.add('hidden');
            this.frame.classList.remove('opacity-0');
        });
        this.image.addEventListener('load', () => {
            this.loading.classList.add('hidden');
            this.image.classList.remove('opacity-0');
        });
        this.image.addEventListener('error', () => {
            this.loading.classList.add('hidden');
            this.image.classList.add('hidden');
            this.placeholder.classList.remove('hidden');
            this.placeholderTitle.textContent = 'Image Error';
            this.placeholderIcon.textContent = 'broken_image';
        });
        this.video.addEventListener('loadeddata', () => {
            this.loading.classList.add('hidden');
            this.video.classList.remove('opacity-0');
        });
        this.video.addEventListener('error', () => {
            this.loading.classList.add('hidden');
            this.video.classList.add('hidden');
            this.placeholder.classList.remove('hidden');
            this.placeholderTitle.textContent = 'Video Error';
            this.placeholderIcon.textContent = 'videocam_off';
        });
        this.setupAudioEvents();

        this.downloadBtn.addEventListener('click', () => {
            if (this.currentUrl && this.currentUrl !== '#') {
                const a = document.createElement('a');
                a.href = this.currentUrl;
                a.download = this.titleEl.textContent || 'download';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
        if (slidesDownloadBtn) {
            slidesDownloadBtn.addEventListener('click', () => {
                if (this.currentUrl && this.currentUrl !== '#') {
                    const a = document.createElement('a');
                    a.href = this.currentUrl;
                    a.download = this.titleEl.textContent || 'presentation';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            });
        }
    }

    setupAudioEvents() {
        this.audioPlayToggle.addEventListener('click', () => {
            if (this.audioEl.paused) {
                this.audioEl.play();
                this.audioPlayIcon.textContent = 'pause';
                this.audioPing.classList.remove('hidden');
            } else {
                this.audioEl.pause();
                this.audioPlayIcon.textContent = 'play_arrow';
                this.audioPing.classList.add('hidden');
            }
        });
        this.audioEl.addEventListener('timeupdate', () => {
            const percent = (this.audioEl.currentTime / this.audioEl.duration) * 100;
            this.audioProgress.style.width = `${percent}%`;
            this.audioCurrentTimeEl.textContent = this.formatTime(this.audioEl.currentTime);
        });
        this.audioEl.addEventListener('loadedmetadata', () => {
            this.audioDurationEl.textContent = this.formatTime(this.audioEl.duration);
            this.loading.classList.add('hidden');
            this.audioPlayer.classList.remove('hidden');
        });
        this.audioSeekBar.addEventListener('click', e => {
            const rect = this.audioSeekBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.audioEl.currentTime = percent * this.audioEl.duration;
        });
        this.audioVolumeRange.addEventListener('input', () => {
            this.audioEl.volume = this.audioVolumeRange.value;
        });
        this.audioRewind.addEventListener('click', () => (this.audioEl.currentTime -= 10));
        this.audioForward.addEventListener('click', () => (this.audioEl.currentTime += 10));
    }

    formatTime(s) {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const ss = Math.floor(s % 60);
        return `${m}:${ss.toString().padStart(2, '0')}`;
    }

    show(opt = {}) {
        const { title, type, url, icon, color, isPlaceholder, moduleId } = opt;
        this.currentModuleId = moduleId;
        console.log(
            `[AiMediaViewerModal] show() called. moduleId: ${moduleId}, type: ${type}, role: ${sessionStorage.getItem('userRole')}`
        );

        // Clear existing timer if any
        if (this.completionTimer) clearTimeout(this.completionTimer);

        // Start 3-second timer for progression
        if (this.currentModuleId && sessionStorage.getItem('userRole') !== 'ADMIN') {
            this.completionTimer = setTimeout(async () => {
                try {
                    console.log(
                        `[AiMediaViewerModal] 3s timer reached. Marking module ${this.currentModuleId} as complete...`
                    );
                    const res = await fetch('/api/progress/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ moduleId: this.currentModuleId })
                    });
                    if (res.ok) {
                        console.log(`[AiMediaViewerModal] Progress update successful for ${this.currentModuleId}`);
                        // Notify other components
                        window.dispatchEvent(
                            new CustomEvent('ai-progress-update', {
                                detail: { moduleId: this.currentModuleId }
                            })
                        );
                    } else {
                        const errorData = await res.json().catch(() => ({}));
                        console.error(
                            `[AiMediaViewerModal] Progress update FAILED for ${this.currentModuleId}:`,
                            res.status,
                            errorData
                        );
                    }
                } catch (err) {
                    console.error(`[AiMediaViewerModal] Progress update ERROR for ${this.currentModuleId}:`, err);
                }
            }, 3000);
        }

        // Immediate visibility to avoid silent failures blocking the UI
        if (this.container) {
            this.container.classList.remove('opacity-0', 'pointer-events-none');
        }
        if (this.card) {
            this.card.classList.remove('scale-95');
            this.card.classList.add('scale-100');
        }

        // Defensive checks for elements
        if (this.titleEl) this.titleEl.textContent = title || 'Preview';
        if (this.subtitleEl) this.subtitleEl.textContent = `${type} Mode`;

        if (this.iconEl) {
            this.iconEl.textContent = icon || 'visibility';
            if (this.iconEl.parentElement) {
                this.iconEl.parentElement.style.color = `var(--ai-${color || 'primary'})`;
                this.iconEl.parentElement.style.backgroundColor = `var(--ai-${color || 'primary'}-soft)`;
            }
        }

        if (this.audioFilenameEl) this.audioFilenameEl.textContent = title;
        if (this.audioEl) this.audioEl.pause();
        if (this.audioPlayIcon) this.audioPlayIcon.textContent = 'play_arrow';
        if (this.audioProgress) this.audioProgress.style.width = '0%';
        if (this.audioPing) this.audioPing.classList.add('hidden');

        this.currentUrl = url;

        if (isPlaceholder) {
            if (this.frame) this.frame.classList.add('hidden');
            if (this.image) this.image.classList.add('hidden');
            if (this.audioPlayer) this.audioPlayer.classList.add('hidden');
            if (this.video) this.video.classList.add('hidden');
            if (this.slidesDownloadOverlay) this.slidesDownloadOverlay.classList.add('hidden');

            if (this.placeholder) {
                this.placeholder.classList.remove('hidden');
                if (this.placeholderTitle)
                    this.placeholderTitle.textContent =
                        type === 'SLIDES'
                            ? 'Presentation Ready'
                            : type === 'PAGE'
                              ? 'Page Content'
                              : 'Preview Not Available';
                if (this.placeholderIcon)
                    this.placeholderIcon.textContent =
                        type === 'SLIDES' ? 'present_to_all' : type === 'PAGE' ? 'description' : 'visibility_off';
                if (this.placeholderText)
                    this.placeholderText.textContent =
                        type === 'SLIDES'
                            ? 'This file is stored locally. Download to view the presentation.'
                            : type === 'PAGE'
                              ? 'This page is available for download.'
                              : `This ${type.toLowerCase()} is stored securely.`;
            }
            if (this.loading) this.loading.classList.add('hidden');
            if (this.downloadBtn) this.downloadBtn.classList.toggle('hidden', !url || url === '#');
        } else {
            if (this.placeholder) this.placeholder.classList.add('hidden');
            if (this.loading) this.loading.classList.remove('hidden');

            if (this.frame) this.frame.classList.add('hidden');
            if (this.image) this.image.classList.add('hidden');
            if (this.audioPlayer) this.audioPlayer.classList.add('hidden');
            if (this.video) this.video.classList.add('hidden');
            if (this.slidesDownloadOverlay) this.slidesDownloadOverlay.classList.add('hidden');
            if (type === 'SLIDES') {
                // Embed via Microsoft Office Online Viewer
                const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
                if (this.frame) {
                    this.frame.src = officeViewerUrl;
                    this.frame.classList.remove('hidden');
                    this.frame.classList.add('opacity-0');
                }
                // Show the floating download overlay button
                if (this.slidesDownloadOverlay) {
                    this.slidesDownloadOverlay.classList.remove('hidden');
                }
            } else if (type === 'PDF' || type === 'DOCUMENT') {
                if (this.frame) {
                    this.frame.src = url;
                    this.frame.classList.remove('hidden');
                    this.frame.classList.add('opacity-0');
                }
            } else if (type === 'IMAGE') {
                if (this.image) {
                    this.image.src = url;
                    this.image.classList.remove('hidden');
                    this.image.classList.add('opacity-0');
                }
            } else if (type === 'AUDIO') {
                if (this.audioEl) this.audioEl.src = url;
                if (this.audioPlayer) this.audioPlayer.classList.remove('hidden');
                if (this.loading) this.loading.classList.add('hidden');
            } else if (type === 'VIDEO') {
                const vd = VideoUtils.parse(url);
                if (vd) {
                    if (this.frame) {
                        this.frame.src = vd.embedUrl;
                        this.frame.classList.remove('hidden');
                        this.frame.classList.add('opacity-0');
                    }
                } else {
                    if (this.video) {
                        this.video.src = url;
                        this.video.classList.remove('hidden');
                        this.video.classList.add('opacity-0');
                    }
                }
            } else if (type === 'PAGE') {
                if (this.pageContent) {
                    const rawContent = url || '<p class="text-slate-400 italic">No content on this page.</p>';
                    this.pageContent.innerHTML = sanitizeHTML(rawContent);
                    this.pageContent.classList.remove('hidden');
                    // Ensure YouTube embeds are responsive
                    this.pageContent.querySelectorAll('iframe').forEach(ifr => {
                        ifr.classList.add(
                            'aspect-video',
                            'w-full',
                            'max-w-3xl',
                            'mx-auto',
                            'block',
                            'rounded-xl',
                            'my-8'
                        );
                    });
                }
                if (this.loading) this.loading.classList.add('hidden');
            }
        }
    }

    get viewerStyles() {
        return `
            .quill-content-view {
                line-height: 1.7;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
            }
            .quill-content-view h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1.5rem; color: #0f172a; }
            .quill-content-view h2 { font-size: 1.8rem; font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
            .quill-content-view p { margin-bottom: 1.25rem; }
            .quill-content-view blockquote {
                border-left: 4px solid #6366f1;
                padding: 1rem 1.5rem;
                background: #f8fafc;
                font-style: italic;
                color: #475569;
                margin: 1.5rem 0;
                border-radius: 0 0.5rem 0.5rem 0;
            }
            .quill-content-view hr {
                border: none;
                height: 2px;
                background: linear-gradient(to right, #e2e8f0, transparent);
                margin: 2.5rem 0;
            }
            .quill-content-view .ql-callout {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 0.75rem;
                padding: 1.25rem;
                margin: 1.5rem 0;
                display: flex;
                gap: 1rem;
                align-items: flex-start;
                color: #0369a1;
            }
            .quill-content-view .ql-callout::before {
                content: 'info';
                font-family: 'Material Symbols Outlined';
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            .quill-content-view table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5rem 0;
                font-size: 0.9rem;
            }
            .quill-content-view th, .quill-content-view td {
                border: 1px solid #e2e8f0;
                padding: 0.75rem 1rem;
                text-align: left;
            }
            .quill-content-view th {
                background: #f8fafc;
                font-weight: 700;
            }
            .quill-content-view .ql-size-small { font-size: 0.75em; }
            .quill-content-view .ql-size-large { font-size: 1.5em; }
            .quill-content-view .ql-size-huge { font-size: 2.5em; }
            .quill-content-view .ql-align-center { text-align: center; }
            .quill-content-view .ql-align-right { text-align: right; }
            .quill-content-view .ql-align-justify { text-align: justify; }
        `;
    }

    close() {
        if (this.completionTimer) clearTimeout(this.completionTimer);
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
        setTimeout(() => {
            this.frame.src = '';
            this.image.src = '';
            this.audioEl.pause();
            this.audioEl.src = '';
        }, 300);
    }
}

class AiVideoInsertModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }
    connectedCallback() {
        this.innerHTML = `
            <div id="ai-video-modal-container" class="fixed inset-0 z-[1003] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-xl p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-video-card">
                    <div class="text-center mb-8">
                        <div class="size-16 rounded-[var(--ai-radius-xl)] bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                            <span class="material-symbols-outlined text-4xl">play_circle</span>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-2 uppercase tracking-widest leading-none">Add Video</h3>
                        <p class="text-[var(--ai-text-dim)] text-sm">Choose source</p>
                    </div>
                    <div class="flex p-1 bg-[var(--ai-bg-card)] rounded-[var(--ai-radius-xl)] mb-8 border border-[var(--ai-border)]">
                        <button class="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-[var(--ai-radius-lg)] transition-all bg-[var(--ai-bg-active)] text-white" id="video-tab-url">Embed URL</button>
                        <button class="flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-[var(--ai-radius-lg)] transition-all text-[var(--ai-text-muted)] hover:text-white" id="video-tab-upload">Upload</button>
                    </div>
                    <div id="video-url-section" class="space-y-6">
                        <div class="text-left"><label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">URL</label>
                            <input type="text" id="ai-video-url-input" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all" placeholder="YouTube/Vimeo URL">
                        </div>
                        <div class="text-left"><label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Title</label>
                            <input type="text" id="ai-video-title-input" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all" placeholder="Video Title">
                        </div>
                    </div>
                    <div id="video-upload-section" class="hidden space-y-6">
                         <div id="video-drop-zone" class="border-2 border-dashed border-[var(--ai-border)] rounded-[var(--ai-radius-xl)] p-10 flex flex-col items-center justify-center gap-3 hover:border-[var(--ai-primary)]/50 hover:bg-[var(--ai-primary-soft)] transition-all cursor-pointer">
                            <span class="material-symbols-outlined text-4xl text-[var(--ai-text-muted)]">upload_file</span>
                            <p class="text-sm font-bold text-white" id="video-selected-filename">Drop video here</p>
                            <input type="file" id="video-file-input" class="hidden" accept="video/mp4,video/webm">
                        </div>
                        <div class="text-left"><label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Title</label>
                            <input type="text" id="ai-video-upload-title-input" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all" placeholder="Title">
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-[var(--ai-border)]/50">
                        <button id="ai-video-cancel" class="px-6 py-3 rounded-[var(--ai-radius-lg)] text-sm font-bold text-[var(--ai-text-dim)] hover:text-white">Cancel</button>
                        <button id="ai-video-confirm" class="px-8 py-3 bg-[var(--ai-primary)] text-white rounded-[var(--ai-radius-lg)] text-sm font-bold">Add Video</button>
                    </div>
                </div>
            </div>
        `;
        this.container = this.querySelector('#ai-video-modal-container');
        this.card = this.querySelector('.ai-video-card');
        this.tabUrl = this.querySelector('#video-tab-url');
        this.tabUpload = this.querySelector('#video-tab-upload');
        this.urlSection = this.querySelector('#video-url-section');
        this.uploadSection = this.querySelector('#video-upload-section');
        this.urlInput = this.querySelector('#ai-video-url-input');
        this.urlTitleInput = this.querySelector('#ai-video-title-input');
        this.uploadTitleInput = this.querySelector('#ai-video-upload-title-input');
        this.fileInput = this.querySelector('#video-file-input');
        this.dropZone = this.querySelector('#video-drop-zone');
        this.selectedFilenameEl = this.querySelector('#video-selected-filename');
        this.confirmBtn = this.querySelector('#ai-video-confirm');
        this.cancelBtn = this.querySelector('#ai-video-cancel');

        this.tabUrl.addEventListener('click', () => this.setMode('URL'));
        this.tabUpload.addEventListener('click', () => this.setMode('UPLOAD'));
        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', () => {
            if (this.fileInput.files.length > 0) this.handleFile(this.fileInput.files[0]);
        });
        this.container.querySelector('.absolute').addEventListener('click', () => this.close(null));
    }

    setMode(m) {
        this.mode = m;
        this.tabUrl.classList.toggle('bg-[var(--ai-bg-active)]', m === 'URL');
        this.tabUrl.classList.toggle('text-[var(--ai-text-muted)]', m !== 'URL');
        this.tabUpload.classList.toggle('bg-[var(--ai-bg-active)]', m === 'UPLOAD');
        this.tabUpload.classList.toggle('text-[var(--ai-text-muted)]', m !== 'UPLOAD');
        this.urlSection.classList.toggle('hidden', m !== 'URL');
        this.uploadSection.classList.toggle('hidden', m === 'URL');
    }

    handleFile(f) {
        if (f.type.startsWith('video/')) {
            this.file = f;
            this.selectedFilenameEl.textContent = f.name;
            if (!this.uploadTitleInput.value) this.uploadTitleInput.value = f.name.split('.').shift();
        } else window.alert('Invalid file');
    }

    async handleConfirm() {
        if (this.mode === 'URL') {
            const url = this.urlInput.value.trim();
            const vd = VideoUtils.parse(url);
            if (!vd) return window.alert('Invalid URL');
            this.close({
                type: 'VIDEO',
                subtype: vd.type,
                url,
                videoId: vd.id,
                title: this.urlTitleInput.value.trim() || `${vd.type} Video`
            });
        } else {
            if (!this.file) return window.alert('Select file');

            // Show loading state
            const originalText = this.confirmBtn.textContent;
            this.confirmBtn.disabled = true;
            this.confirmBtn.textContent = 'Uploading...';

            try {
                const formData = new FormData();
                formData.append('file', this.file);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorMessage = 'Upload failed';
                    try {
                        const errData = await response.json();
                        errorMessage = errData.error || errorMessage;
                    } catch (e) {}
                    throw new Error(errorMessage);
                }
                const result = await response.json();

                this.close({
                    type: 'VIDEO',
                    subtype: 'R2',
                    url: result.url,
                    title: this.uploadTitleInput.value.trim() || this.file.name
                });
            } catch (err) {
                console.error('Video upload error:', err);
                window.alert(
                    `CRITICAL ERROR: Failed to upload video to Cloudflare R2. ${err.message}. Videos must be hosted on R2 for global accessibility.`
                );
                this.confirmBtn.disabled = false;
                this.confirmBtn.textContent = originalText;
            }
        }
    }

    async show() {
        this.setMode('URL');
        this.urlInput.value = '';
        this.urlTitleInput.value = '';
        this.uploadTitleInput.value = '';
        this.file = null;
        this.selectedFilenameEl.textContent = 'Drop video here';
        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');
        return new Promise(r => (this.resolve = r));
    }

    close(res) {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
        if (this.resolve) {
            this.resolve(res);
            this.resolve = null;
        }
    }
}

class AiRenameModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }
    connectedCallback() {
        this.innerHTML = `
            <div id="ai-rename-modal-container" class="fixed inset-0 z-[1002] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-md p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-rename-card">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="size-12 rounded-full bg-[var(--ai-primary-soft)] text-[var(--ai-primary)] flex items-center justify-center">
                            <span class="material-symbols-outlined text-3xl">edit_note</span>
                        </div>
                        <h3 class="text-xl font-bold text-white uppercase tracking-widest modal-title">Rename</h3>
                    </div>
                    <div class="mb-8">
                        <label id="ai-rename-label" class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Title</label>
                        <input type="text" id="ai-rename-input" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all" placeholder="Enter value...">
                    </div>
                    <div class="flex items-center justify-end gap-3">
                        <button id="ai-rename-cancel" class="px-5 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold text-[var(--ai-text-dim)] hover:text-white">Cancel</button>
                        <button id="ai-rename-save" class="px-6 py-2.5 bg-[var(--ai-primary)] text-white rounded-[var(--ai-radius-lg)] text-sm font-bold">Save</button>
                    </div>
                </div>
            </div>
        `;
        this.container = this.querySelector('#ai-rename-modal-container');
        this.card = this.querySelector('.ai-rename-card');
        this.titleEl = this.querySelector('.modal-title');
        this.labelEl = this.querySelector('#ai-rename-label');
        this.input = this.querySelector('#ai-rename-input');
        this.cancelBtn = this.querySelector('#ai-rename-cancel');
        this.saveBtn = this.querySelector('#ai-rename-save');
        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.saveBtn.addEventListener('click', () => {
            const v = this.input.value.trim();
            if (v) this.close(v);
        });
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.saveBtn.click();
            if (e.key === 'Escape') this.cancelBtn.click();
        });
        this.container.querySelector('.absolute').addEventListener('click', () => this.close(null));
    }

    async show(cur = '', title = 'Rename', label = 'Title') {
        this.titleEl.textContent = title;
        this.labelEl.textContent = label;
        this.input.value = cur;
        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');
        setTimeout(() => this.input.focus(), 100);
        return new Promise(r => (this.resolve = r));
    }
    close(val) {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
        if (this.resolve) {
            this.resolve(val);
            this.resolve = null;
        }
    }
}

class AiQuiz extends HTMLElement {
    constructor() {
        super();
        this.quizData = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.score = 0;
        this.passed = false;
        this.showingFeedback = false;
        this.selectedAnswer = null;
        this.isFinished = false;
    }

    static get observedAttributes() {
        return ['module-id', 'title', 'success-threshold', 'src', 'file-id'];
    }

    async connectedCallback() {
        const src = this.getAttribute('src');
        let fileId = this.getAttribute('file-id');

        if (!fileId && src && src.startsWith('local:')) {
            fileId = src.replace('local:', '').split('|')[0];
        }

        if (fileId) {
            try {
                const file = await aiFileStore.get(fileId);
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async e => {
                        this.quizData = JSON.parse(e.target.result);
                        this.renderStart();
                    };
                    reader.readAsText(file);
                } else {
                    this.innerHTML = `
                        <div class="glass-card p-12 text-center max-w-2xl mx-auto">
                            <div class="size-20 rounded-full bg-amber-500/10 text-teal-500 flex items-center justify-center mx-auto mb-6">
                                <span class="material-symbols-outlined text-5xl text-amber-500">folder_off</span>
                            </div>
                            <h3 class="text-xl font-bold text-white mb-2">Quiz File Not Found</h3>
                            <p class="text-slate-400 mb-6 font-medium">This quiz file (ID: ${sanitizeText(fileId)}) is missing from your local browser storage. You may need to re-import it.</p>
                            <button class="btn-outline px-8 py-3" onclick="location.reload()">Refresh Page</button>
                        </div>
                    `;
                }
            } catch (e) {
                console.error('Quiz IndexedDB error:', e);
                this.innerHTML = `
                    <div class="glass-card p-12 text-center max-w-2xl mx-auto">
                        <div class="size-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
                            <span class="material-symbols-outlined text-5xl">database_off</span>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-2">Database Error</h3>
                        <p class="text-slate-400 mb-6">Failed to access the quiz data from browser storage.</p>
                        <button class="btn-outline px-8 py-3" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        } else if (src) {
            try {
                if (!src || src === '#') throw new Error('Quiz source URL is missing or invalid.');

                let fetchUrl = src;
                const isR2 = src.includes('.r2.dev') || src.includes('.cloudflarestorage.com');
                if (isR2) {
                    fetchUrl = `/api/proxy/quiz?url=${encodeURIComponent(src)}`;
                }

                const response = await fetch(fetchUrl, { credentials: 'include' });
                if (!response.ok) throw new Error(`Could not access the quiz file (HTTP ${response.status}).`);
                this.quizData = await response.json();
                this.renderStart();
            } catch (e) {
                console.error('Quiz fetch error:', e);
                this.innerHTML = `
                    <div class="glass-card p-12 text-center max-w-2xl mx-auto">
                        <div class="size-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
                            <span class="material-symbols-outlined text-5xl">error</span>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-2">Error Loading Quiz</h3>
                        <p class="text-slate-400 mb-6">We couldn't reach the quiz data. ${sanitizeText(e.message)}</p>
                        <button class="btn-outline px-8 py-3" onclick="location.reload()">Retry Page</button>
                    </div>
                `;
            }
        } else {
            // Mock data if no src or fileId provided for demo
            this.quizData = {
                title: this.getAttribute('title') || 'Knowledge Check',
                questions: [
                    {
                        question: 'What does LLM stand for?',
                        options: [
                            'Large Language Model',
                            'Linear Logic Machine',
                            'Light Learning Module',
                            'Logical Language Maker'
                        ],
                        answer: 0
                    },
                    {
                        question: 'Which company developed Gemini?',
                        options: ['OpenAI', 'Microsoft', 'Google', 'Meta'],
                        answer: 2
                    }
                ]
            };
            this.renderStart();
        }
    }

    renderStart() {
        this.innerHTML = `
            <div class="glass-card p-12 text-center max-w-2xl mx-auto bounce-in">
                <div class="size-20 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto mb-6">
                    <span class="material-symbols-outlined text-5xl">quiz</span>
                </div>
                <h2 class="text-3xl font-bold text-white mb-4 font-display">${sanitizeHTML(this.quizData.title)}</h2>
                <p class="text-slate-400 mb-8">Test your knowledge on the recent module contents. Success threshold: <span class="text-teal-400 font-bold">${sanitizeText(this.getAttribute('success-threshold') || 80)}%</span></p>
                <button class="btn-primary start-quiz-btn w-full py-4 text-lg">Start Knowledge Check</button>
            </div>
        `;
        this.querySelector('.start-quiz-btn').addEventListener('click', () => this.startQuiz());
    }

    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    getCorrectAnswerIndex(q) {
        if (!q) return null;
        const options = q.options || q.choices;
        if (!options) return null;

        // 1. Check top-level indicators
        const indicators = ['answer', 'correctAnswerIndex', 'correctIndex'];
        for (const key of indicators) {
            const val = q[key];
            if (val !== undefined && val !== null) {
                // If index-like
                if (!isNaN(parseInt(val)) && typeof val !== 'string') return parseInt(val);
                if (typeof val === 'number') return val;

                // If string matching an option text
                if (typeof val === 'string') {
                    const idx = options.findIndex(opt => this.getOptionText(opt).trim() === val.trim());
                    if (idx !== -1) return idx;

                    // Possible stringified number
                    if (!isNaN(parseInt(val))) return parseInt(val);
                }
            }
        }

        // 2. Check for boolean flags inside options
        const flagKeys = ['correct', 'isCorrect', 'is_correct', 'answer', 'is_true'];
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (typeof opt === 'object' && opt !== null) {
                for (const key of flagKeys) {
                    if (opt[key] === true || opt[key] === 'true' || opt[key] === 1) return i;
                }
            }
        }

        return null;
    }

    startQuiz() {
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.showingFeedback = false;
        this.selectedAnswer = null;
        this.isFinished = false;

        // Randomize options for each question on start
        if (this.quizData && this.quizData.questions) {
            this.quizData.questions.forEach(q => {
                const options = q.options || q.choices || [];
                q._shuffledOptions = this.shuffleArray(options.map((opt, idx) => ({ opt, originalIndex: idx })));
            });
        }

        this.renderQuestion();
    }

    getOptionText(opt) {
        if (typeof opt === 'string') return opt;
        if (typeof opt === 'number' || typeof opt === 'boolean') return String(opt);

        if (typeof opt === 'object' && opt !== null) {
            const commonKeys = ['text', 'label', 'value', 'option', 'choice', 'content', 'text_content', 'answer'];
            for (const key of commonKeys) {
                if (opt[key] !== undefined && opt[key] !== null && typeof opt[key] !== 'boolean') {
                    return String(opt[key]);
                }
            }

            // Fallback: first property that is a string
            const firstString = Object.values(opt).find(v => typeof v === 'string');
            if (firstString) return firstString;

            return JSON.stringify(opt);
        }
        return String(opt);
    }

    renderQuestion() {
        const q = this.quizData.questions[this.currentQuestionIndex];
        const options = q.options || q.choices || [];
        const progress = (this.currentQuestionIndex / this.quizData.questions.length) * 100;
        const optionsToRender = q._shuffledOptions || options.map((o, i) => ({ opt: o, originalIndex: i }));

        this.innerHTML = `
            <div class="glass-card p-10 max-w-2xl mx-auto bounce-in">
                <div class="flex justify-between items-center mb-8">
                    <span class="text-xs font-bold text-teal-400 uppercase tracking-widest">Question ${this.currentQuestionIndex + 1} of ${this.quizData.questions.length}</span>
                    <div class="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-teal-500 transition-all duration-500" style="width: ${progress}%"></div>
                    </div>
                </div>
                <h3 class="text-xl font-bold text-white mb-8 text-left">${sanitizeHTML(q.question || q.text || '')}</h3>
                <div class="space-y-3 mb-8">
                    ${optionsToRender
                        .map((shuffled, i) => {
                            const isCorrect = shuffled.originalIndex === this.getCorrectAnswerIndex(q);
                            const isSelected = this.selectedAnswer === shuffled.originalIndex;

                            let btnClass =
                                'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-teal-500/50 hover:bg-teal-500/5';
                            let icon = String.fromCharCode(65 + i);
                            let iconClass = 'flex-shrink-0 border-slate-700 group-hover:border-teal-500';

                            if (this.showingFeedback) {
                                if (isCorrect) {
                                    btnClass = 'border-green-500/50 bg-green-500/20 text-green-400';
                                    icon = 'check_circle';
                                    iconClass = 'flex-shrink-0 border-green-500 text-green-500 bg-green-500/10';
                                } else if (isSelected) {
                                    btnClass = 'border-red-500/50 bg-red-500/20 text-red-400';
                                    icon = 'cancel';
                                    iconClass = 'flex-shrink-0 border-red-500 text-red-500 bg-red-500/10';
                                } else {
                                    btnClass = 'border-slate-800 bg-slate-900/10 text-slate-600 opacity-40';
                                    iconClass = 'flex-shrink-0 border-slate-800 text-slate-700';
                                }
                            }

                            return `
                            <button class="w-full p-4 rounded-xl border transition-all group option-btn ${btnClass} ${this.showingFeedback ? 'cursor-default' : 'cursor-pointer'}" 
                                    data-original-index="${shuffled.originalIndex}" 
                                    ${this.showingFeedback ? 'disabled' : ''}>
                                <div class="flex items-center gap-4">
                                    <span class="size-6 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${iconClass}">
                                        ${this.showingFeedback ? `<span class="material-symbols-outlined text-sm font-bold flex items-center justify-center">${icon}</span>` : icon}
                                    </span>
                                    <span class="text-left">${sanitizeHTML(this.getOptionText(shuffled.opt))}</span>
                                </div>
                            </button>
                        `;
                        })
                        .join('')}
                </div>
                
                ${
                    this.showingFeedback
                        ? `
                    <div class="mb-8 p-6 rounded-xl bg-slate-900/40 border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div class="flex items-start gap-4">
                            <div class="size-8 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">info</span>
                            </div>
                            <div class="text-left">
                                <p class="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1.5 opacity-80">Explanation</p>
                                <div class="text-sm text-slate-300 leading-relaxed font-medium">
                                    ${sanitizeHTML(this.getRationale(q, this.selectedAnswer))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end gap-4 animate-in fade-in-up duration-300">
                        <button class="btn-primary next-btn px-8 py-3 flex items-center gap-2">
                            ${this.currentQuestionIndex < this.quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                            <span class="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                `
                        : ''
                }
            </div>
        `;

        this.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleAnswer(parseInt(btn.getAttribute('data-original-index'))));
        });

        if (this.showingFeedback) {
            this.querySelector('.next-btn').addEventListener('click', () => this.nextQuestion());
        }
    }

    getRationale(q, selectedIndex) {
        // 1. Check for a general rationale for the whole question
        let rationale = q.rationale || q.explanation || q.feedback || q.rationale_text || q.explanation_text;

        // 2. Check for per-option rationale
        const options = q.options || q.choices || [];
        const selectedOption = options[selectedIndex];
        if (selectedOption && typeof selectedOption === 'object') {
            const optRationale =
                selectedOption.rationale ||
                selectedOption.explanation ||
                selectedOption.feedback ||
                selectedOption.rationale_text;
            if (optRationale) rationale = optRationale;
        }

        // 3. If still no rationale, check if the question has a general rationale for the correct answer
        if (!rationale) {
            const correctIndex = this.getCorrectAnswerIndex(q);
            const correctOption = options[correctIndex];
            if (correctOption && typeof correctOption === 'object') {
                const correctRationale = correctOption.rationale || correctOption.explanation || correctOption.feedback;
                if (correctRationale) rationale = correctRationale;
            }
        }

        return rationale || "Aucune explication supplémentaire n'est fournie pour cette question.";
    }

    handleAnswer(originalIndex) {
        if (this.showingFeedback) return;
        this.selectedAnswer = originalIndex;
        this.showingFeedback = true;
        this.renderQuestion();
    }

    nextQuestion() {
        this.userAnswers.push(this.selectedAnswer);
        this.showingFeedback = false;
        this.selectedAnswer = null;

        if (this.currentQuestionIndex < this.quizData.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
        } else {
            this.calculateResults();
        }
    }

    calculateResults() {
        let correct = 0;
        this.quizData.questions.forEach((q, i) => {
            const correctAnswer = this.getCorrectAnswerIndex(q);
            if (this.userAnswers[i] === correctAnswer) correct++;
        });

        this.score = Math.round((correct / this.quizData.questions.length) * 100);
        const threshold = parseInt(this.getAttribute('success-threshold') || 80);
        this.passed = this.score >= threshold;
        this.isFinished = true;

        const quizId = `quiz-results-${this.getAttribute('title')}`;
        const previous = JSON.parse(localStorage.getItem(quizId) || 'null');

        // Only save if this attempt is better than the previous best
        if (!previous || this.score > previous.score) {
            localStorage.setItem(
                quizId,
                JSON.stringify({
                    score: this.score,
                    passed: this.passed,
                    timestamp: new Date().getTime()
                })
            );
        }

        if (this.passed) {
            localStorage.setItem(`quiz-passed-${this.getAttribute('title')}`, 'true');
        }

        // Notify globally so all modules can update their locking state
        const event = new CustomEvent('ai-quiz-passed', {
            detail: {
                title: this.getAttribute('title'),
                score: this.score,
                passed: this.passed
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(event);

        // Call progress API for every attempt if a moduleId is present
        if (this.getAttribute('module-id') && sessionStorage.getItem('userRole') !== 'ADMIN') {
            fetch('/api/progress/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    moduleId: this.getAttribute('module-id'),
                    score: this.score,
                    completed: this.passed
                })
            })
                .then(res => {
                    if (res.ok) {
                        window.dispatchEvent(
                            new CustomEvent('ai-progress-update', {
                                detail: {
                                    moduleId: this.getAttribute('module-id'),
                                    score: this.score,
                                    passed: this.passed
                                }
                            })
                        );
                    }
                })
                .catch(err => console.error('Failed to update quiz progress:', err));
        }

        this.renderResults();
    }

    renderResults() {
        const threshold = parseInt(this.getAttribute('success-threshold') || 80);

        this.innerHTML = `
            <div class="glass-card p-12 text-center max-w-2xl mx-auto bounce-in">
                <div class="size-24 rounded-full ${this.passed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} flex items-center justify-center mx-auto mb-6">
                    <span class="material-symbols-outlined text-6xl">${this.passed ? 'check_circle' : 'cancel'}</span>
                </div>
                <h2 class="text-4xl font-extrabold text-white mb-2 font-display">${this.score}%</h2>
                <p class="text-xl font-bold ${this.passed ? 'text-green-400' : 'text-red-400'} mb-6">
                    ${this.passed ? 'Congratulations! You passed.' : 'Knowledge check failed.'}
                </p>
                <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-8 inline-block mx-auto">
                    <p class="text-sm text-slate-500 uppercase tracking-widest font-bold">Passing Score: ${sanitizeText(threshold)}%</p>
                </div>
                <div class="flex gap-4">
                    <button class="btn-outline flex-1 py-4 text-sm font-bold retry-btn">Retake Quiz</button>
                    ${this.passed ? '<button class="btn-primary flex-1 py-4 text-sm font-bold finish-btn">Continue Module</button>' : ''}
                </div>
            </div>
        `;

        this.querySelector('.retry-btn').addEventListener('click', () => this.startQuiz());
        if (this.passed) {
            this.querySelector('.finish-btn').addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('ai-quiz-close', { bubbles: true, composed: true }));
            });
        }
    }
}

class AiQuizUploadModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-quiz-upload-container" class="fixed inset-0 z-[1002] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-md p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-quiz-upload-card">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="size-12 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center">
                            <span class="material-symbols-outlined text-3xl">upload_file</span>
                        </div>
                        <h3 class="text-xl font-bold text-white uppercase tracking-widest">Import Quiz</h3>
                    </div>
                    
                    <div class="space-y-6 mb-8">
                        <div>
                            <label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Quiz Title</label>
                            <input type="text" id="quiz-upload-title" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 transition-all" placeholder="e.g. Fundamentals Quiz">
                        </div>
                        
                        <div>
                            <label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Success Threshold (%)</label>
                            <input type="number" id="quiz-upload-threshold" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-teal-500/50 transition-all" value="80" min="0" max="100">
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">JSON Export File</label>
                            <div class="relative group">
                                <input type="file" id="quiz-upload-file" class="hidden" accept=".json">
                                <button id="quiz-file-trigger" class="w-full py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 group-hover:border-teal-500/50 group-hover:text-teal-400 transition-all flex flex-col items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-4xl">cloud_upload</span>
                                    <span class="text-xs font-bold uppercase tracking-wider file-status">Drop JSON here or click to browse</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end gap-3">
                        <button id="ai-quiz-upload-cancel" class="px-5 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold text-[var(--ai-text-dim)] hover:text-white transition-colors">Cancel</button>
                        <button id="ai-quiz-upload-confirm" class="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-[var(--ai-radius-lg)] text-sm font-bold transition-all shadow-lg shadow-teal-900/20">Import Quiz</button>
                    </div>
                </div>
            </div>
        `;

        this.container = this.querySelector('#ai-quiz-upload-container');
        this.card = this.querySelector('.ai-quiz-upload-card');
        this.titleInput = this.querySelector('#quiz-upload-title');
        this.thresholdInput = this.querySelector('#quiz-upload-threshold');
        this.fileInput = this.querySelector('#quiz-upload-file');
        this.fileTrigger = this.querySelector('#quiz-file-trigger');
        this.fileStatus = this.querySelector('.file-status');
        this.cancelBtn = this.querySelector('#ai-quiz-upload-cancel');
        this.confirmBtn = this.querySelector('#ai-quiz-upload-confirm');

        this.droppedFile = null;

        this.fileTrigger.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', e => {
            if (e.target.files && e.target.files[0]) {
                this.droppedFile = null; // Clear any dropped file
                this.handleFileSelected(e.target.files[0]);
            }
        });

        // Drag-and-drop support
        this.fileTrigger.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            this.fileTrigger.classList.add('border-teal-500', 'bg-teal-500/5', 'text-teal-400');
            this.fileTrigger.classList.remove('border-slate-800');
        });
        this.fileTrigger.addEventListener('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            this.fileTrigger.classList.remove('border-teal-500', 'bg-teal-500/5', 'text-teal-400');
            this.fileTrigger.classList.add('border-slate-800');
        });
        this.fileTrigger.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            this.fileTrigger.classList.remove('border-teal-500', 'bg-teal-500/5', 'text-teal-400');
            this.fileTrigger.classList.add('border-slate-800');

            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.json')) {
                this.droppedFile = file;
                this.handleFileSelected(file);
            } else {
                this.fileStatus.textContent = 'Only .json files are accepted';
                this.fileStatus.classList.add('text-red-400');
                this.fileStatus.classList.remove('text-teal-400');
            }
        });

        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.confirmBtn.addEventListener('click', async () => {
            if (!this.droppedFile && (!this.fileInput.files || !this.fileInput.files[0])) {
                return window.alert('Please select a JSON file.');
            }
            const file = this.droppedFile || this.fileInput.files[0];

            // Show loading state
            const originalText = this.confirmBtn.textContent;
            this.confirmBtn.disabled = true;
            this.confirmBtn.textContent = 'Uploading...';

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });

                if (!response.ok) {
                    let errorMessage = 'Upload failed';
                    try {
                        const errData = await response.json();
                        errorMessage = errData.error || errorMessage;
                    } catch (e) {}
                    throw new Error(errorMessage);
                }
                const uploadResult = await response.json();

                this.close({
                    title: this.titleInput.value || file.name.split('.').shift(),
                    threshold: this.thresholdInput.value,
                    blobUrl: uploadResult.url
                });
            } catch (err) {
                console.error('Quiz upload error:', err);
                window.alert(
                    `CRITICAL ERROR: Failed to upload quiz to Cloudflare R2. ${err.message}. Content must be hosted on R2 for global accessibility.`
                );
                this.confirmBtn.disabled = false;
                this.confirmBtn.textContent = originalText;
            } finally {
                this.confirmBtn.disabled = false;
                this.confirmBtn.textContent = originalText;
            }
        });
    }

    handleFileSelected(file) {
        this.fileStatus.textContent = file.name;
        this.fileStatus.classList.remove('text-red-400');
        this.fileStatus.classList.add('text-teal-400');
        if (!this.titleInput.value) {
            this.titleInput.value = file.name.replace('.json', '');
        }
    }

    async show(data = {}) {
        this.titleInput.value = data.title || '';
        this.thresholdInput.value = data.threshold || '80';
        this.fileInput.value = '';
        this.fileStatus.textContent = 'Click to select JSON';
        this.fileStatus.classList.remove('text-teal-400');

        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');

        return new Promise(resolve => {
            this.resolve = resolve;
        });
    }

    close(result) {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
        if (this.resolve) {
            this.resolve(result);
            this.resolve = null;
        }
    }
}

class AiQuizModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }
    connectedCallback() {
        this.innerHTML = `
            <div id="ai-quiz-modal-container" class="fixed inset-0 z-[1001] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/90 apple-blur"></div>
                <div class="relative w-full max-w-4xl p-6 transform scale-95 transition-all duration-300 ai-quiz-modal-card">
                    <button id="ai-quiz-close" class="absolute top-8 right-8 size-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all z-10">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                    <div id="ai-quiz-content"></div>
                </div>
            </div>
        `;
        this.container = this.querySelector('#ai-quiz-modal-container');
        this.card = this.querySelector('.ai-quiz-modal-card');
        this.content = this.querySelector('#ai-quiz-content'); // Corrected ID

        this.querySelector('#ai-quiz-close').addEventListener('click', () => this.handleRequestClose());
        this.addEventListener('ai-quiz-close', () => this.close());
        this.container.querySelector('.absolute').addEventListener('click', () => this.handleRequestClose()); // Changed to handleRequestClose
    }

    async handleRequestClose() {
        const quizElement = this.querySelector('ai-quiz');
        if (quizElement && !quizElement.isFinished && quizElement.currentQuestionIndex > 0) {
            const confirmModal = document.querySelector('ai-confirm-modal');
            if (confirmModal) {
                const confirmed = await confirmModal.show({
                    title: 'Exit Quiz?',
                    message: 'Your progress will be lost. Are you sure you want to leave?',
                    confirmText: 'Exit Quiz',
                    type: 'danger'
                });
                if (!confirmed) return;
            }
        }
        this.close();
    }

    show(title, threshold, src, moduleId, fileId) {
        if (this.container) {
            this.container.classList.remove('opacity-0', 'pointer-events-none');
        }
        if (this.card) {
            this.card.classList.remove('scale-95');
            this.card.classList.add('scale-100');
        }
        if (this.content) {
            this.content.innerHTML = `<ai-quiz title="${title}" success-threshold="${threshold}" ${src ? `src="${src}"` : ''} module-id="${moduleId || ''}" ${fileId ? `file-id="${fileId}"` : ''}></ai-quiz>`;
        }
    }

    close() {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
        this.content.innerHTML = '';
    }
}

class AiProfileModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-profile-modal-container" class="fixed inset-0 z-[1003] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/80 apple-blur"></div>
                <div class="relative bg-[var(--ai-bg-dark)] border border-[var(--ai-border)] w-full max-w-md p-8 rounded-[var(--ai-radius-2xl)] shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-profile-card">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="size-12 rounded-xl bg-[var(--ai-primary-soft)] text-[var(--ai-primary)] flex items-center justify-center">
                            <span class="material-symbols-outlined text-2xl">manage_accounts</span>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white tracking-widest uppercase">Edit Profile</h3>
                            <p class="text-[var(--ai-text-dim)] text-xs mt-1">Update your account information</p>
                        </div>
                    </div>
                    
                    <div class="space-y-6 mb-8">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">First Name</label>
                                <input type="text" id="profile-first-name" required class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all font-medium">
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Last Name</label>
                                <input type="text" id="profile-last-name" required class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all font-medium">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-[10px] font-bold text-[var(--ai-text-muted)] uppercase tracking-widest mb-2 px-1">Email Address</label>
                            <input type="email" id="profile-email" class="w-full bg-[var(--ai-bg-card)] border border-[var(--ai-border)] rounded-[var(--ai-radius-lg)] px-4 py-3 text-white focus:outline-none focus:border-[var(--ai-primary)]/50 transition-all font-medium">
                        </div>

                        <div id="profile-error" class="hidden p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end gap-3">
                        <button id="ai-profile-cancel" class="px-5 py-2.5 rounded-[var(--ai-radius-lg)] text-sm font-bold text-[var(--ai-text-dim)] hover:text-white transition-colors">Cancel</button>
                        <button id="ai-profile-save" class="px-6 py-2.5 bg-[var(--ai-primary)] hover:bg-[var(--ai-primary-hover)] text-white rounded-[var(--ai-radius-lg)] text-sm font-bold transition-all shadow-lg shadow-primary/20">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        this.container = this.querySelector('#ai-profile-modal-container');
        this.card = this.querySelector('.ai-profile-card');
        this.firstNameInput = this.querySelector('#profile-first-name');
        this.lastNameInput = this.querySelector('#profile-last-name');
        this.emailInput = this.querySelector('#profile-email');
        this.errorEl = this.querySelector('#profile-error');
        this.cancelBtn = this.querySelector('#ai-profile-cancel');
        this.saveBtn = this.querySelector('#ai-profile-save');

        this.cancelBtn.addEventListener('click', () => this.close());
        this.saveBtn.addEventListener('click', () => this.handleSave());
        this.container.querySelector('.absolute').addEventListener('click', () => this.close());
    }

    async show() {
        // Reset state
        this.errorEl.classList.add('hidden');
        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Loading...';

        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');

        try {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch user data');
            const data = await response.json();

            this.firstNameInput.value = data.user.firstName;
            this.lastNameInput.value = data.user.lastName;
            this.emailInput.value = data.user.email;

            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Save Changes';
        } catch (err) {
            this.showError('Error loading profile. Please try again.');
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Save Changes';
        }
    }

    async handleSave() {
        const payload = {
            firstName: this.firstNameInput.value.trim(),
            lastName: this.lastNameInput.value.trim(),
            email: this.emailInput.value.trim()
        };

        if (!payload.firstName || !payload.lastName || !payload.email) {
            return this.showError('All fields are required.');
        }

        this.saveBtn.disabled = true;
        this.saveBtn.textContent = 'Saving...';
        this.errorEl.classList.add('hidden');

        try {
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update profile');

            // Success! Update local storage
            sessionStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
            sessionStorage.setItem('userEmail', data.user.email);

            // Refresh the whole page to update all components and ensure new auth token is in effect
            window.location.reload();
        } catch (err) {
            this.showError(err.message);
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = 'Save Changes';
        }
    }

    showError(msg) {
        this.errorEl.textContent = msg;
        this.errorEl.classList.remove('hidden');
    }

    close() {
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
    }
}

class AiLinkInsertModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
    }

    connectedCallback() {
        this.innerHTML = `
            <div id="ai-link-modal-container" class="fixed inset-0 z-[1001] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
                <div class="relative bg-background-dark border border-slate-800 w-full max-w-md p-8 rounded-xl shadow-2xl mx-4 transform scale-95 transition-all duration-300 ai-link-card">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="size-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <span class="material-symbols-outlined text-3xl">link</span>
                        </div>
                        <h3 class="branding-font text-lg font-bold tracking-tight text-white uppercase" id="link-modal-title">Add External Link</h3>
                    </div>
                    
                    <div class="space-y-4 mb-8">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Link Name</label>
                            <input type="text" id="link-name-input" placeholder="e.g. Documentation" 
                                class="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">URL</label>
                            <input type="url" id="link-url-input" placeholder="https://example.com"
                                class="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:border-indigo-500 focus:outline-none">
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end gap-3">
                        <button id="link-cancel-btn" class="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-all">Cancel</button>
                        <button id="link-save-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">Save Link</button>
                    </div>
                </div>
            </div>
        `;

        this.container = this.querySelector('#ai-link-modal-container');
        this.card = this.querySelector('.ai-link-card');
        this.nameInput = this.querySelector('#link-name-input');
        this.urlInput = this.querySelector('#link-url-input');
        this.cancelBtn = this.querySelector('#link-cancel-btn');
        this.saveBtn = this.querySelector('#link-save-btn');
        this.titleEl = this.querySelector('#link-modal-title');

        this.cancelBtn.addEventListener('click', () => this.close());
        this.saveBtn.addEventListener('click', () => this.handleSave());
        this.container.querySelector('.absolute').addEventListener('click', () => this.close());

        // Handle Enter key
        [this.nameInput, this.urlInput].forEach(input => {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') this.handleSave();
            });
        });
    }

    show(data = null) {
        return new Promise(resolve => {
            this.resolve = resolve;
            if (data) {
                this.titleEl.textContent = 'Edit External Link';
                this.nameInput.value = data.title || '';
                this.urlInput.value = data.url || '';
            } else {
                this.titleEl.textContent = 'Add External Link';
                this.nameInput.value = '';
                this.urlInput.value = '';
            }

            this.container.classList.remove('opacity-0', 'pointer-events-none');
            this.card.classList.remove('scale-95');
            this.card.classList.add('scale-100');
            this.nameInput.focus();
        });
    }

    handleSave() {
        const title = this.nameInput.value.trim();
        const url = this.urlInput.value.trim();

        if (!title || !url) {
            alert('Please provide both a name and a URL.');
            return;
        }

        if (this.resolve) {
            this.resolve({ title, url });
            this.resolve = null;
        }
        this.close();
    }

    close() {
        if (this.resolve) {
            this.resolve(null);
            this.resolve = null;
        }
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
    }
}

// Global flag for Quill formats
let quillFormatsRegistered = false;
function registerQuillFormats() {
    if (quillFormatsRegistered || typeof Quill === 'undefined') return;

    console.log('[Quill] Registering custom formats...');
    try {
        const Block = Quill.import('blots/block');
        const BlockEmbed = Quill.import('blots/block/embed');
        const Container = Quill.import('blots/container');

        // Divider
        class DividerBlot extends BlockEmbed {}
        DividerBlot.blotName = 'divider';
        DividerBlot.tagName = 'hr';
        Quill.register(DividerBlot);

        // Callout - Uses className for automatic class application
        class CalloutBlot extends Block {}
        CalloutBlot.blotName = 'callout';
        CalloutBlot.tagName = 'div';
        CalloutBlot.className = 'ql-callout';
        Quill.register(CalloutBlot);

        // Table Support for Quill 1.x (Stable Wrapper Approach)
        console.log('[Quill] Registering Contextual Table wrapper...');
        class TableBlot extends BlockEmbed {
            static create(value) {
                let node = super.create();
                node.setAttribute('contenteditable', 'false');

                let tableHtml = '';
                if (typeof value === 'object') {
                    const rows = value.rows || 2;
                    const cols = value.cols || 2;
                    tableHtml =
                        '<table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; margin: 10px 0;"><tbody>';
                    for (let i = 0; i < rows; i++) {
                        tableHtml += '<tr>';
                        for (let j = 0; j < cols; j++) {
                            tableHtml +=
                                '<td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 12px; min-width: 50px;"><br></td>';
                        }
                        tableHtml += '</tr>';
                    }
                    tableHtml += '</tbody></table>';
                } else if (typeof value === 'string' && value.length > 0) {
                    tableHtml = value;
                } else {
                    // Default 2x2
                    tableHtml =
                        '<table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; margin: 10px 0;"><tbody><tr><td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 12px; min-width: 50px;"><br></td><td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 12px; min-width: 50px;"><br></td></tr><tr><td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 12px; min-width: 50px;"><br></td><td contenteditable="true" style="border: 1px solid #cbd5e1; padding: 12px; min-width: 50px;"><br></td></tr></tbody></table>';
                }

                node.innerHTML = `
                        <div class="ql-table-controls apple-blur" contenteditable="false" style="
                            position: absolute;
                            top: -48px;
                            left: 0;
                            display: none;
                            gap: 4px;
                            background: var(--ai-bg-dark);
                            padding: 6px;
                            border-radius: var(--ai-radius-lg);
                            border: 1px solid var(--ai-border);
                            box-shadow: var(--ai-shadow-xl);
                            z-index: 100;
                            animation: fadeIn 0.15s ease-out;
                        ">
                            <div style="display: flex; gap: 4px; padding-right: 6px; border-right: 1px solid var(--ai-border);">
                                <button class="add-row" title="Insert Row Below" style="background: transparent; border: none; padding: 6px; cursor: pointer; color: var(--ai-text-dim); display: flex; align-items: center; border-radius: var(--ai-radius-md); transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 20px;">add_row_below</span></button>
                                <button class="del-row" title="Delete Current Row" style="background: transparent; border: none; padding: 6px; cursor: pointer; color: var(--ai-danger); display: flex; align-items: center; border-radius: var(--ai-radius-md); transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 20px;">delete_sweep</span></button>
                            </div>
                            <div style="display: flex; gap: 4px; padding: 0 6px; border-right: 1px solid var(--ai-border);">
                                <button class="add-col" title="Insert Column Right" style="background: transparent; border: none; padding: 6px; cursor: pointer; color: var(--ai-text-dim); display: flex; align-items: center; border-radius: var(--ai-radius-md); transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 20px;">add_column_right</span></button>
                                <button class="del-col" title="Delete Current Column" style="background: transparent; border: none; padding: 6px; cursor: pointer; color: var(--ai-danger); display: flex; align-items: center; border-radius: var(--ai-radius-md); transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 20px;">delete_sweep</span></button>
                            </div>
                            <button class="delete-table" title="Delete Table" style="background: transparent; border: none; padding: 6px; cursor: pointer; color: var(--ai-danger); display: flex; align-items: center; border-radius: var(--ai-radius-md); transition: all 0.2s;"><span class="material-symbols-outlined" style="font-size: 20px;">delete_forever</span></button>
                        </div>
                        <div class="ql-table-wrapper" style="position: relative;">${tableHtml}</div>
                    `;

                // Context detection helper
                const getContext = () => {
                    const sel = window.getSelection();
                    if (!sel.rangeCount) return null;
                    let node = sel.getRangeAt(0).startContainer;
                    while (node && node !== this) {
                        if (node.nodeType === 1 && node.tagName === 'TD') return node;
                        node = node.parentNode;
                    }
                    return null;
                };

                // Action logic
                node.querySelector('.add-row').onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const td = getContext();
                    const table = node.querySelector('table');
                    const targetRow = td ? td.parentNode : table.rows[table.rows.length - 1];
                    const newRow = table.insertRow(targetRow.rowIndex + 1);
                    for (let i = 0; i < targetRow.cells.length; i++) {
                        const newCell = newRow.insertCell();
                        newCell.contentEditable = 'true';
                        newCell.style.border = '1px solid #cbd5e1';
                        newCell.style.padding = '12px';
                        newCell.innerHTML = '<br>';
                    }
                };

                node.querySelector('.del-row').onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const td = getContext();
                    const table = node.querySelector('table');
                    if (table.rows.length <= 1) return;
                    const targetRow = td ? td.parentNode : table.rows[table.rows.length - 1];
                    table.deleteRow(targetRow.rowIndex);
                };

                node.querySelector('.add-col').onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const td = getContext();
                    const table = node.querySelector('table');
                    const colIndex = td ? td.cellIndex : table.rows[0].cells.length - 1;
                    for (let i = 0; i < table.rows.length; i++) {
                        const newCell = table.rows[i].insertCell(colIndex + 1);
                        newCell.contentEditable = 'true';
                        newCell.style.border = '1px solid #cbd5e1';
                        newCell.style.padding = '12px';
                        newCell.innerHTML = '<br>';
                    }
                };

                node.querySelector('.del-col').onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const td = getContext();
                    const table = node.querySelector('table');
                    const colCount = table.rows[0].cells.length;
                    if (colCount <= 1) return;
                    const colIndex = td ? td.cellIndex : colCount - 1;
                    for (let i = 0; i < table.rows.length; i++) {
                        table.rows[i].deleteCell(colIndex);
                    }
                };

                node.querySelector('.delete-table').onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const modal = document.querySelector('ai-confirm-modal');
                    if (modal) {
                        modal
                            .show({
                                title: 'Delete Table',
                                message: 'Are you sure you want to delete this table entirely?',
                                confirmText: 'Delete Table',
                                type: 'danger'
                            })
                            .then(confirmed => {
                                if (confirmed) node.remove();
                            });
                    } else if (confirm('Delete this table entirely?')) {
                        node.remove();
                    }
                };

                // Hover logic
                node.onmouseenter = () => {
                    const ctrls = node.querySelector('.ql-table-controls');
                    if (ctrls) ctrls.style.display = 'flex';
                };
                node.onmouseleave = () => {
                    const ctrls = node.querySelector('.ql-table-controls');
                    if (ctrls) ctrls.style.display = 'none';
                };

                // Button styles
                node.querySelectorAll('button').forEach(btn => {
                    const isDanger = btn.className.includes('del') || btn.className.includes('delete');
                    btn.onmouseenter = () => {
                        btn.style.background = isDanger ? 'var(--ai-danger-soft)' : 'var(--ai-bg-active)';
                        btn.style.color = isDanger ? 'var(--ai-danger-hover)' : 'var(--ai-text-main)';
                    };
                    btn.onmouseleave = () => {
                        btn.style.background = 'transparent';
                        btn.style.color = isDanger ? 'var(--ai-danger)' : 'var(--ai-text-dim)';
                    };
                });

                return node;
            }
            static value(node) {
                const wrapper = node.querySelector('.ql-table-wrapper');
                return wrapper ? wrapper.innerHTML : node.innerHTML;
            }
        }
        TableBlot.blotName = 'table';
        TableBlot.tagName = 'div';
        TableBlot.className = 'ql-table-container';
        Quill.register(TableBlot, true);

        quillFormatsRegistered = true;
    } catch (e) {
        console.error('[Quill] Global registration error:', e);
    }
}

class AiPageEditorModal extends HTMLElement {
    constructor() {
        super();
        this.resolve = null;
        this.quill = null;
    }

    injectGlobalStyles() {
        if (document.getElementById('ai-quill-global-overrides')) return;
        const style = document.createElement('style');
        style.id = 'ai-quill-global-overrides';
        style.textContent = `
            /* Robust Grid for Color Pickers - ONLY when expanded */
            .ql-snow .ql-picker.ql-color.ql-expanded .ql-picker-options,
            .ql-snow .ql-picker.ql-background.ql-expanded .ql-picker-options {
                display: grid !important;
                grid-template-columns: repeat(7, 20px) !important;
                gap: 4px !important;
                padding: 12px !important;
                width: 192px !important;
                border-radius: 12px !important;
                background: #ffffff !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
                border: 1px solid #e2e8f0 !important;
                z-index: 10005 !important;
            }
            .ql-snow .ql-picker.ql-color .ql-picker-item,
            .ql-snow .ql-picker.ql-background .ql-picker-item {
                width: 20px !important;
                height: 20px !important;
                border-radius: 4px !important;
                margin: 0 !important;
                cursor: pointer !important;
                transition: transform 0.1s ease !important;
            }
            .ql-snow .ql-picker.ql-color .ql-picker-item:hover,
            .ql-snow .ql-picker.ql-background .ql-picker-item:hover {
                transform: scale(1.15) !important;
                z-index: 10 !important;
                box-shadow: 0 0 0 2px #fff, 0 0 0 3px #1b5ffe !important;
            }
        `;
        document.head.appendChild(style);
    }

    connectedCallback() {
        console.log('[AiPageEditorModal] v1.6 Mounted');
        this.injectGlobalStyles();
        this.innerHTML = `
            <div id="ai-page-editor-container" class="fixed inset-0 z-[1002] flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300">
                <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
                <div class="relative bg-white w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden mx-4 transform scale-95 transition-all duration-300 ai-page-editor-card">
                    <div class="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                        <div class="flex items-center gap-4">
                            <div class="size-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                <span class="material-symbols-outlined">description</span>
                            </div>
                            <div>
                                <input type="text" id="page-title-input" class="bg-transparent text-xl font-bold text-slate-900 border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/20 rounded p-1 min-w-[300px]" placeholder="Page Title">
                                <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Rich Text Editor</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <button id="page-editor-cancel" class="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 transition-all">Cancel</button>
                            <button id="page-editor-save" class="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2">
                                <span class="material-symbols-outlined text-sm">save</span>
                                Save Changes
                            </button>
                        </div>
                    </div>
                    <div class="flex-1 flex flex-col text-slate-900 min-h-0">
                        <div id="quill-toolbar" class="border-t-0 border-x-0 border-b border-slate-200">
                            <span class="ql-formats">
                                <select class="ql-size">
                                    <option value="small">Small</option>
                                    <option selected>Normal</option>
                                    <option value="large">Large</option>
                                    <option value="huge">Huge</option>
                                </select>
                                <select class="ql-header">
                                    <option value="1">H1</option>
                                    <option value="2">H2</option>
                                    <option selected>Text</option>
                                </select>
                            </span>
                            <span class="ql-formats">
                                <button class="ql-bold"></button>
                                <button class="ql-italic"></button>
                                <button class="ql-underline"></button>
                            </span>
                            <span class="ql-formats">
                                <select class="ql-color"></select>
                                <select class="ql-background"></select>
                            </span>
                            <span class="ql-formats">
                                <button class="ql-list" value="ordered"></button>
                                <button class="ql-list" value="bullet"></button>
                                <button class="ql-indent" value="-1"></button>
                                <button class="ql-indent" value="+1"></button>
                            </span>
                            <span class="ql-formats">
                                <select class="ql-align"></select>
                                <button class="ql-blockquote"></button>
                            </span>
                            <span class="ql-formats">
                                <button class="ql-link"></button>
                                <button class="ql-image"></button>
                                <button class="ql-video"></button>
                                <button class="ql-divider"><span class="material-symbols-outlined text-[18px]">horizontal_rule</span></button>
                                <button class="ql-callout"><span class="material-symbols-outlined text-[18px]">info</span></button>
                                <button class="ql-table"><span class="material-symbols-outlined text-[18px]">table_chart</span></button>
                            </span>
                        </div>
                        <div id="quill-editor" class="flex-1 overflow-y-auto prose max-w-none p-4"></div>
                    </div>
                </div>
            </div>
            <style>
                #quill-editor {
                    font-size: 16px;
                    line-height: 1.6;
                    color: #1e293b;
                }
                .ql-editor {
                    min-height: 100%;
                    padding: 2rem 3rem !important;
                }
                .ql-toolbar.ql-snow {
                    border: none !important;
                    background: #f8fafc;
                    padding: 8px 16px !important;
                    display: flex !important;
                    flex-wrap: wrap !important;
                    align-items: center !important;
                    gap: 8px !important;
                    min-height: 48px;
                    overflow: visible !important;
                }
                .ql-toolbar.ql-snow * {
                    box-sizing: border-box !important;
                    float: none !important;
                }
                .ql-formats {
                    display: inline-flex !important;
                    align-items: center !important;
                    margin-right: 16px !important;
                    gap: 2px !important;
                }
                .ql-snow.ql-toolbar button, .ql-snow.ql-toolbar .ql-picker {
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    height: 36px !important;
                    width: 36px !important;
                    padding: 0 !important;
                    border-radius: 8px;
                    transition: all 0.2s;
                    color: #475569;
                    background: transparent;
                    margin: 0 !important;
                }
                .ql-snow.ql-toolbar .ql-picker {
                    width: auto !important;
                    padding: 0 4px !important;
                }
                .ql-snow.ql-toolbar .ql-picker.ql-size {
                    min-width: 90px !important;
                }
                .ql-snow.ql-toolbar .ql-picker.ql-header {
                    min-width: 70px !important;
                }
                /* Icon-only pickers should match buttons */
                .ql-snow.ql-toolbar .ql-picker.ql-color,
                .ql-snow.ql-toolbar .ql-picker.ql-background,
                .ql-snow.ql-toolbar .ql-picker.ql-align {
                    width: 36px !important;
                    min-width: 36px !important;
                    padding: 0 !important;
                }
                .ql-snow.ql-toolbar .ql-picker.ql-color .ql-picker-label,
                .ql-snow.ql-toolbar .ql-picker.ql-background .ql-picker-label,
                .ql-snow.ql-toolbar .ql-picker.ql-align .ql-picker-label {
                    justify-content: center !important;
                }
                .ql-snow.ql-toolbar .ql-picker-label {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    height: 100% !important;
                    width: 100% !important;
                    padding: 0 !important;
                    border: none !important;
                }
                /* Removed strict SVG dimensions to allow color bars and arrows to render naturally */
                .ql-toolbar.ql-snow button svg, 
                .ql-toolbar.ql-snow button .material-symbols-outlined,
                .ql-snow.ql-toolbar .ql-picker-label svg {
                    width: 20px !important;
                    height: 20px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 20px !important;
                    pointer-events: none;
                    margin: 0 !important;
                }
                .ql-snow.ql-toolbar button::before, .ql-snow.ql-toolbar button::after,
                .ql-snow.ql-toolbar .ql-picker-label::before, .ql-snow.ql-toolbar .ql-picker-label::after {
                    display: none !important;
                }
                /* Quill internal SVG styling - NO !important to allow inline color overrides */
                .ql-snow .ql-stroke { stroke: #475569; stroke-width: 2; }
                .ql-snow .ql-fill { fill: #475569; }
                .ql-snow .ql-picker.ql-header .ql-picker-label::before,
                .ql-snow .ql-picker.ql-size .ql-picker-label::before {
                    display: block !important;
                    font-size: 12px;
                    font-weight: 600;
                    color: #475569;
                }
                .ql-snow.ql-toolbar button:hover .ql-stroke { stroke: #1b5ffe !important; }
                .ql-snow.ql-toolbar button:hover .ql-fill { fill: #1b5ffe !important; }
                .ql-snow.ql-toolbar button:hover .material-symbols-outlined { color: #1b5ffe !important; }
                .ql-container.ql-snow {
                    border: none !important;
                }
                .ql-snow .ql-picker.ql-color .ql-picker-item:hover,
                .ql-snow .ql-picker.ql-background .ql-picker-item:hover {
                    border: 1px solid #3b82f6 !important;
                    transform: scale(1.15);
                    z-index: 10;
                }
                .ql-editor.ql-blank::before {
                    left: 3rem !important;
                    font-style: normal !important;
                    color: #94a3b8 !important;
                }
                /* Custom Video Embed Styling in Editor */
                .ql-video {
                    width: 100%;
                    aspect-ratio: 16/9;
                    border-radius: 12px;
                    margin: 20px 0;
                }
                .ql-callout {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                    display: flex;
                    gap: 15px;
                    align-items: flex-start;
                    color: #0369a1;
                    position: relative;
                }
                .ql-callout::before {
                    content: 'info';
                    font-family: 'Material Symbols Outlined';
                    font-size: 24px;
                    flex-shrink: 0;
                }
                hr {
                    border: none;
                    height: 2px;
                    background: #e2e8f0;
                    margin: 30px 0;
                }
                /* Table Picker UI */
                .ql-table-picker {
                    background: rgba(15, 23, 42, 0.98);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    padding: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    user-select: none;
                    animation: pickerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes pickerIn {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ql-table-picker-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: #94a3b8;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .ql-table-picker-grid {
                    display: grid;
                    grid-template-columns: repeat(10, 1fr);
                    gap: 3px;
                }
                .ql-table-picker-cell {
                    width: 18px;
                    height: 18px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    transition: all 0.1s;
                    cursor: pointer;
                }
                .ql-table-picker-cell.active {
                    background: rgba(27, 95, 254, 0.4);
                    border-color: #1b5ffe;
                    box-shadow: 0 0 8px rgba(27, 95, 254, 0.3);
                }
                
                .ql-table-container { 
                    position: relative; 
                    margin: 24px 0;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    padding: 4px;
                }
                .ql-editor .ql-table-container:hover { 
                    border-color: rgba(27, 95, 254, 0.2);
                    background: rgba(27, 95, 254, 0.02);
                }
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }
                td {
                    border: 1px solid #cbd5e1;
                    padding: 12px;
                    min-width: 50px;
                }
                .ql-editor table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1rem 0;
                }
                .ql-editor td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 12px;
                }
            </style>
        `;

        this.container = this.querySelector('#ai-page-editor-container');
        this.card = this.querySelector('.ai-page-editor-card');
        this.titleInput = this.querySelector('#page-title-input');
        this.cancelBtn = this.querySelector('#page-editor-cancel');
        this.saveBtn = this.querySelector('#page-editor-save');

        this.cancelBtn.addEventListener('click', () => this.close(null));
        this.saveBtn.addEventListener('click', () => this.handleSave());
        this.container.querySelector('.absolute').addEventListener('click', () => this.close(null));
    }

    initQuill() {
        if (this.quill) return;

        console.log('[AiPageEditorModal] Initializing Quill...');
        if (typeof Quill === 'undefined') {
            console.error('Quill is not loaded.');
            return;
        }

        // 1. Ensure formats are registered
        registerQuillFormats();

        // 2. Initialize Quill
        this.quill = new Quill(this.querySelector('#quill-editor'), {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: '#quill-toolbar',
                    handlers: {
                        divider: function () {
                            const range = this.quill.getSelection(true);
                            this.quill.insertEmbed(range.index, 'divider', true);
                            this.quill.setSelection(range.index + 1);
                        },
                        callout: function () {
                            const range = this.quill.getSelection(true);
                            if (range) {
                                const [line] = this.quill.getLine(range.index);
                                const isCallout = line && line.statics.blotName === 'callout';
                                this.quill.formatLine(range.index, range.length, 'callout', !isCallout);
                            }
                        }
                    }
                }
            },
            placeholder: 'Start writing...',
            bounds: '#ai-page-editor-container'
        });

        // 3. Manual Table Button Listener (Bypassing Quill's handler system which can be flaky for 'table')
        const tableBtn = this.querySelector('.ql-table');
        if (tableBtn) {
            console.log('[Quill] Manual listener attached to Table button');
            tableBtn.addEventListener(
                'click',
                e => {
                    e.preventDefault();
                    e.stopPropagation();

                    let range = this.quill.getSelection(true);
                    if (!range) range = { index: this.quill.getLength() - 1, length: 0 };

                    // Toggle logic
                    let picker = this.container.querySelector('#ql-table-picker');
                    if (picker) {
                        picker.remove();
                        return;
                    }

                    picker = document.createElement('div');
                    picker.id = 'ql-table-picker';
                    picker.className = 'ql-table-picker apple-blur';
                    // Inline styles for guaranteed visibility and alignment
                    Object.assign(picker.style, {
                        position: 'absolute',
                        zIndex: '10000',
                        background: 'var(--ai-bg-dark)',
                        padding: '16px',
                        borderRadius: 'var(--ai-radius-xl)',
                        border: '1px solid var(--ai-border)',
                        boxShadow: 'var(--ai-shadow-xl)',
                        display: 'block',
                        animation: 'pickerIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    });

                    // Position relative to toolbar button
                    const btnRect = tableBtn.getBoundingClientRect();
                    const containerRect = this.container.getBoundingClientRect();
                    picker.style.top = `${btnRect.bottom - containerRect.top + 8}px`;
                    picker.style.left = `${btnRect.left - containerRect.left}px`;

                    picker.innerHTML = `
                    <div class="ql-table-picker-title" style="font-size: 10px; font-weight: 800; color: var(--ai-text-muted); margin-bottom: 12px; text-transform: uppercase; tracking-widest: 0.1em;">Table 2x2</div>
                    <div class="ql-table-picker-grid" style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px;"></div>
                `;

                    const grid = picker.querySelector('.ql-table-picker-grid');
                    const title = picker.querySelector('.ql-table-picker-title');

                    for (let r = 1; r <= 8; r++) {
                        for (let c = 1; c <= 10; c++) {
                            const cell = document.createElement('div');
                            cell.className = 'ql-table-picker-cell';
                            cell.dataset.row = r;
                            cell.dataset.col = c;
                            Object.assign(cell.style, {
                                width: '18px',
                                height: '18px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                                background: 'rgba(255, 255, 255, 0.02)'
                            });

                            cell.onmouseenter = () => {
                                title.innerText = `Table ${r}x${c}`;
                                grid.querySelectorAll('.ql-table-picker-cell').forEach(item => {
                                    const ir = parseInt(item.dataset.row);
                                    const ic = parseInt(item.dataset.col);
                                    if (ir <= r && ic <= c) {
                                        item.style.background = 'var(--ai-primary-soft)';
                                        item.style.borderColor = 'var(--ai-primary)';
                                        item.style.boxShadow = '0 0 8px var(--ai-primary-soft)';
                                    } else {
                                        item.style.background = 'rgba(255, 255, 255, 0.02)';
                                        item.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                        item.style.boxShadow = 'none';
                                    }
                                });
                            };

                            cell.onclick = ev => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                console.log(`[Quill] Picker: Inserting ${r}x${c} at index ${range.index}`);

                                // 1. Close picker
                                picker.remove();

                                // 2. Insert table
                                try {
                                    const index = Math.min(range.index, this.quill.getLength() - 1);
                                    this.quill.focus();
                                    this.quill.insertEmbed(index, 'table', { rows: r, cols: c });
                                    this.quill.setSelection(index + 1, 0, 'silent');
                                } catch (err) {
                                    console.error('[Quill] Failed to insert table:', err);
                                }
                            };
                            grid.appendChild(cell);
                        }
                    }

                    this.container.appendChild(picker);

                    const cleanup = ev => {
                        if (!picker.contains(ev.target) && ev.target !== tableBtn) {
                            picker.remove();
                            document.removeEventListener('mousedown', cleanup);
                        }
                    };
                    setTimeout(() => document.addEventListener('mousedown', cleanup), 10);
                },
                true
            );
        } else {
            console.error('[Quill] Could not find .ql-table button for manual listener');
        }
    }

    async show(data = { title: '', content: '' }) {
        this.initQuill();

        this.titleInput.value = data.title || '';
        this.quill.root.innerHTML = sanitizeHTML(data.content || '');

        this.container.classList.remove('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-95');
        this.card.classList.add('scale-100');

        return new Promise(resolve => {
            this.resolve = resolve;
        });
    }

    handleSave() {
        const title = this.titleInput.value.trim() || 'Untitled Page';
        const content = this.quill.root.innerHTML;

        if (this.resolve) {
            this.resolve({ title, content });
            this.resolve = null;
        }
        this.close();
    }

    close() {
        if (this.resolve) {
            this.resolve(null);
            this.resolve = null;
        }
        this.container.classList.add('opacity-0', 'pointer-events-none');
        this.card.classList.remove('scale-100');
        this.card.classList.add('scale-95');
    }
}

customElements.define('learner-header', LearnerHeader);
customElements.define('admin-header', AdminHeader);
customElements.define('admin-sidebar', AdminSidebar);
customElements.define('ai-module', AiModule);
customElements.define('ai-content-item', AiContentItem);
customElements.define('ai-confirm-modal', AiConfirmModal);
customElements.define('ai-content-picker-modal', AiContentPickerModal);
customElements.define('ai-media-upload-modal', AiMediaUploadModal);
customElements.define('ai-media-viewer-modal', AiMediaViewerModal);
customElements.define('ai-video-insert-modal', AiVideoInsertModal);
customElements.define('ai-rename-modal', AiRenameModal);
customElements.define('ai-link-insert-modal', AiLinkInsertModal);
customElements.define('ai-page-editor-modal', AiPageEditorModal);
customElements.define('ai-quiz', AiQuiz);
customElements.define('ai-quiz-modal', AiQuizModal);
customElements.define('ai-quiz-upload-modal', AiQuizUploadModal);
customElements.define('ai-profile-modal', AiProfileModal);

/**
 * AiRating component for 5-star rating system
 */
class AiRating extends HTMLElement {
    constructor() {
        super();
        this.stars = 0;
        this.trackId = this.getAttribute('track-id');
        this.readonly = this.hasAttribute('readonly') && this.getAttribute('readonly') !== 'false';
        this.showCount = this.hasAttribute('show-count') && this.getAttribute('show-count') !== 'false';
        this.currentRating = 0;
        this.totalRatings = 0;
    }

    async connectedCallback() {
        this.render();
        await this.fetchStats();
    }

    static get observedAttributes() {
        return ['track-id', 'stars', 'readonly', 'show-count'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'track-id') {
            this.trackId = newVal;
            this.fetchStats();
        } else if (name === 'stars') {
            this.stars = parseInt(newVal) || 0;
            this.render();
        } else if (name === 'readonly') {
            this.readonly = newVal !== 'false';
            this.render();
        } else if (name === 'show-count') {
            this.showCount = newVal !== 'false';
            this.render();
        }
    }

    async fetchStats() {
        if (!this.trackId) return;
        try {
            // Use the public stats endpoint for learners
            const res = await fetch(`/api/ratings/${this.trackId}/stats`, { credentials: 'include' });
            if (res.ok) {
                const stats = await res.json();
                this.currentRating = stats.averageRating;
                this.totalRatings = stats.totalRatings;

                // If readonly, we show the average as the filled stars
                if (this.readonly) {
                    this.stars = Math.round(this.currentRating);
                    this.addEventListener('click', () => {
                        this.dispatchEvent(new CustomEvent('rating-click', { bubbles: true }));
                    });
                }
                this.render();
            }
        } catch (e) {
            console.warn('[AiRating] Stats fetch failed:', e);
        }
    }

    render() {
        // Use discrete sizing: very small for readonly, moderate for interactive
        const starSize = this.readonly ? 'w-3 h-3' : 'w-4 h-4';
        const containerClass = this.readonly ? 'gap-0.5' : 'gap-1';

        const solidStar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="${starSize}"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>`;
        const outlineStar = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${starSize}"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.536a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>`;

        this.innerHTML = `
            <div class="flex items-center ${containerClass} select-none cursor-inherit">
                <div class="flex text-amber-500 shrink-0">
                    ${[1, 2, 3, 4, 5]
                        .map(
                            i => `
                        <button class="star-btn flex items-center justify-center ${this.readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}"
                                data-star="${i}"
                                ${this.readonly ? 'disabled' : ''}>
                            ${i <= this.stars ? solidStar : `<span class="text-slate-400 opacity-60">${outlineStar}</span>`}
                        </button>
                    `
                        )
                        .join('')}
                </div>
                ${this.showCount && this.totalRatings > 0 ? `<span class="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-tighter ml-1">(${sanitizeText(this.currentRating)}/5 · ${sanitizeText(this.totalRatings)} ${this.totalRatings > 1 ? 'votes' : 'vote'})</span>` : ''}
                ${!this.showCount && this.readonly && this.totalRatings > 0 ? `<span class="text-[10px] whitespace-nowrap font-bold text-slate-400 ml-1">${sanitizeText(this.currentRating)}</span>` : ''}
            </div>
        `;

        if (!this.readonly) {
            this.querySelectorAll('.star-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.stars = parseInt(btn.dataset.star);
                    this.submitRating();
                });

                btn.addEventListener('mouseenter', () => {
                    const star = parseInt(btn.dataset.star);
                    this.highlightStars(star, solidStar, outlineStar);
                });

                btn.addEventListener('mouseleave', () => {
                    this.highlightStars(this.stars, solidStar, outlineStar);
                });
            });
        }
    }

    highlightStars(n, solidStar, outlineStar) {
        this.querySelectorAll('.star-btn').forEach((btn, i) => {
            if (i < n) {
                btn.innerHTML = solidStar;
            } else {
                btn.innerHTML = `<span class="text-slate-400 opacity-60">${outlineStar}</span>`;
            }
        });
    }

    async submitRating() {
        try {
            const res = await fetch(`/api/ratings/${this.trackId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stars: this.stars }),
                credentials: 'include'
            });
            if (res.ok) {
                this.render();
                // Refresh stats after voting
                await this.fetchStats();
                this.dispatchEvent(
                    new CustomEvent('rated', { detail: { trackId: this.trackId, stars: this.stars }, bubbles: true })
                );
            }
        } catch (e) {
            console.error('[AiRating] Submit failed:', e);
        }
    }
}
customElements.define('ai-rating', AiRating);
