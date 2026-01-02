import axios from "../plugins/axios";

const BASE = "/api/syslog-settings";

export const syslogSettingsService = {
  async getVisibleSeverities() {
    const res = await axios.get(`${BASE}/visible-severities`);
    return res.data;
  },
  async updateVisibleSeverities(severities) {
    const res = await axios.post(`${BASE}/visible-severities`, { severities });
    return res.data;
  },
};

export default syslogSettingsService;

