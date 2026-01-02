const API_CONFIG = {
  BACKEND_URL: (() => {
    if (process.env.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
    // Luôn sử dụng port 8080 cho backend, bất kể frontend chạy trên port nào
    const { hostname } = window.location;
    return `http://${hostname}:8080`;
  })(),
  ENDPOINTS: {
    UPLOAD: '/api/upload',
    DOWNLOAD: '/api/upload/file',
    IMPROVEMENT_UPLOAD: '/api/improvement-upload',
    IMPROVEMENT_DOWNLOAD: '/api/improvement-upload/file',
    SYSLOG_UPLOAD: '/api/syslog-upload',
    SOPS: '/api/sops',
    SOP_DOCUMENTS: '/api/sop-documents',
    CHECKLISTS: '/api/checklists',
    IMPROVEMENTS: '/api/improvements',
    USERS: '/api/users',
    AUTH: '/api/auth',
    PERSONAL_NOTES: '/api/personal-notes'
  },
  getUploadUrl: () => `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.UPLOAD}`,
  getDownloadUrl: (filePath) => `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.DOWNLOAD}/${encodeURIComponent(filePath)}`,
  getImprovementUploadUrl: () => `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.IMPROVEMENT_UPLOAD}`,
  getImprovementDownloadUrl: (filePath) => `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.IMPROVEMENT_DOWNLOAD}/${encodeURIComponent(filePath)}`,
  getSyslogUploadUrl: () => `${API_CONFIG.BACKEND_URL}${API_CONFIG.ENDPOINTS.SYSLOG_UPLOAD}`,
  getApiUrl: (endpoint) => `${API_CONFIG.BACKEND_URL}${endpoint}`,
  TIMEOUT: 100000
};

export default API_CONFIG;

