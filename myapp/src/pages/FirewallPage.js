import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Spin,
  Alert,
  Input,
  Select,
  DatePicker,
  Space,
  Button,
} from "antd";
import { SearchOutlined, SecurityScanOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import { fetchFirewallSyslogs } from "../services/firewallService";
import { formatDateShortVN } from "../utils/dateUtils";
import { useLanguage } from "../contexts/LanguageContext";

dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

const { RangePicker } = DatePicker;

const severityList = [
  "Emergency",
  "Alert",
  "Critical",
  "Error",
  "Warning",
  "Notice",
  "Info",
  "Debug",
];

const labels = {
  vi: {
    pageTitle: "Firewall",
    loadError: "Không thể tải dữ liệu Firewall",
    severity: "Cấp độ",
    hostname: "Hostname",
    log: "Log",
    facility: "Facility",
    createdDate: "Ngày tạo",
    dateReport: "Ngày báo cáo",
    searchPlaceholder: "Tìm kiếm theo hostname...",
    datePlaceholder: ["Từ ngày", "Đến ngày"],
    filterSeverity: "Lọc theo cấp độ",
    clearFilters: "Xóa bộ lọc",
  },
  zh: {
    pageTitle: "防火墙",
    loadError: "无法加载防火墙数据",
    severity: "级别",
    hostname: "主机名",
    log: "日志",
    facility: "设施",
    createdDate: "创建日期",
    dateReport: "报告日期",
    searchPlaceholder: "按主机名搜索...",
    datePlaceholder: ["开始日期", "结束日期"],
    filterSeverity: "按级别筛选",
    clearFilters: "清除筛选",
  },
};

export default function FirewallPage() {
  const { lang } = useLanguage();
  const t = labels[lang] || labels.vi;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allData, setAllData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [severityFilter, setSeverityFilter] = useState(undefined);

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadData = useCallback(
    async (page = 0, pageSize = 20) => {
      setLoading(true);
      setError("");
      try {
        const trimmedSearch =
          debouncedSearchText && debouncedSearchText.trim()
            ? debouncedSearchText.trim()
            : undefined;

        const filters = {
          severity: severityFilter,
          hostname: trimmedSearch,
          fromDate:
            dateRange && dateRange[0]
              ? dateRange[0].tz('Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DDTHH:mm:ss')
              : undefined,
          toDate:
            dateRange && dateRange[1]
              ? dateRange[1].tz('Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DDTHH:mm:ss')
              : undefined,
        };

        const pageData = await fetchFirewallSyslogs(filters, page, pageSize);

        setAllData(Array.isArray(pageData.content) ? pageData.content : []);

        setPagination((prev) => ({
          ...prev,
          total: pageData.totalElements || 0,
          current: page + 1,
          pageSize: pageSize,
        }));
      } catch (err) {
        setError(err?.message || t.loadError);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearchText, dateRange, severityFilter, t.loadError]
  );

  useEffect(() => {
    loadData(0, 20);
  }, []);

  useEffect(() => {
    const pageSize = pagination.pageSize || 20;
    setPagination((prev) => ({ ...prev, current: 1, total: 0 }));
    loadData(0, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchText, dateRange, severityFilter]);

  const handlePaginationChange = useCallback(
    (page, pageSize) => {
      setPagination((prev) => {
        const total = prev.total || 0;
        const size = pageSize || prev.pageSize || 20;
        const maxPage = Math.max(1, Math.ceil(total / size));
        const safePage = Math.min(Math.max(page, 1), maxPage);
        loadData(safePage - 1, size);
        return { ...prev, current: safePage, pageSize: size };
      });
    },
    [loadData]
  );

  const handleClearFilters = () => {
    setSearchText("");
    setDateRange([]);
    setSeverityFilter(undefined);
  };

  const columns = [
    {
      title: "STT",
      width: 80,
      align: "center",
      render: (_, __, index) => {
        const currentPage = pagination?.current || 1;
        const pageSize = pagination?.pageSize || 20;
        return <Tag color="blue">{(currentPage - 1) * pageSize + index + 1}</Tag>;
      },
    },
    {
      title: t.createdDate,
      dataIndex: "createdDate",
      width: 180,
      render: (val) => formatDateShortVN(val),
      sorter: (a, b) => dayjs(a.createdDate).valueOf() - dayjs(b.createdDate).valueOf(),
    },
    {
      title: t.facility,
      dataIndex: "facility",
      width: 120,
      render: (text) => text || "-",
    },
    {
      title: t.severity,
      dataIndex: "severity",
      width: 120,
      render: (sev) => (
        <Tag color="default" style={{ background: "#f5f5f5", borderColor: "#d9d9d9", color: "#000" }}>
          {sev}
        </Tag>
      ),
    },
    { title: t.hostname, dataIndex: "hostname", width: 140 },
    {
      title: t.log,
      dataIndex: "logText",
      width: 500,
      render: (text) => (
        <div
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            wordBreak: "break-word",
            maxWidth: "500px",
            lineHeight: "1.5",
          }}
        >
          {text || "-"}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            display: "inline-flex",
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            background: "#fff1f0",
            color: "#f5222d",
            borderRadius: 8,
          }}
        >
          <SecurityScanOutlined />
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginLeft: 8 }}>
          {t.pageTitle}
        </h2>
      </div>

      {/* Filters */}
      <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }} size="middle">
        <Space wrap>
          <Input
            placeholder={t.searchPlaceholder}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />

          <Select
            placeholder={t.filterSeverity}
            value={severityFilter}
            onChange={setSeverityFilter}
            allowClear
            style={{ width: 200 }}
          >
            {severityList.map((sev) => (
              <Select.Option key={sev} value={sev}>
                {sev}
              </Select.Option>
            ))}
          </Select>

          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            placeholder={t.datePlaceholder}
          />

          <Button onClick={handleClearFilters}>{t.clearFilters}</Button>
        </Space>
      </Space>

      {error && (
        <Alert
          message={t.loadError}
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError("")}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={allData}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total}`,
          pageSizeOptions: ["10", "20", "50", "100"],
          onChange: handlePaginationChange,
          onShowSizeChange: handlePaginationChange,
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
}

