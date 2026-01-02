import axios from "../plugins/axios";

// Lấy firewall syslogs với các filter và pagination từ main backend (port 8080)
export const fetchFirewallSyslogs = async (filters = {}, page = 0, size = 20) => {
  const params = {
    page,
    size,
  };

  if (filters.severity && filters.severity.trim()) {
    params.severity = filters.severity.trim();
  }

  if (filters.hostname && filters.hostname.trim()) {
    params.hostname = filters.hostname.trim();
  }

  if (filters.logText && filters.logText.trim()) {
    params.logText = filters.logText.trim();
  }

  if (filters.fromDate) {
    params.fromDate = filters.fromDate;
  }

  if (filters.toDate) {
    params.toDate = filters.toDate;
  }

  // Gọi endpoint mới trong main backend
  const res = await axios.get(`/api/firewall/syslogs`, { params });
  // Trả về Page object từ backend
  return res.data || { content: [], totalElements: 0, totalPages: 0 };
};


