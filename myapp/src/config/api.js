const API_CONFIG = {
  BACKEND_URL: (() => {
    if (process.env.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
    // Sử dụng đường dẫn tương đối (relative path)
    // - Ở môi trường Web (Production): Nginx sẽ tự điều hướng /api sang Backend (chạy nội bộ port 8080)
    // - Ở môi trường Dev (Localhost): React Proxy (trong package.json) sẽ chuyển hướng sang localhost:8080
    return '';
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

