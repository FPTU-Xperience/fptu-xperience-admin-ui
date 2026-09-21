/**
 * API client cho FPTU Xperience Admin UI.
 * Kết nối đến ClubReportHub Backend API.
 * Base URL có thể được override qua biến môi trường VITE_API_BASE_URL.
 */

const DEFAULT_BASE_URL = 'http://localhost:7000';
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  DEFAULT_BASE_URL
).replace(/\/+$/, '');

// =============================================================================
// MOCK DATA
// =============================================================================

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_BASE_URL;

const mockUsers = [
  {
    id: 'mock-sysadmin-001',
    userId: 'mock-sysadmin-001',
    username: 'systemadmin',
    studentCode: 'SA001',
    fullName: 'Quản trị hệ thống',
    name: 'Quản trị hệ thống',
    email: 'systemadmin@club.local',
    roles: ['SYSTEM_ADMIN'],
    isLocked: false,
    createdAt: '2024-01-01T00:00:00Z',
    clubIds: [],
  },
  {
    id: 'mock-ctsv-001',
    userId: 'mock-ctsv-001',
    username: 'studentaffairs',
    studentCode: 'CTSV001',
    fullName: 'Cán bộ công tác sinh viên',
    name: 'Cán bộ công tác sinh viên',
    email: 'studentaffairs@club.local',
    roles: ['STUDENT_AFFAIRS_ADMIN'],
    isLocked: false,
    createdAt: '2024-01-01T00:00:00Z',
    clubIds: [],
  },
  {
    id: 'user-001',
    userId: 'user-001',
    username: 'nguyen.van.a',
    studentCode: 'DE170001',
    fullName: 'Nguyễn Văn A',
    name: 'Nguyễn Văn A',
    email: 'nguyen.van.a@student.fpt.edu.vn',
    roles: ['CLUB_MANAGER'],
    isLocked: false,
    createdAt: '2024-09-01T00:00:00Z',
    clubIds: ['club-001'],
  },
  {
    id: 'user-002',
    userId: 'user-002',
    username: 'tran.thi.b',
    studentCode: 'DE170002',
    fullName: 'Trần Thị B',
    name: 'Trần Thị B',
    email: 'tran.thi.b@student.fpt.edu.vn',
    roles: ['CLUB_MEMBER'],
    isLocked: false,
    createdAt: '2024-09-15T00:00:00Z',
    clubIds: ['club-001', 'club-002'],
  },
];

const mockClubs = [
  {
    id: 'club-001',
    name: 'FPTU Music Club',
    type: 'art',
    description: 'Câu lạc bộ âm nhạc của trường ĐH FPT',
    status: 'active',
    foundedAt: '2020-09-01T00:00:00Z',
    memberCount: 45,
    managerId: 'user-001',
  },
  {
    id: 'club-002',
    name: 'FPTU Tech Club',
    type: 'technology',
    description: 'Câu lạc bộ công nghệ thông tin',
    status: 'active',
    foundedAt: '2021-03-15T00:00:00Z',
    memberCount: 78,
    managerId: 'user-003',
  },
  {
    id: 'club-003',
    name: 'FPTU Sports Club',
    type: 'sports',
    description: 'Câu lạc bộ thể thao',
    status: 'active',
    foundedAt: '2019-01-10T00:00:00Z',
    memberCount: 120,
    managerId: 'user-004',
  },
];

const mockActivities = [
  {
    id: 'act-001',
    clubId: 'club-001',
    name: 'Music Festival 2026',
    description: 'Lễ hội âm nhạc mùa xuân',
    startAt: '2026-04-15T18:00:00Z',
    endAt: '2026-04-15T22:00:00Z',
    status: 'upcoming',
    participantCount: 200,
  },
  {
    id: 'act-002',
    clubId: 'club-002',
    name: 'Hackathon 2026',
    description: 'Cuộc thi lập trình Hackathon',
    startAt: '2026-05-01T08:00:00Z',
    endAt: '2026-05-03T18:00:00Z',
    status: 'upcoming',
    participantCount: 150,
  },
];

const mockReports = [
  {
    id: 'report-001',
    clubId: 'club-001',
    title: 'Báo cáo hoạt động tháng 1/2026',
    status: 'pending',
    submittedAt: '2026-02-01T10:00:00Z',
    period: '2026-01',
  },
  {
    id: 'report-002',
    clubId: 'club-002',
    title: 'Báo cáo hoạt động tháng 1/2026',
    status: 'approved',
    submittedAt: '2026-02-01T14:00:00Z',
    reviewedAt: '2026-02-05T09:00:00Z',
    period: '2026-01',
  },
];

const mockRoles = [
  { id: 'role-001', name: 'SYSTEM_ADMIN', displayName: 'Quản trị hệ thống' },
  { id: 'role-002', name: 'ADMIN', displayName: 'Quản trị viên' },
  { id: 'role-003', name: 'STUDENT_AFFAIRS_ADMIN', displayName: 'Công tác sinh viên' },
  { id: 'role-004', name: 'CLUB_MANAGER', displayName: 'Chủ nhiệm CLB' },
  { id: 'role-005', name: 'TREASURER', displayName: 'Thủ quỹ' },
  { id: 'role-006', name: 'CLUB_MEMBER', displayName: 'Thành viên CLB' },
];

const mockNotifications = [
  {
    id: 'notif-001',
    type: 'info',
    title: 'Báo cáo mới được gửi',
    message: 'FPTU Music Club đã nộp báo cáo hoạt động tháng 1/2026',
    read: false,
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'notif-002',
    type: 'warning',
    title: 'Cảnh báo bất thường XP',
    message: 'Phát hiện bất thường điểm XP của sinh viên DE170001',
    read: false,
    createdAt: '2026-02-02T08:30:00Z',
  },
];

// Mock API handler
function mockRequest(path, options = {}) {
  const { method = 'GET', body } = options;

  // Parse path and params
  const pathParts = path.split('/').filter(Boolean);
  const resource = pathParts[0];
  const id = pathParts[1];

  // Simulate network delay
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        let response = null;
        let status = 200;

        // Auth endpoints
        if (path.includes('/api/auth/')) {
          if (path.includes('/dev-login') && method === 'POST') {
            const email = body?.email || '';
            const emailLower = email.toLowerCase();
            let user = null;
            let token = 'mock-token-' + Date.now();

            if (emailLower.includes('systemadmin') || (emailLower.includes('admin') && emailLower.includes('.local'))) {
              user = { ...mockUsers[0], email }; // SYSTEM_ADMIN
            } else if (emailLower.includes('studentaffairs') || emailLower.includes('ctsv') || emailLower.includes('sinhvien') || emailLower.includes('affairs')) {
              user = { ...mockUsers[1], email }; // STUDENT_AFFAIRS_ADMIN
            } else {
              status = 403;
              response = { message: 'Tài khoản không có quyền truy cập hệ thống.' };
            }

            if (status === 200) {
              // Store email for mock me endpoint
              setMockUserEmail(email);
              response = {
                token,
                refreshToken: 'mock-refresh-' + Date.now(),
                user,
              };
            }
          } else if (path.includes('/logout')) {
            response = { success: true };
          } else if (path.includes('/refresh') && method === 'POST') {
            response = {
              token: 'mock-token-' + Date.now(),
              refreshToken: 'mock-refresh-' + Date.now(),
            };
          }
        }
        // Me endpoints - determine user based on stored email
        else if (path.includes('/api/v1/me') || path.includes('/admin/me') || path.includes('/student-affairs/me')) {
          const token = getAccessToken();
          const storedEmail = getMockUserEmail();

          if (token && token.startsWith('mock-token-')) {
            // Determine user based on email
            const email = (storedEmail || '').toLowerCase();
            if (email.includes('systemadmin') || (email.includes('admin') && email.includes('.local'))) {
              response = { ...mockUsers[0], email: storedEmail };
            } else if (email.includes('studentaffairs') || email.includes('ctsv') || email.includes('sinhvien') || email.includes('affairs')) {
              response = { ...mockUsers[1], email: storedEmail };
            } else {
              response = { ...mockUsers[0], email: storedEmail };
            }
          } else {
            status = 401;
            response = { message: 'Unauthorized' };
          }
        }
        // Users endpoints
        else if (resource === 'users' || (resource === 'api' && pathParts[1] === 'users')) {
          if (path.includes('/roles')) {
            response = mockRoles;
          } else if (id) {
            response = mockUsers.find(u => u.id === id || u.userId === id) || mockUsers[0];
          } else {
            response = { items: mockUsers, total: mockUsers.length };
          }
        }
        // Clubs endpoints
        else if (resource === 'clubs' || (resource === 'api' && pathParts[1] === 'clubs')) {
          if (id) {
            response = mockClubs.find(c => c.id === id) || mockClubs[0];
          } else {
            response = { items: mockClubs, total: mockClubs.length };
          }
        }
        // Activities endpoints
        else if (resource === 'activities' || (resource === 'api' && pathParts[1] === 'activities')) {
          if (id) {
            response = mockActivities.find(a => a.id === id) || mockActivities[0];
          } else {
            response = { items: mockActivities, total: mockActivities.length };
          }
        }
        // Reports endpoints
        else if (resource === 'reports' || (resource === 'api' && pathParts[1] === 'reports')) {
          if (id) {
            response = mockReports.find(r => r.id === id) || mockReports[0];
          } else {
            response = { items: mockReports, total: mockReports.length };
          }
        }
        // Notifications
        else if (resource === 'notifications' || (resource === 'api' && pathParts[1] === 'notifications')) {
          if (id) {
            response = mockNotifications.find(n => n.id === id) || mockNotifications[0];
          } else {
            response = { items: mockNotifications, total: mockNotifications.length };
          }
        }
        // Health check
        else if (path === '/' || path === '/health') {
          response = { status: 'ok', timestamp: new Date().toISOString() };
        }
        // KPI
        else if (path.includes('/kpis/')) {
          response = {
            leaderboard: [
              { clubId: 'club-001', name: 'FPTU Music Club', score: 95, rank: 1 },
              { clubId: 'club-002', name: 'FPTU Tech Club', score: 88, rank: 2 },
              { clubId: 'club-003', name: 'FPTU Sports Club', score: 82, rank: 3 },
            ],
            rules: [
              { id: 'rule-001', name: 'Chấm điểm định kỳ', weight: 0.3 },
              { id: 'rule-002', name: 'Hoạt động cộng đồng', weight: 0.25 },
              { id: 'rule-003', name: 'Báo cáo đúng hạn', weight: 0.2 },
              { id: 'rule-004', name: 'Thành viên tích cực', weight: 0.15 },
              { id: 'rule-005', name: 'Sáng tạo nội dung', weight: 0.1 },
            ],
          };
        }
        // Deadlines
        else if (path.includes('/deadlines')) {
          response = [
            { id: 'dl-001', period: '2026-01', dueDate: '2026-02-05T23:59:59Z', type: 'monthly' },
            { id: 'dl-002', period: '2026-02', dueDate: '2026-03-05T23:59:59Z', type: 'monthly' },
          ];
        }
        // Default response
        else {
          response = { success: true, path, method };
        }

        if (status !== 200) {
          const err = new Error(response?.message || `API Error ${status}`);
          err.status = status;
          reject(err);
        } else {
          resolve(response);
        }
      } catch (e) {
        reject(e);
      }
    }, 100 + Math.random() * 200); // 100-300ms delay
  });
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

function getAccessToken() {
  try {
    return localStorage.getItem('accessToken')
  } catch {
    return null
  }
}

function getRefreshToken() {
  try {
    return localStorage.getItem('refreshToken')
  } catch {
    return null
  }
}

function setMockUserEmail(email) {
  try {
    if (email) {
      localStorage.setItem('mockUserEmail', email)
    } else {
      localStorage.removeItem('mockUserEmail')
    }
  } catch {
    // Ignore localStorage issues
  }
}

function getMockUserEmail() {
  try {
    return localStorage.getItem('mockUserEmail')
  } catch {
    return null
  }
}

function buildUrl(path, params = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${BASE_URL}${normalizedPath}`)

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })

  return url.toString()
}

// =============================================================================
// FILE DOWNLOAD HELPERS
// =============================================================================

/**
 * Download a file as blob and trigger browser download
 */
async function downloadBlob(endpoint, defaultFileName) {
  const url = buildUrl(endpoint)
  const token = getAccessToken()

  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    let errorMessage = `Download failed with status ${response.status}`
    try {
      const data = await response.json()
      errorMessage = data.message || errorMessage
    } catch {
      const text = await response.text()
      if (text) errorMessage = text
    }
    const err = new Error(errorMessage)
    err.status = response.status
    throw err
  }

  const blob = await response.blob()

  // Parse filename from content-disposition header
  let fileName = defaultFileName
  const disposition = response.headers.get('content-disposition')
  if (disposition) {
    // Try UTF-8 filename first
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match && utf8Match[1]) {
      fileName = decodeURIComponent(utf8Match[1])
    } else {
      // Fall back to regular filename
      const asciiMatch = disposition.match(/filename="?([^";]+)"?/i)
      if (asciiMatch && asciiMatch[1]) {
        fileName = asciiMatch[1]
      }
    }
  }

  // Create download link
  const objectUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(objectUrl)
  document.body.removeChild(a)
}

/**
 * Download file as bytes (for PDF preview)
 */
async function downloadBytes(endpoint) {
  const url = buildUrl(endpoint)
  const token = getAccessToken()

  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    let errorMessage = `Download failed with status ${response.status}`
    try {
      const data = await response.json()
      errorMessage = data.message || errorMessage
    } catch {
      const text = await response.text()
      if (text) errorMessage = text
    }
    const err = new Error(errorMessage)
    err.status = response.status
    throw err
  }

  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

// =============================================================================
// CORE REQUEST HANDLER
// =============================================================================

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    params,
    isFormData = false,
  } = options

  const finalHeaders = new Headers(headers)
  const token = getAccessToken()

  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  if (!isFormData && !(body instanceof FormData) && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      headers: finalHeaders,
      body:
        body === undefined || body === null
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    })

    // Handle empty responses
    const text = await response.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!response.ok) {
      let message = ''
      if (data && typeof data === 'object') {
        message = data.message || data.error || data.detail || JSON.stringify(data)
      } else {
        message = text || `API ${response.status}`
      }

      // Create error with status for handling in components
      const err = new Error(message)
      err.status = response.status
      throw err
    }

    return data
  } catch (err) {
    // If network error and mock mode is enabled, use mock data
    if (USE_MOCK && (err.name === 'TypeError' || err.message.includes('fetch'))) {
      console.warn(`[Mock API] Falling back to mock for: ${method} ${path}`);
      return mockRequest(path, options);
    }
    throw err;
  }
}

// =============================================================================
// API EXPORTS
// =============================================================================

export const api = {
  baseURL: BASE_URL,

  // ---------------------------------------------------------------------------
  // Token Management
  // ---------------------------------------------------------------------------
  setToken(token) {
    try {
      if (token) {
        localStorage.setItem('accessToken', token)
      } else {
        localStorage.removeItem('accessToken')
      }
    } catch {
      // Ignore localStorage issues
    }
  },

  setRefreshToken(token) {
    try {
      if (token) {
        localStorage.setItem('refreshToken', token)
      } else {
        localStorage.removeItem('refreshToken')
      }
    } catch {
      // Ignore localStorage issues
    }
  },

  clearTokens() {
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('mockUserEmail')
    } catch {
      // Ignore localStorage issues
    }
  },

  getAccessToken,
  getRefreshToken,
  setMockUserEmail,
  getMockUserEmail,

  // ---------------------------------------------------------------------------
  // File Download Helpers
  // ---------------------------------------------------------------------------
  downloadBlob,
  downloadBytes,

  // ---------------------------------------------------------------------------
  // HTTP Methods
  // ---------------------------------------------------------------------------
  get: (path, params) => request(path, { method: 'GET', params }),
  post: (path, body, params) => request(path, { method: 'POST', body, params }),
  put: (path, body, params) => request(path, { method: 'PUT', body, params }),
  patch: (path, body, params) => request(path, { method: 'PATCH', body, params }),
  delete: (path, params) => request(path, { method: 'DELETE', params }),
  upload: (path, formData, params) =>
    request(path, {
      method: 'POST',
      body: formData,
      params,
      isFormData: true,
    }),

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  auth: {
    // Google OAuth login
    google: (credential) => api.post('/api/auth/google', { credential }),
    // Dev login bypass
    // devLogin: (email) => api.post('/api/auth/dev-login', { email }),
    devLogin: (email) => api.post('/api/auth/dev-login', { email }),
    logout: (refreshToken) => api.post('/api/auth/logout', { refreshToken }),
    refresh: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
    // Get current user info
    me: () => api.get('/api/v1/me'),
    adminMe: () => api.get('/api/v1/admin/me'),
    ctsvMe: () => api.get('/api/v1/student-affairs/me'),
  },

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  users: {
    list: (params) => api.get('/api/users', params),
    getById: (id) => api.get(`/api/users/${id}`),
    me: () => api.get('/api/users/me'),
    create: (payload) => api.post('/api/users', payload),
    update: (id, payload) => api.put(`/api/users/${id}`, payload),
    delete: (id) => api.delete(`/api/users/${id}`),
    lock: (id) => api.patch(`/api/users/${id}/lock`),
    unlock: (id) => api.patch(`/api/users/${id}/unlock`),
    roles: () => api.get('/api/roles'),
    createRole: (name) => api.post('/api/roles', { name }),
    assignRole: (userId, roleId) => api.post(`/api/users/${userId}/roles`, { roleId }),
    removeRole: (userId, roleId) => api.delete(`/api/users/${userId}/roles/${roleId}`),
  },

  // ---------------------------------------------------------------------------
  // Clubs
  // ---------------------------------------------------------------------------
  clubs: {
    // List
    list: (params) => api.get('/api/clubs', params),
    getById: (id) => api.get(`/api/clubs/${id}`),
    myMemberships: () => api.get('/api/clubs/me/memberships'),
    myManaged: () => api.get('/api/clubs/me/managed'),
    myAccess: () => api.get('/api/clubs/me/access'),
    create: (payload) => api.post('/api/clubs', payload),
    update: (id, payload) => api.put(`/api/clubs/${id}`, payload),
    delete: (id) => api.delete(`/api/clubs/${id}`),
    join: (clubId, payload) => api.post(`/api/clubs/${clubId}/join`, payload),

    members: {
      list: (clubId, params) => api.get(`/api/clubs/${clubId}/members`, params),
      get: (clubId, memberId, params) => api.get(`/api/clubs/${clubId}/members/${memberId}`, params),
      add: (clubId, payload) => api.post(`/api/clubs/${clubId}/members`, payload),
      update: (clubId, memberId, payload) => api.put(`/api/clubs/${clubId}/members/${memberId}`, payload),
      remove: (clubId, memberId) => api.delete(`/api/clubs/${clubId}/members/${memberId}`),
      getMemberships: (clubId) => api.get(`/api/clubs/${clubId}/memberships`),
      approveMembership: (membershipId, note) =>
        api.post(`/api/clubs/memberships/${membershipId}/approve`, { note }),
      rejectMembership: (membershipId, note) =>
        api.post(`/api/clubs/memberships/${membershipId}/reject`, { note }),
      assignTreasurer: (clubId, memberUserId, memberName) =>
        api.post(`/api/clubs/${clubId}/treasurers`, { memberUserId, memberName }),
    },

    applications: {
      submit: (payload) => api.post('/api/clubs/applications', payload),
      list: (params) => api.get('/api/clubs/applications', params),
      myApplications: () => api.get('/api/clubs/applications/me'),
      getById: (id) => api.get(`/api/clubs/applications/${id}`),
      update: (id, payload) => api.put(`/api/clubs/applications/${id}`, payload),
      approve: (id, payload) => api.post(`/api/clubs/applications/${id}/approve`, payload),
      requestRevision: (id, review) =>
        api.post(`/api/clubs/applications/${id}/request-revision`, review),
      reject: (id, payload) => api.post(`/api/clubs/applications/${id}/reject`, payload),
    },

    disbandRequests: {
      list: (params) => api.get('/api/clubs/disband-requests', params),
      approve: (id) => api.post(`/api/clubs/disband-requests/${id}/approve`),
      reject: (id) => api.post(`/api/clubs/disband-requests/${id}/reject`),
    },

    transferRequests: {
      list: (params) => api.get('/api/clubs/transfer-requests', params),
      approve: (id) => api.post(`/api/clubs/transfer-requests/${id}/approve`),
      reject: (id) => api.post(`/api/clubs/transfer-requests/${id}/reject`),
    },
  },

  // ---------------------------------------------------------------------------
  // Activities
  // ---------------------------------------------------------------------------
  activities: {
    list: (params) => api.get('/api/activities', params),
    getById: (id) => api.get(`/api/activities/${id}`),
    create: (payload) => api.post('/api/activities', payload),
    update: (id, payload) => api.put(`/api/activities/${id}`, payload),
    delete: (id) => api.delete(`/api/activities/${id}`),
    checkIn: (id) => api.post(`/api/activities/${id}/check-in`),
    registerParticipant: (id, userId, fullName) =>
      api.post(`/api/activities/${id}/participants`, { userId, fullName }),
    complete: (id) => api.patch(`/api/activities/${id}/complete`),
    myAttendance: (id, params) => api.get(`/api/activities/${id}/my-attendance`, params),

    attendance: {
      get: (clubId, activityId, params) =>
        api.get(`/api/clubs/${clubId}/activities/${activityId}/attendance`, params),
      markOne: (clubId, activityId, memberId, payload) =>
        api.put(`/api/clubs/${clubId}/activities/${activityId}/attendance/${memberId}`, payload),
      markBulk: (clubId, activityId, payload) =>
        api.put(`/api/clubs/${clubId}/activities/${activityId}/attendance`, payload),
    },
  },

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------
  reports: {
    list: (params) => api.get('/api/reports', params),
    summary: () => api.get('/api/reports/summary'),
    aggregate: (params) => api.get('/api/reports/aggregate', params),
    getById: (id) => api.get(`/api/reports/${id}`),
    create: (payload) => api.post('/api/reports', payload),
    update: (id, payload) => api.put(`/api/reports/${id}`, payload),
    delete: (id) => api.delete(`/api/reports/${id}`),
    submit: (id) => api.post(`/api/reports/${id}/submit`),
    review: (id, payload) => api.post(`/api/reports/${id}/review`, payload),
    approve: (id, payload) => api.post(`/api/reports/${id}/approve`, payload),
    reject: (id, payload) => api.post(`/api/reports/${id}/reject`, payload),
    upload: (payload) => api.upload('/api/reports/upload', payload),

    // Reporting deadlines
    deadlines: () => api.get('/api/reporting-deadlines'),

    file: {
      getInfo: (id) => api.get(`/api/reports/${id}/file`),
      download: (id) => downloadBlob(`/api/reports/${id}/file/download`, `report-${id}`),
      preview: (id) => downloadBytes(`/api/reports/${id}/file/preview`),
      update: (id, formData) => api.upload(`/api/reports/${id}/file`, formData),
      replace: (id, formData) => api.upload(`/api/reports/${id}/file`, formData),
      remove: (id) => api.delete(`/api/reports/${id}/file`),
    },

    attachments: {
      upload: (id, formData) => api.upload(`/api/reports/${id}/attachments/upload`, formData),
      download: (reportId, attachmentId) =>
        downloadBlob(`/api/reports/${reportId}/attachments/${attachmentId}/download`, `attachment-${attachmentId}`),
      remove: (reportId, attachmentId) =>
        api.delete(`/api/reports/${reportId}/attachments/${attachmentId}`),
    },
  },

  // ---------------------------------------------------------------------------
  // KPI
  // ---------------------------------------------------------------------------
  kpis: {
    leaderboard: (params) => api.get('/api/kpis/leaderboard', params),
    rules: () => api.get('/api/kpis/rules'),
  },

  // ---------------------------------------------------------------------------
  // Deadlines
  // ---------------------------------------------------------------------------
  deadlines: {
    list: () => api.get('/api/deadlines'),
    getByPeriod: (period) => api.get(`/api/deadlines/${period}`),
    myDeadlines: () => api.get('/api/deadlines/me'),
    create: (payload) => api.post('/api/deadlines', payload),
    update: (period, payload) => api.put(`/api/deadlines/${period}`, payload),
    delete: (period) => api.delete(`/api/deadlines/${period}`),
  },

  // ---------------------------------------------------------------------------
  // Finance
  // ---------------------------------------------------------------------------
  finance: {
    proposals: {
      list: (params) => api.get('/api/finance/proposals', params),
      getById: (id) => api.get(`/api/finance/proposals/${id}`),
      create: (payload) => api.post('/api/finance/proposals', payload),
      submit: (id) => api.post(`/api/finance/proposals/${id}/submit`),
      managerReview: (id, payload) => api.post(`/api/finance/proposals/${id}/manager-review`, payload),
      managerApprove: (id, note) => api.post(`/api/finance/proposals/${id}/manager-approve`, { note }),
      managerReject: (id, note) => api.post(`/api/finance/proposals/${id}/manager-reject`, { note }),
      review: (id, payload) => api.post(`/api/finance/proposals/${id}/review`, payload),
      approve: (id, amount, note) => api.post(`/api/finance/proposals/${id}/approve`, { amount, note }),
      reject: (id, note) => api.post(`/api/finance/proposals/${id}/reject`, { note }),
    },

    settlements: {
      list: (params) => api.get('/api/finance/settlements', params),
      getById: (id) => api.get(`/api/finance/settlements/${id}`),
      create: (proposalId, payload) =>
        api.post(`/api/finance/proposals/${proposalId}/settlements`, payload),
      submit: (id) => api.post(`/api/finance/settlements/${id}/submit`),
      review: (id, payload) => api.post(`/api/finance/settlements/${id}/review`, payload),
      approve: (id, note) => api.post(`/api/finance/settlements/${id}/approve`, { note }),
      reject: (id, note) => api.post(`/api/finance/settlements/${id}/reject`, { note }),
    },

    transactions: {
      list: (params) => api.get('/api/finance/transactions', params),
      create: (payload) => api.post('/api/finance/transactions', payload),
    },
  },

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  notifications: {
    list: (params) => api.get('/api/notifications', params),
    getById: (id) => api.get(`/api/notifications/${id}`),
    markRead: (id) => api.put(`/api/notifications/${id}/read`),
    markAllRead: () => api.put('/api/notifications/read-all'),
  },

  // ---------------------------------------------------------------------------
  // Exports
  // ---------------------------------------------------------------------------
  exports: {
    list: (params) => api.get('/api/exports', params),
    getById: (id) => api.get(`/api/exports/${id}`),
    create: (payload) => api.post('/api/exports', payload),
    download: (id) => downloadBlob(`/api/exports/${id}/download`, `export-${id}`),
  },

  // ---------------------------------------------------------------------------
  // System Health
  // ---------------------------------------------------------------------------
  health: {
    root: () => api.get('/'),
    check: () => api.get('/health'),
  },
}

export default api
