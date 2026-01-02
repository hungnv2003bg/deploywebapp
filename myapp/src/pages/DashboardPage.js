import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  List,
  Avatar,
  Spin,
  Typography,
  Space,
  Select,
  DatePicker,
} from "antd";
import {
  FileTextOutlined,
  CheckSquareOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LabelList,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import API_CONFIG from "../config/api";
import { useLanguage } from "../contexts/LanguageContext";
import { fetchSyslogSeverityTotals, fetchSyslogsStatistics } from "../services/syslogService";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const isDev = process.env.NODE_ENV !== "production";

export default function DashboardPage() {
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSOPs: 0,
    totalChecklist: 0,
    totalImprovements: 0,
    completedImprovements: 0,
    categoryStats: {},
    recentSOPs: [],
    recentChecklist: [],
    topReviewers: [],
    checklistByDay: [],
    syslogSeverity: [],
    syslogsStatistics: [], // Thống kê syslogs cần xử lý
  });
  const [syslogRange, setSyslogRange] = useState("allTime");
  const [syslogArea, setSyslogArea] = useState("ALL");
  const [syslogLoading, setSyslogLoading] = useState(false);
  const [syslogInitialized, setSyslogInitialized] = useState(false);
  const [syslogCustomRange, setSyslogCustomRange] = useState(null); // dayjs[] | null
  const [syslogsStatsRange, setSyslogsStatsRange] = useState("allTime");
  const [syslogsStatsArea, setSyslogsStatsArea] = useState("ALL");
  const [syslogsStatsLoading, setSyslogsStatsLoading] = useState(false);
  const [syslogsStatsInitialized, setSyslogsStatsInitialized] = useState(false);
  const [syslogsStatsCustomRange, setSyslogsStatsCustomRange] = useState(null); // dayjs[] | null
  const [selectedSeverity, setSelectedSeverity] = useState(null); // Severity được chọn để xem chi tiết dạng Pie

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Load các API nhanh trước (không bao gồm syslog)
      const sopsPromise = fetch(API_CONFIG.getApiUrl(API_CONFIG.ENDPOINTS.SOPS)).then((r) => r.json());
      const docsPromise = fetch(API_CONFIG.getApiUrl(API_CONFIG.ENDPOINTS.SOP_DOCUMENTS)).then((r) => r.json());
      const checklistPromise = fetch(API_CONFIG.getApiUrl(API_CONFIG.ENDPOINTS.CHECKLISTS)).then((r) => r.json());

      const [sopsData, docsData, checklistData] = await Promise.all([
        sopsPromise,
        docsPromise,
        checklistPromise,
      ]);

      const sopsItems = Array.isArray(sopsData) ? sopsData : (sopsData?.content || []);
      const totalSOPs = Array.isArray(docsData) ? docsData.length : 0;
      const totalChecklist = checklistData?.length || 0;

      const improvements = checklistData?.filter(item => item.improvement?.trim()) || [];
      const completedImprovements = improvements.filter(item => item.status === 'Hoàn thành').length;

      const categoryStats = sopsItems?.reduce((acc, item) => {
        const category = item.category || 'general';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}) || {};


      const recentSOPs = sopsItems?.slice(-5).reverse() || [];

      const recentChecklist = checklistData?.slice(-5).reverse() || [];

      const reviewerCount = checklistData?.reduce((acc, item) => {
        const reviewer = item.reviewer;
        if (reviewer) {
          acc[reviewer] = (acc[reviewer] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const topReviewers = Object.entries(reviewerCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));


      setStats({
        totalSOPs,
        totalChecklist,
        totalImprovements: improvements.length,
        completedImprovements,
        categoryStats,
        recentSOPs,
        recentChecklist,
        topReviewers,
        checklistByDay: [],
        syslogSeverity: [], // Tạm thời để rỗng, sẽ load sau
      });

      // Load syslog sau khi các widget khác đã hiển thị (không chặn UI)
      fetchSyslogDataAsync().then(() => {
        setSyslogInitialized(true);
      });

      // Load thống kê syslogs cần xử lý
      fetchSyslogsStatsDataAsync().then(() => {
        setSyslogsStatsInitialized(true);
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load thống kê syslogs cần xử lý
  const fetchSyslogsStatsDataAsync = async () => {
    try {
      // Kiểm tra cache trước
      const cacheKey = getSyslogsStatsCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          // Cache hợp lệ trong 1 phút
          if (now - timestamp < 60 * 1000) {
            setStats(prev => ({ ...prev, syslogsStatistics: data }));
            setSyslogsStatsLoading(false);
            setSyslogsStatsInitialized(true);
            return;
          }
        } catch (e) {
          // Cache không hợp lệ, tiếp tục fetch
        }
      }

      setSyslogsStatsLoading(true);

      let from;
      let to;
      if (syslogsStatsCustomRange && syslogsStatsCustomRange.length === 2) {
        from = syslogsStatsCustomRange[0]
          ? syslogsStatsCustomRange[0].tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DDTHH:mm:ss")
          : undefined;
        to = syslogsStatsCustomRange[1]
          ? syslogsStatsCustomRange[1].tz("Asia/Ho_Chi_Minh").endOf("day").format("YYYY-MM-DDTHH:mm:ss")
          : undefined;
      } else {
        const range = getRange(syslogsStatsRange);
        from = range.from;
        to = range.to;
      }

      const syslogsStats = await fetchSyslogsStatistics({ from, to, area: syslogsStatsArea });

      // Lưu vào cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: syslogsStats,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore cache errors
      }

      setStats(prev => ({ ...prev, syslogsStatistics: syslogsStats }));
      setSyslogsStatsInitialized(true);
    } catch (error) {
      if (isDev) {
        console.error('Error fetching syslogs statistics:', error);
      }
      // Nếu có cache cũ, dùng nó
      const cacheKey = getSyslogsStatsCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          setStats(prev => ({ ...prev, syslogsStatistics: data }));
          setSyslogsStatsInitialized(true);
        } catch (e) {
          // Ignore
        }
      }
    } finally {
      setSyslogsStatsLoading(false);
    }
  };

  // Load syslog data riêng, không chặn các widget khác
  const fetchSyslogDataAsync = async () => {
    try {
      // Kiểm tra cache trước
      const cacheKey = getSyslogCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const now = Date.now();
          // Cache hợp lệ trong 1 phút
          if (now - timestamp < 60 * 1000) {
            setStats(prev => ({ ...prev, syslogSeverity: data }));
            setSyslogLoading(false);
            setSyslogInitialized(true);
            return;
          }
        } catch (e) {
          // Cache không hợp lệ, tiếp tục fetch
        }
      }

      setSyslogLoading(true);

      let from;
      let to;
      if (syslogCustomRange && syslogCustomRange.length === 2) {
        from = syslogCustomRange[0]
          ? syslogCustomRange[0].tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DDTHH:mm:ss")
          : undefined;
        to = syslogCustomRange[1]
          ? syslogCustomRange[1].tz("Asia/Ho_Chi_Minh").endOf("day").format("YYYY-MM-DDTHH:mm:ss")
          : undefined;
      } else {
        const range = getRange(syslogRange);
        from = range.from;
        to = range.to;
      }

      // Thêm timeout wrapper để tránh treo quá lâu
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000)
      );

      const syslogSeverity = await Promise.race([
        fetchSyslogSeverityTotals({ from, to, area: syslogArea, rangeKey: syslogRange }),
        timeoutPromise
      ]);

      // Lưu vào cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: syslogSeverity,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Ignore cache errors
      }

      setStats(prev => ({ ...prev, syslogSeverity }));
      setSyslogInitialized(true);
    } catch (error) {
      if (isDev) {
        console.error('Error fetching syslog data:', error);
      }
      // Nếu có cache cũ, dùng nó
      const cacheKey = getSyslogCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data } = JSON.parse(cached);
          setStats(prev => ({ ...prev, syslogSeverity: data }));
          setSyslogInitialized(true);
        } catch (e) {
          // Ignore
        }
      }
    } finally {
      setSyslogLoading(false);
    }
  };

  const i18n = {
    vi: {
      totalSOPs: "Tổng SOPs",
      totalChecklist: "Tổng Checklist",
      improvements: "Cải thiện",
      completed: "Hoàn thành",
      syslogSeverity: "Biểu đồ thống kê syslog từ Switch",
      syslogsStatistics: "Biểu đồ thống kê syslogs",
      syslogRangeLabel: "Thời gian",
      syslogAreaLabel: "Khu vực",
      ranges: {
        allTime: "Tất cả thời gian",
        thisWeek: "Tuần này",
        lastWeek: "Tuần trước",
        thisMonth: "Tháng này",
        lastMonth: "Tháng trước",
        thisYear: "Năm nay",
        lastYear: "Năm trước",
        last7Days: "7 ngày vừa qua",
        today: "Hôm nay",
      },
      topReviewers: "Top Người kiểm tra",
      sopByCategory: "Số lượng SOP theo mục",
      latestChecklist: "Checklist mới nhất",
      files: "files",
      done: "Hoàn thành",
      day: (label) => `Ngày: ${label}`,
      type: (label) => `Loại: ${label}`,
      sopLabel: "SOPs",
      workCount: (n) => `${n} công việc`,
      top: (n) => `TOP ${n}`,
      categories: { win: "Cài Win", network: "Cài Network", software: "Cài phần mềm", general: "Tổng quát" },
      table: { name: "Tên SOP", creator: "Người tạo", type: "Loại" },
      checklistCols: { task: "Công việc", reviewer: "Người kiểm tra", doc: "Tài liệu", status: "Trạng thái" },
      statuses: { pending: 'Chưa thực hiện', doing: 'Đang thực hiện', done: 'Hoàn thành' }
    },
    zh: {
      totalSOPs: "SOP 总数",
      totalChecklist: "事件管理总数",
      improvements: "問題管理",
      completed: "完成",
      syslogSeverity: "按8级别统计 Syslog",
      syslogsStatistics: "Syslogs 统计图表",
      syslogRangeLabel: "时间范围",
      syslogAreaLabel: "区域",
      ranges: {
        allTime: "全部时间",
        thisWeek: "本周",
        lastWeek: "上周",
        thisMonth: "本月",
        lastMonth: "上月",
        thisYear: "今年",
        lastYear: "去年",
        last7Days: "过去7天",
        today: "今天",
      },
      topReviewers: "Top 检查员",
      sopByCategory: "各类别 SOP 数量",
      latestChecklist: "最新事件管理",
      files: "文件",
      done: "完成",
      day: (label) => `日期：${label}`,
      type: (label) => `类别：${label}`,
      sopLabel: "SOPs",
      workCount: (n) => `${n} 项工作`,
      top: (n) => `TOP ${n}`,
      categories: { win: "装系统", network: "网络配置", software: "软件安装", general: "通用" },
      table: { name: "SOP 名称", creator: "创建者", type: "类别" },
      checklistCols: { task: "工作", reviewer: "检查员", doc: "资料", status: "状态" },
      statuses: { pending: '未开始', doing: '进行中', done: '已完成' }
    }
  };
  const t = i18n[lang];

  const categoryMap = t.categories;

  const syslogRangeOptions = [
    "allTime",
    "today",
    "last7Days",
    "thisWeek",
    "lastWeek",
    "thisMonth",
    "lastMonth",
    "thisYear",
    "lastYear",
  ];

  const syslogAreaOptions = [
    { value: "ALL", label: "Tất cả" },
    { value: "VT1", label: "VT1" },
    { value: "VT2A", label: "VT2A" },
    { value: "VT2B", label: "VT2B" },
    { value: "VTC", label: "VTC" },
    { value: "DV", label: "DV" },
  ];

  const syslogsStatsAreaOptions = [
    { value: "ALL", label: lang === 'vi' ? 'Tất cả' : '全部' },
    { value: "VT1", label: "VT1" },
    { value: "VT2A", label: "VT2A" },
    { value: "VT2B", label: "VT2B" },
    { value: "VT2C", label: "VT2C" },
    { value: "DV", label: "DV" },
  ];

  const areaColors = {
    VT2A: "#07a7f1",
    VT2B: "#9b4f9c",
    VT2C: "#f57f17",
    VTC: "#f57f17",
    VT1: "#ff4d4f",
    DV: "#52c41a",
    ALL: "#FFD666",
  };

  const getRange = (key) => {
    const now = dayjs().tz("Asia/Ho_Chi_Minh");
    const mondayStart = (d) => {
      const wd = d.day() === 0 ? 7 : d.day(); // 1..7, Monday=1
      return d.subtract(wd - 1, "day").startOf("day");
    };
    const sundayEnd = (d) => mondayStart(d).add(6, "day").endOf("day");

    let from = null;
    let to = null;
    switch (key) {
      case "allTime":
        from = null;
        to = null;
        break;
      case "today":
        from = now.startOf("day");
        to = now.endOf("day");
        break;
      case "last7Days":
        to = now.endOf("day");
        from = now.subtract(6, "day").startOf("day");
        break;
      case "thisWeek":
        from = mondayStart(now);
        to = sundayEnd(now);
        break;
      case "lastWeek": {
        const lastWeekRef = now.subtract(7, "day");
        from = mondayStart(lastWeekRef);
        to = sundayEnd(lastWeekRef);
        break;
      }
      case "thisMonth":
        from = now.startOf("month");
        to = now.endOf("month");
        break;
      case "lastMonth": {
        const lastMonthRef = now.subtract(1, "month");
        from = lastMonthRef.startOf("month");
        to = lastMonthRef.endOf("month");
        break;
      }
      case "thisYear":
        from = now.startOf("year");
        to = now.endOf("year");
        break;
      case "lastYear":
        const lastYearRef = now.subtract(1, "year");
        from = lastYearRef.startOf("year");
        to = lastYearRef.endOf("year");
        break;
      default:
        from = null;
        to = null;
    }

    const toStr = (d) => (d ? d.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DDTHH:mm:ss") : undefined);
    return { from: toStr(from), to: toStr(to) };
  };

  // Tạo cache key cho syslog, có xét tới khoảng thời gian custom nếu có
  const getSyslogCacheKey = () => {
    if (syslogCustomRange && syslogCustomRange.length === 2) {
      const from = syslogCustomRange[0]
        ? syslogCustomRange[0].tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DDTHH:mm:ss")
        : "";
      const to = syslogCustomRange[1]
        ? syslogCustomRange[1].tz("Asia/Ho_Chi_Minh").endOf("day").format("YYYY-MM-DDTHH:mm:ss")
        : "";
      return `syslog_custom_${from}_${to}_${syslogArea}`;
    }
    return `syslog_${syslogRange}_${syslogArea}`;
  };

  // Tạo cache key cho syslogs statistics
  const getSyslogsStatsCacheKey = () => {
    if (syslogsStatsCustomRange && syslogsStatsCustomRange.length === 2) {
      const from = syslogsStatsCustomRange[0]
        ? syslogsStatsCustomRange[0].tz("Asia/Ho_Chi_Minh").startOf("day").format("YYYY-MM-DDTHH:mm:ss")
        : "";
      const to = syslogsStatsCustomRange[1]
        ? syslogsStatsCustomRange[1].tz("Asia/Ho_Chi_Minh").endOf("day").format("YYYY-MM-DDTHH:mm:ss")
        : "";
      return `syslogs_stats_custom_${from}_${to}_${syslogsStatsArea}`;
    }
    return `syslogs_stats_${syslogsStatsRange}_${syslogsStatsArea}`;
  };

  // Legend custom cho biểu đồ Syslog để cố định thứ tự: VT1, VT2A, VT2B, VTC, DV
  const renderSyslogLegend = () => {
    const order = ["VT1", "VT2A", "VT2B", "VTC", "DV"];
    return (
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 16,
          fontSize: 12,
        }}
      >
        {order.map((key) => (
          <li
            key={key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              margin: 0,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                backgroundColor: areaColors[key],
                marginRight: 6,
              }}
            />
            <span>{key}</span>
          </li>
        ))}
      </ul>
    );
  };

  const categoryColors = {
    win: "green",
    network: "blue",
    software: "purple",
    general: "default"
  };

  const sopColumns = [
    {
      title: t.table.name,
      dataIndex: "name",
      key: "name",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: t.table.creator,
      dataIndex: "creator",
      key: "creator",
      render: (text) => <Tag color="blue">{text || '-'}</Tag>
    },
    {
      title: t.table.type,
      dataIndex: "category",
      key: "category",
      render: (category) => (
        <Tag color={categoryColors[category] || 'default'}>
          {categoryMap[category] || category || 'Tổng quát'}
        </Tag>
      )
    },
    {
      title: "Files",
      dataIndex: "files",
      key: "files",
      render: (files) => (
        <Tag color="blue">{Array.isArray(files) ? files.length : 0} {t.files}</Tag>
      )
    }
  ];

  const checklistColumns = [
    {
      title: t.checklistCols.task,
      dataIndex: "taskName",
      key: "taskName",
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>
    },
    {
      title: t.checklistCols.reviewer,
      dataIndex: "reviewer",
      key: "reviewer",
      render: (text) => <Tag color="green">{text}</Tag>
    },
    {
      title: t.checklistCols.doc,
      dataIndex: "documentCategory",
      key: "documentCategory",
      render: (category) => (
        <Tag color={categoryColors[category] || 'default'}>
          {categoryMap[category] || category}
        </Tag>
      )
    },
    {
      title: t.checklistCols.status,
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusColors = {
          [t.statuses.pending]: 'default',
          [t.statuses.doing]: 'processing',
          [t.statuses.done]: 'success'
        };
        return <Tag color={statusColors[status] || 'default'}>{status || t.statuses.pending}</Tag>;
      }
    }
  ];

  // Reload toàn bộ dashboard lần đầu
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chỉ reload biểu đồ syslog khi đổi range, area hoặc khoảng thời gian custom
  useEffect(() => {
    // Chỉ reload khi user thay đổi filter, không reload lần đầu mount
    if (syslogInitialized) {
      fetchSyslogDataAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syslogRange, syslogArea, syslogCustomRange]);

  // Chỉ reload biểu đồ syslogs statistics khi đổi range, area hoặc khoảng thời gian custom
  useEffect(() => {
    // Chỉ reload khi user thay đổi filter, không reload lần đầu mount
    if (syslogsStatsInitialized) {
      fetchSyslogsStatsDataAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syslogsStatsRange, syslogsStatsArea, syslogsStatsCustomRange]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      background: '#f0f2f5',
      minHeight: '100vh'
    }}>

      { }
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.totalSOPs}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.totalSOPs}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                      <Text style={{ color: '#52c41a', fontSize: '12px' }}>12%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.totalChecklist}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.totalChecklist}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                      <Text style={{ color: '#52c41a', fontSize: '12px' }}>8%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.improvements}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.totalImprovements}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                      <Text style={{ color: '#ff4d4f', fontSize: '12px' }}>3%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
                  {t.completed}
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text style={{ fontSize: '32px', fontWeight: 600, color: '#1890ff' }}>
                    {stats.completedImprovements}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                      <Text style={{ color: '#52c41a', fontSize: '12px' }}>15%</Text>
                    </Space>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      { }
      <Row gutter={[24, 24]}>
        { }
        <Col xs={24} lg={18}>
          <Card
            title={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span style={{ fontWeight: 600 }}>{t.syslogSeverity}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <RangePicker
                    size="middle"
                    value={syslogCustomRange}
                    onChange={(values) => {
                      // values là mảng dayjs hoặc null
                      setSyslogCustomRange(values && values.length === 2 ? values : null);
                    }}
                    allowClear
                    placeholder={
                      lang === "vi"
                        ? ["Từ ngày", "Đến ngày"]
                        : ["开始日期", "结束日期"]
                    }
                    format="DD/MM/YYYY"
                    style={{ borderRadius: 999 }}
                  />
                  <Select
                    size="middle"
                    value={syslogArea}
                    onChange={setSyslogArea}
                    style={{
                      minWidth: 120,
                      borderRadius: 999,
                    }}
                    dropdownStyle={{ borderRadius: 8 }}
                    options={syslogAreaOptions}
                  />
                  <Select
                    size="middle"
                    value={syslogRange}
                    onChange={(value) => {
                      setSyslogRange(value);
                      // Khi chọn nhanh khoảng thời gian, xóa range custom
                      setSyslogCustomRange(null);
                    }}
                    style={{
                      minWidth: 150,
                      borderRadius: 999,
                    }}
                    dropdownStyle={{ borderRadius: 8 }}
                    options={syslogRangeOptions.map((k) => ({
                      value: k,
                      label: t.ranges[k],
                    }))}
                  />
                </div>
              </div>
            }
            style={{
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "none",
            }}
            bodyStyle={{ padding: "16px 8px 24px 8px" }}
          >
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={(() => {
                  // Transform dữ liệu để flatten byArea thành các key trực tiếp
                  if (!Array.isArray(stats.syslogSeverity)) return [];
                  const hasByArea = stats.syslogSeverity.some(it => {
                    const ba = it?.byArea || {};
                    return Object.values(ba).some(v => Number(v) > 0);
                  });

                  if (syslogArea === "ALL") {
                    // Khi chọn "Tất cả"
                    if (hasByArea) {
                      // Có phân bổ theo khu vực: stacked bars
                      return stats.syslogSeverity.map(item => ({
                        severity: item.severity,
                        total: item.total ?? ((item?.byArea?.VT1 || 0) + (item?.byArea?.VT2A || 0) + (item?.byArea?.VT2B || 0) + (item?.byArea?.VTC || 0) + (item?.byArea?.DV || 0)),
                        VT1: item?.byArea?.VT1 || 0,
                        VT2A: item?.byArea?.VT2A || 0,
                        VT2B: item?.byArea?.VT2B || 0,
                        VTC: item?.byArea?.VTC || 0,
                        DV: item?.byArea?.DV || 0,
                      }));
                    }
                    // Không có phân bổ theo khu vực (fallback): hiển thị 1 bar duy nhất là tổng
                    return stats.syslogSeverity.map(item => ({
                      severity: item.severity,
                      total: item.total || 0,
                    }));
                  } else {
                    // Khi chọn một khu vực cụ thể, chỉ lấy giá trị của khu vực đó
                    return stats.syslogSeverity.map(item => ({
                      severity: item.severity,
                      total: item.total || 0,
                      [syslogArea]: item?.byArea?.[syslogArea] || 0,
                    }));
                  }
                })()}
                margin={{ top: 30, right: 20, left: 0, bottom: 8 }}
                barCategoryGap="0%"
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="severity"
                  tick={{ fontSize: 12, fill: "#666" }}
                  axisLine={{ stroke: "#d9d9d9" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#666" }}
                  axisLine={{ stroke: "#d9d9d9" }}
                  tickFormatter={(v) => v.toLocaleString()}
                  allowDecimals={false}
                />
                {(() => {
                  const hasByArea = Array.isArray(stats.syslogSeverity) && stats.syslogSeverity.some(it => {
                    const ba = it?.byArea || {};
                    return Object.values(ba).some(v => Number(v) > 0);
                  });
                  return (syslogArea === "ALL" && hasByArea) ? <Legend content={renderSyslogLegend} /> : null;
                })()}
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const hasByArea = Array.isArray(stats.syslogSeverity) && stats.syslogSeverity.some(it => {
                        const ba = it?.byArea || {};
                        return Object.values(ba).some(v => Number(v) > 0);
                      });
                      let rows = [];
                      if (syslogArea === "ALL" && hasByArea) {
                        // Thứ tự hiển thị trong tooltip từ cao xuống thấp: DV, VTC, VT2B, VT2A, VT1
                        const tooltipOrder = ['DV', 'VTC', 'VT2B', 'VT2A', 'VT1'];
                        rows = tooltipOrder
                          .map(key => payload.find(p => p.dataKey === key))
                          .filter(Boolean);
                      } else {
                        rows = [payload[0]];
                      }

                      return (
                        <div
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #d9d9d9",
                            borderRadius: "6px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                            padding: "12px",
                          }}
                        >
                          <p style={{ marginBottom: "8px", fontWeight: 600 }}>
                            Severity: {label}
                          </p>
                          {rows.map((entry, index) => (
                            <p
                              key={index}
                              style={{
                                margin: "4px 0",
                                color: entry.color,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "12px",
                                  height: "12px",
                                  backgroundColor: entry.color,
                                  borderRadius: "2px",
                                }}
                              />
                              <span style={{ fontWeight: 500 }}>{entry.name || (lang === 'vi' ? 'Tổng' : '总计')}:</span>
                              <span>{entry.value?.toLocaleString() || 0}</span>
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {(() => {
                  const hasByArea = Array.isArray(stats.syslogSeverity) && stats.syslogSeverity.some(it => {
                    const ba = it?.byArea || {};
                    return Object.values(ba).some(v => Number(v) > 0);
                  });
                  return syslogArea === "ALL" ? (
                    // Khi chọn "Tất cả", hiển thị stacked bars và dán nhãn tổng lên bar cuối
                    // Thứ tự stacked bars từ dưới lên: VT1, VT2A, VT2B, VTC, DV
                    // Thứ tự legend: VT1, VT2A, VT2B, VTC, DV (DV sau VTC)
                    hasByArea ? (
                      <>
                        {['VT1', 'VT2A', 'VT2B', 'VTC', 'DV'].map((areaKey, index) => {
                          const isLast = index === 4; // DV là bar cuối cùng
                          return (
                            <Bar
                              key={areaKey}
                              dataKey={areaKey}
                              name={areaKey}
                              fill={areaColors[areaKey] || "#52c41a"}
                              radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              stackId="areas"
                              barSize={90}
                            >
                              {isLast && (
                                <LabelList
                                  dataKey="total"
                                  position="top"
                                  formatter={(value, _name, props) => {
                                    const payload = props && props.payload ? props.payload : {};
                                    let total = value;
                                    if (total === undefined || total === null) {
                                      total = (Number(payload.VT1) || 0) + (Number(payload.VT2A) || 0) + (Number(payload.VT2B) || 0) + (Number(payload.VTC) || 0) + (Number(payload.DV) || 0);
                                    }
                                    if (!total) return "";
                                    return Number(total).toLocaleString();
                                  }}
                                />
                              )}
                            </Bar>
                          );
                        })}
                      </>
                    ) : (
                      <Bar
                        dataKey="total"
                        name={lang === 'vi' ? 'Tổng' : '总计'}
                        fill="#1890ff"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={90}
                      >
                        <LabelList
                          position="top"
                          formatter={(v) => (v ?? 0).toLocaleString()}
                          offset={6}
                        />
                      </Bar>
                    )
                  ) : (
                    // Khi chọn một khu vực cụ thể, chỉ hiển thị bar cho khu vực đó
                    <Bar
                      dataKey={syslogArea}
                      name={syslogArea}
                      fill={areaColors[syslogArea] || "#52c41a"}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={90}
                    >
                      <LabelList
                        position="top"
                        formatter={(v) => (v ?? 0).toLocaleString()}
                        offset={6}
                      />
                    </Bar>
                  )
                })()}
              </BarChart>
            </ResponsiveContainer>
            {syslogLoading && (
              <div style={{ textAlign: "center", paddingTop: 12 }}>
                <Spin size="small" />
              </div>
            )}
          </Card>
        </Col>

        { }
        <Col xs={24} lg={18}>
          <Card
            title={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span style={{ fontWeight: 600 }}>{t.syslogsStatistics}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <RangePicker
                    size="middle"
                    value={syslogsStatsCustomRange}
                    onChange={(values) => {
                      setSyslogsStatsCustomRange(values && values.length === 2 ? values : null);
                    }}
                    allowClear
                    placeholder={
                      lang === "vi"
                        ? ["Từ ngày", "Đến ngày"]
                        : ["开始日期", "结束日期"]
                    }
                    format="DD/MM/YYYY"
                    style={{ borderRadius: 999 }}
                  />
                  <Select
                    size="middle"
                    value={syslogsStatsArea}
                    onChange={setSyslogsStatsArea}
                    style={{
                      minWidth: 120,
                      borderRadius: 999,
                    }}
                    dropdownStyle={{ borderRadius: 8 }}
                    options={syslogsStatsAreaOptions}
                  />
                  <Select
                    size="middle"
                    value={syslogsStatsRange}
                    onChange={(value) => {
                      setSyslogsStatsRange(value);
                      setSyslogsStatsCustomRange(null);
                      setSelectedSeverity(null); // Reset selection khi đổi range
                    }}
                    style={{
                      minWidth: 150,
                      borderRadius: 999,
                    }}
                    dropdownStyle={{ borderRadius: 8 }}
                    options={syslogRangeOptions.map((k) => ({
                      value: k,
                      label: t.ranges[k],
                    }))}
                  />
                </div>
              </div>
            }
            style={{
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              border: "none",
            }}
            bodyStyle={{ padding: "16px 8px 24px 8px" }}
          >
            {!selectedSeverity ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={(() => {
                    if (!Array.isArray(stats.syslogsStatistics)) return [];
                    // Chỉ hiển thị dữ liệu cho khu vực được chọn hoặc tổng hợp
                    return stats.syslogsStatistics.map(item => {
                      let total, pending, doing, completed, cancelled;

                      // Xử lý đặc biệt cho trường hợp ALL
                      if (syslogsStatsArea === "ALL") {
                        pending = Number(item.pending || 0);
                        doing = Number(item.doing || 0);
                        completed = Number(item.completed || 0);
                        total = Number(item.total || 0);
                        // total = pending + doing + completed + cancelled
                        cancelled = total - pending - doing - completed;
                        if (cancelled < 0) cancelled = 0;
                      } else {
                        // Lấy thông tin status từ byArea
                        const byArea = item?.byArea || {};
                        pending = Number(byArea[`${syslogsStatsArea}_0`] || 0);
                        doing = Number(byArea[`${syslogsStatsArea}_1`] || 0);
                        completed = Number(byArea[`${syslogsStatsArea}_2`] || 0);
                        cancelled = Number(byArea[`${syslogsStatsArea}_3`] || 0);
                        const totalFromStatus = pending + doing + completed + cancelled;
                        const areaTotal = Number(byArea[syslogsStatsArea] || 0);
                        total = totalFromStatus > 0 ? totalFromStatus : areaTotal;
                      }

                      return {
                        severity: item.severity || '',
                        total: total,
                        pending: pending,
                        doing: doing,
                        completed: completed,
                        cancelled: cancelled,
                        [syslogsStatsArea]: total
                      };
                    });
                  })()}
                  margin={{ top: 30, right: 20, left: 0, bottom: 8 }}
                  barCategoryGap="0%"
                  barGap={0}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="severity"
                    tick={{ fontSize: 12, fill: "#666" }}
                    axisLine={{ stroke: "#d9d9d9" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#666" }}
                    axisLine={{ stroke: "#d9d9d9" }}
                    tickFormatter={(v) => v.toLocaleString()}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload || {};
                        const pending = Number(data.pending || 0);
                        const doing = Number(data.doing || 0);
                        const completed = Number(data.completed || 0);
                        const cancelled = Number(data.cancelled || 0);
                        const total = Number(data.total || 0);

                        return (
                          <div
                            style={{
                              backgroundColor: "#fff",
                              border: "1px solid #d9d9d9",
                              borderRadius: "6px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                              padding: "12px",
                              zIndex: 1000,
                            }}
                          >
                            <p style={{ marginBottom: "8px", fontWeight: 600 }}>
                              Severity: {label}
                            </p>
                            <p style={{ margin: "4px 0", color: '#1890ff' }}>
                              Tổng: {total.toLocaleString()}
                            </p>
                            <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '4px 0' }} />
                            <p style={{ margin: "4px 0", fontSize: '12px', color: '#888' }}>
                              {lang === 'vi' ? 'Nhấn để xem chi tiết' : '点击查看详情'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={syslogsStatsArea}
                    name={syslogsStatsArea}
                    fill={areaColors[syslogsStatsArea] || "#52c41a"}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={90}
                    background={{ fill: 'rgba(0,0,0,0)' }}
                    onClick={(data) => {
                      if (data && data.severity) {
                        setSelectedSeverity(data);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <LabelList
                      position="top"
                      formatter={(value) => value > 0 ? value.toLocaleString() : ''}
                      offset={6}
                      style={{ fontSize: '12px', fill: '#666' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              /* Pie Chart View */
              <div style={{ width: '100%', height: 360, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setSelectedSeverity(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#000000', fontWeight: 500 }}
                  >
                    <ArrowDownOutlined style={{ transform: 'rotate(90deg)' }} /> {lang === 'vi' ? 'Quay lại' : '返回'}
                  </a>
                </div>

                <h4 style={{ margin: 0, marginBottom: 16, fontSize: 16 }}>
                  {lang === 'vi' ? `Chi tiết: ${selectedSeverity.severity}` : `详情: ${selectedSeverity.severity}`}
                </h4>

                {(() => {
                  const total = selectedSeverity.total || 1;
                  const pieData = [
                    { name: lang === 'vi' ? 'Hoàn thành' : '已完成', value: selectedSeverity.completed, color: '#00C49F' },
                    { name: lang === 'vi' ? 'Chưa xử lý' : '待处理', value: selectedSeverity.pending, color: '#00B96B' },
                    { name: lang === 'vi' ? 'Đang xử lý' : '进行中', value: selectedSeverity.doing, color: '#FFBB28' },
                    { name: lang === 'vi' ? 'Đã hủy' : '已取消', value: selectedSeverity.cancelled, color: '#FF4D4F' }
                  ].filter(item => item.value > 0).map(item => ({
                    ...item,
                    name: `${item.name}: ${item.value} (${(item.value / total * 100).toFixed(1)}%)`
                  }));

                  return (
                    <ResponsiveContainer width="100%" height="85%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={(props) => {
                            if (props.percent < 0.05) return false;
                            return true;
                          }}
                          label={({ percent, value }) => {
                            if (percent < 0.05) return null;
                            return `${value} (${(percent * 100).toFixed(0)}%)`;
                          }}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#000" strokeWidth={1} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            )}
            {syslogsStatsLoading && (
              <div style={{ textAlign: "center", paddingTop: 12 }}>
                <Spin size="small" />
              </div>
            )}
          </Card>
        </Col>

        { }
        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>{t.topReviewers}</span>
            }
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <List
              dataSource={stats.topReviewers}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '12px 0', border: 'none' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={40}
                        style={{
                          backgroundColor: index < 3 ? '#ff4d4f' : '#52c41a',
                          fontWeight: 600,
                          fontSize: '16px'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Text style={{ fontWeight: 500, fontSize: '16px' }}>
                        {item.name}
                      </Text>
                    }
                    description={
                      <Space>
                        <Text type="secondary">{t.workCount(item.count)}</Text>
                        {index < 3 && (
                          <Tag color="red" style={{ fontSize: '10px' }}>
                            {t.top(index + 1)}
                          </Tag>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        { }
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ fontWeight: 600 }}>{t.sopByCategory}</span>
            }
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: 'none'
            }}
            bodyStyle={{ padding: '24px' }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: categoryMap.win, value: stats.categoryStats.win || 0, color: '#52c41a' },
                { name: categoryMap.network, value: stats.categoryStats.network || 0, color: '#1890ff' },
                { name: categoryMap.software, value: stats.categoryStats.software || 0, color: '#722ed1' },
                { name: categoryMap.general, value: stats.categoryStats.general || 0, color: '#8c8c8c' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#666' }}
                  axisLine={{ stroke: '#d9d9d9' }}
                />
                <RechartsTooltip
                  formatter={(value, name) => [value, t.sopLabel]}
                  labelFormatter={(label) => t.type(label)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#1890ff"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        { }

      </Row>
    </div>
  );
}

