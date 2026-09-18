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
    } catch {
      // Ignore localStorage issues
    }
  },

  getAccessToken,
  getRefreshToken,

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
