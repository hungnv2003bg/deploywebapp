import axios from "../plugins/axios";

// Lấy syslog với các filter và pagination
export const fetchSyslogs = async (filters = {}, page = 0, size = 10) => {
  const params = {
    page,
    size,
  };

  if (filters.severity && filters.severity !== "All") {
    params.severity = filters.severity;
  }

  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.factoryName && filters.factoryName.trim()) {
    params.factoryName = filters.factoryName.trim();
  }

  if (filters.deviceId !== undefined && filters.deviceId !== null) {
    params.deviceId = filters.deviceId;
  }

  if (filters.status !== undefined && filters.status !== null) {
    params.status = filters.status;
  }

  if (filters.startDate) {
    params.startDate = filters.startDate;
  }

  if (filters.endDate) {
    params.endDate = filters.endDate;
  }

  const res = await axios.get("/api/syslogs", { params });
  // Trả về Page object từ backend
  return res.data || { content: [], totalElements: 0, totalPages: 0 };
};

// Lấy counts theo severity (không cần load toàn bộ data)
// Backend sẽ tự động filter theo visibleSeverities và trả về cả danh sách visibleSeverities
export const fetchSyslogCounts = async (filters = {}) => {
  const params = {};

  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim();
  }

  if (filters.factoryName && filters.factoryName.trim()) {
    params.factoryName = filters.factoryName.trim();
  }

  if (filters.deviceId !== undefined && filters.deviceId !== null) {
    params.deviceId = filters.deviceId;
  }

  if (filters.status !== undefined && filters.status !== null) {
    params.status = filters.status;
  }

  if (filters.startDate) {
    params.startDate = filters.startDate;
  }

  if (filters.endDate) {
    params.endDate = filters.endDate;
  }

  const res = await axios.get("/api/syslogs/counts", { params });
  // Backend trả về { visibleSeverities: [...], counts: {...} }
  return res.data || { visibleSeverities: [], counts: {} };
};

// Thống kê syslogs cần xử lý từ bảng syslogs (những syslog có action_taken, collaborator, etc.)
// Backend đã xử lý sẵn tất cả logic tính toán, frontend chỉ cần nhận và hiển thị
export const fetchSyslogsStatistics = async ({ area = "ALL", from, to } = {}) => {
  try {
    const res = await axios.get("/api/syslogs/statistics", {
      params: { area, from, to },
    });
    // Backend đã trả về: [{ severity, total, byArea }, ...] đã được sắp xếp
    return res.data || [];
  } catch (error) {
    console.error("Error fetching syslogs statistics:", error);
    // Trả về danh sách rỗng với tất cả severity levels
    const order = [
      "Emergency",
      "Alert",
      "Critical",
      "Error",
      "Warning",
      "Notice",
      "Info",
      "Debug",
    ];
    return order.map((severity) => ({
      severity,
      total: 0,
      byArea: {},
    }));
  }
};

// Thống kê syslog theo severity từ main backend (port 8080)
// Backend đã xử lý sẵn tất cả logic tính toán, frontend chỉ cần nhận và hiển thị
export const fetchSyslogSeverityTotals = async ({ area = "ALL", from, to, rangeKey } = {}) => {
  try {
    // Gọi API mới trong main backend: /api/syslog-statistics/statistic/bulk/processed
    // Backend trả về dữ liệu đã được xử lý sẵn với total và sắp xếp theo thứ tự
    const res = await axios.get(`/api/syslog-statistics/statistic/bulk/processed`, {
      params: { area, from, to },
      timeout: 10000, // 10 giây timeout
    });

    // Backend đã trả về: [{ severity, total, byArea }, ...] đã được sắp xếp
    // Frontend chỉ cần trả về trực tiếp, không cần tính toán gì thêm
    return res.data || [];
  } catch (error) {
    const message = (error && error.message) || "";
    const code = error && error.code;
    const networkDown = code === "ERR_NETWORK" || /ECONNREFUSED|Network Error/i.test(message);

    if (networkDown) {
      // Fallback về endpoint counts của main backend
      const res = await axios.get("/api/syslogs/counts", {
        params: {
          range: rangeKey,
          startDate: from,
          endDate: to,
          factoryName: area && area !== "ALL" ? area : undefined,
        },
      });
      const payload = res.data || { visibleSeverities: [], counts: {} };
      const order = payload.visibleSeverities && payload.visibleSeverities.length > 0
        ? payload.visibleSeverities
        : [
          "Emergency",
          "Alert",
          "Critical",
          "Error",
          "Warning",
          "Notice",
          "Info",
          "Debug",
        ];
      return order.map((severity) => {
        const total = Number(payload.counts?.[severity] || 0);
        return { severity, total, byArea: {} };
      });
    }

    // Nếu không phải network error, trả về empty data
    console.error("Error fetching syslog severity totals:", error);
    const order = [
      "Emergency",
      "Alert",
      "Critical",
      "Error",
      "Warning",
      "Notice",
      "Info",
      "Debug",
    ];
    return order.map((severity) => ({
      severity,
      total: 0,
      byArea: {},
    }));
  }
};

export const fetchSyslogFactories = async () => {
  const res = await axios.get("/api/syslogs/factories");
  const names = Array.isArray(res.data) ? res.data : [];
  return names.map((name) => ({
    value: name,
    label: name,
  }));
};

// Lấy danh sách thiết bị (Switch, Firewall...)
export const fetchSyslogDevices = async () => {
  const res = await axios.get("/api/syslogs/devices");
  const list = Array.isArray(res.data) ? res.data : [];
  return list.map((item) => ({
    value: item.id,
    label: item.deviceName,
  }));
};


