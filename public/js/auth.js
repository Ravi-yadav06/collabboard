const Auth = {
  getToken() {
    return localStorage.getItem('collabboard_token');
  },

  setToken(token) {
    localStorage.setItem('collabboard_token', token);
  },

  removeToken() {
    localStorage.removeItem('collabboard_token');
    localStorage.removeItem('collabboard_user');
  },

  getUser() {
    const u = localStorage.getItem('collabboard_user');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    localStorage.setItem('collabboard_user', JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register');
    }

    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  logout() {
    this.removeToken();
    window.location.href = '/login.html';
  },

  async fetchWithAuth(url, options = {}) {
    const token = this.getToken();
    if (!token) {
      this.logout();
      throw new Error('No authentication token found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) {
      this.logout();
      throw new Error(data.error || 'Unauthorized');
    }

    if (!res.ok) {
      throw new Error(data.error || 'API Request failed');
    }

    return data;
  }
};
