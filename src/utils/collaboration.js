const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateUserId = () => {
  return `user_${Math.random().toString(36).substr(2, 9)}`;
};

export const getUserColor = (userId) => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
};

export const generateShareableLink = (sessionId) => {
  const baseUrl = window.location.origin;
  return `${baseUrl}?session=${sessionId}`;
};

export class CollaborationManager {
  constructor(sessionId, userId, onUpdate) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.onUpdate = onUpdate;
    this.users = new Map();
    this.cursors = new Map();
    this.pollInterval = null;
  }

  async init() {
    this.users.set(this.userId, {
      id: this.userId,
      color: getUserColor(this.userId),
      name: `User ${this.userId.slice(-4)}`,
      lastSeen: Date.now(),
    });

    this.startPolling();
  }

  startPolling() {
    this.pollInterval = setInterval(() => {
      this.checkActivity();
    }, 5000);
  }

  checkActivity() {
    const now = Date.now();
    for (const [userId, user] of this.users.entries()) {
      if (userId !== this.userId && now - user.lastSeen > 10000) {
        this.users.delete(userId);
        this.cursors.delete(userId);
        this.onUpdate({ users: Array.from(this.users.values()), cursors: Array.from(this.cursors.entries()) });
      }
    }
  }

  updateCursor(x, y) {
    this.cursors.set(this.userId, { x, y, userId: this.userId });
  }

  addUser(userId) {
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        color: getUserColor(userId),
        name: `User ${userId.slice(-4)}`,
        lastSeen: Date.now(),
      });
      this.onUpdate({ users: Array.from(this.users.values()), cursors: Array.from(this.cursors.entries()) });
    }
  }

  updateUserActivity(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.lastSeen = Date.now();
    }
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  getCursors() {
    return Array.from(this.cursors.entries());
  }

  destroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

export const broadcastChange = async (sessionId, elements, userId) => {
  try {
    await window.storage?.set(`collab:${sessionId}:elements`, JSON.stringify({
      elements,
      userId,
      timestamp: Date.now(),
    }), true);
    return true;
  } catch {
    return false;
  }
};

export const subscribeToChanges = async (sessionId, lastTimestamp, callback) => {
  try {
    const result = await window.storage?.get(`collab:${sessionId}:elements`, true);
    if (result && result.value) {
      const data = JSON.parse(result.value);
      if (data.timestamp > lastTimestamp) {
        callback(data.elements, data.userId, data.timestamp);
      }
    }
  } catch {}
};
