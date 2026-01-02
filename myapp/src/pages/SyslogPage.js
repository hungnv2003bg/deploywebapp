import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Button,
  Select,
  Modal,
  notification,
  message,
  Descriptions,
  Input,
  Form,
  Upload,
  List,
  Space,
  DatePicker,
  Dropdown,
} from "antd";
import { BugOutlined, SwapOutlined, MailOutlined, EyeOutlined, UploadOutlined, DeleteOutlined, DownloadOutlined, SearchOutlined, FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { fetchSyslogs, fetchSyslogCounts, fetchSyslogFactories, fetchSyslogDevices } from "../services/syslogService";
import axios from "../plugins/axios";
import { formatDateShortVN } from "../utils/dateUtils";
import { formatFileSize } from "../utils/fileUtils";
import API_CONFIG from "../config/api";
import { useLanguage } from "../contexts/LanguageContext";
import SyslogMailSettings from "../components/SyslogMailSettings";
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Ho_Chi_Minh");

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
    pageTitle: "Syslog",
    loadError: "Không thể tải Syslog",
    severity: "Cấp độ",
    hostname: "Hostname",
    log: "Log",
    status: "Trạng thái",
    action: "Cách xử lý",
    completedAt: "Ngày hoàn thành",
    collaborator: "Người phối hợp",
    handler: "Người phụ trách",
    factory: "Khu vực",
    createdDate: "Ngày tạo",
    actions: "Thao tác",
    searchPlaceholder: "Tìm kiếm theo hostname hoặc log...",
    datePlaceholder: ["Từ ngày", "Đến ngày"],
    filterFactory: "Lọc theo khu vực",
    filterStatus: "Lọc theo trạng thái",
    clearFilters: "Xóa bộ lọc",
    export: "Xuất/In",
    exportPdf: "In PDF",
    exportExcel: "Xuất Excel",
    successTitle: "Thành công",
    updateSuccess: "Đã cập nhật thông tin thành công",
    updateError: "Không thể cập nhật thông tin",
    systemTitle: "Hệ thống",
    downloadError: "Lỗi khi in PDF: ",
    exportError: "Lỗi khi xuất Excel: ",
    statusOptions: {
      0: "Chờ xử lý",
      1: "Đang xử lý",
      2: "Hoàn thành",
      3: "Đã hủy",
    },
    changeStatus: "Đổi trạng thái",
    changeStatusBatch: "Đổi trạng thái",
    changeStatusBatchTitle: "Đổi trạng thái cho tất cả syslog đang hiển thị",
    viewDetail: "Xem chi tiết",
    mail: "Mail",
    editModalTitle: "Chỉnh sửa thông tin",
    okText: "Xác nhận",
    cancelText: "Hủy",
    viewModalTitle: "Chi tiết Syslog",
    close: "Đóng",
    fileConfirmDelete: (name) => `Bạn có chắc chắn muốn xóa file "${name}"?`,
    fileDeleted: "Đã xóa file",
    delete: "Xóa",
    keep: "Hủy",
    uploadLabel: "Tài liệu đính kèm",
    selectFile: "Chọn tài liệu",
    actionTakenPlaceholder: "Nhập cách xử lý",
    handlerPlaceholder: "Nhập tên người phụ trách",
    collaboratorPlaceholder: "Nhập tên người phối hợp",
    lastEditor: "Người sửa cuối",
    lastEditedAt: "Thời gian sửa cuối",
    notFound: "-",
    total: (total) => `Tổng ${total} bản ghi`,
  },
  zh: {
    pageTitle: "Syslog",
    loadError: "无法加载 Syslog",
    severity: "级别",
    hostname: "主机名",
    log: "日志",
    status: "状态",
    action: "处理方式",
    completedAt: "完成日期",
    collaborator: "协作人",
    handler: "负责人",
    factory: "区域",
    createdDate: "创建日期",
    actions: "操作",
    searchPlaceholder: "按主机名或日志搜索...",
    datePlaceholder: ["开始日期", "结束日期"],
    filterFactory: "按区域筛选",
    filterStatus: "按状态筛选",
    clearFilters: "清除筛选",
    export: "导出/打印",
    exportPdf: "打印 PDF",
    exportExcel: "导出 Excel",
    successTitle: "成功",
    updateSuccess: "更新成功",
    updateError: "无法更新信息",
    systemTitle: "系统",
    downloadError: "打印 PDF 出错: ",
    exportError: "导出 Excel 出错: ",
    statusOptions: {
      0: "待处理",
      1: "处理中",
      2: "已完成",
      3: "已取消",
    },
    changeStatus: "更改状态",
    changeStatusBatch: "更改状态",
    changeStatusBatchTitle: "更改所有显示中的 syslog 状态",
    viewDetail: "查看详情",
    mail: "邮件",
    editModalTitle: "编辑信息",
    okText: "确定",
    cancelText: "取消",
    viewModalTitle: "Syslog 详情",
    close: "关闭",
    fileConfirmDelete: (name) => `确定删除文件 "${name}" 吗？`,
    fileDeleted: "已删除文件",
    delete: "删除",
    keep: "取消",
    uploadLabel: "附件",
    selectFile: "选择文件",
    actionTakenPlaceholder: "输入处理方式",
    handlerPlaceholder: "输入负责人",
    collaboratorPlaceholder: "输入协作人",
    lastEditor: "最后编辑人",
    lastEditedAt: "最后编辑时间",
    notFound: "-",
    total: (total) => `共 ${total} 条记录`,
  },
};

function SyslogPage() {
  const { lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { quyenList } = useSelector(state => state.user);
  const t = labels[lang] || labels.vi;
  const statusText = (status) => t.statusOptions[status] || (lang === 'vi' ? `Status ${status}` : `状态 ${status}`);
  const [allData, setAllData] = useState([]); // Dữ liệu đã filter để hiển thị
  const [counts, setCounts] = useState({}); // Counts theo severity
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [visibleSeverities, setVisibleSeverities] = useState(severityList);
  const [activeSeverity, setActiveSeverity] = useState(severityList[0]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [statusForm] = Form.useForm();
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [mailConfigVisible, setMailConfigVisible] = useState(false);
  const [selectedSeverityForMail, setSelectedSeverityForMail] = useState(null);
  const [batchStatusModalVisible, setBatchStatusModalVisible] = useState(false);
  const [batchStatusForm] = Form.useForm();

  // Kiểm tra quyền admin
  const isAdmin = useMemo(() => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(role =>
      role === 'ADMIN' || role === 'ROLE_ADMIN'
    );
  }, [quyenList]);

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [factoryFilter, setFactoryFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [deviceFilter, setDeviceFilter] = useState(undefined);

  // Cache factory options từ dữ liệu đã load
  const [factoryOptionsCache, setFactoryOptionsCache] = useState([]);
  const [deviceOptionsCache, setDeviceOptionsCache] = useState([]);

  // Không cần load riêng visibleSeverities nữa, sẽ lấy từ counts API

  // Đảm bảo activeSeverity luôn nằm trong danh sách được phép
  useEffect(() => {
    if (!visibleSeverities.includes(activeSeverity)) {
      const next = visibleSeverities[0] || severityList[0];
      setActiveSeverity(next);
    }
  }, [visibleSeverities, activeSeverity]);

  // Debounce search text để tránh gọi API quá nhiều
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Lấy danh sách factory names từ cache
  const getFactoryOptions = useMemo(() => {
    // Thêm option "Tất cả" vào đầu danh sách
    const allOption = { value: undefined, label: lang === 'vi' ? 'Tất cả' : '全部' };
    return [allOption, ...factoryOptionsCache];
  }, [factoryOptionsCache, lang]);
  const getDeviceOptions = useMemo(() => {
    // Thêm option "Tất cả" vào đầu danh sách
    const allOption = { value: undefined, label: lang === 'vi' ? 'Tất cả' : '全部' };
    return [allOption, ...deviceOptionsCache];
  }, [deviceOptionsCache, lang]);

  useEffect(() => {
    const loadFactories = async () => {
      try {
        const options = await fetchSyslogFactories();
        setFactoryOptionsCache(prev => {
          const set = new Set(prev.map(o => o.value));
          options.forEach(opt => set.add(opt.value));
          return Array.from(set).sort().map(name => ({ value: name, label: name }));
        });
      } catch (e) {
      }
    };
    loadFactories();
  }, []);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const options = await fetchSyslogDevices();
        setDeviceOptionsCache(options);
      } catch (e) {
      }
    };
    loadDevices();
  }, []);

  const loadData = useCallback(async (page = 0, pageSize = 10) => {
    setLoading(true);
    setError("");
    try {
      const filters = {
        severity: activeSeverity !== "All" ? activeSeverity : undefined,
        search: debouncedSearchText && debouncedSearchText.trim() ? debouncedSearchText.trim() : undefined,
        factoryName: factoryFilter,
        deviceId: deviceFilter,
        status: statusFilter,
        startDate: dateRange && dateRange[0] ? dateRange[0].tz('Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined,
        endDate: dateRange && dateRange[1] ? dateRange[1].tz('Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined,
      };

      const pageData = await fetchSyslogs(filters, page, pageSize);

      setAllData(Array.isArray(pageData.content) ? pageData.content : []);

      // Update pagination với dữ liệu từ backend
      setPagination(prev => ({
        ...prev,
        total: pageData.totalElements || 0,
        current: page + 1,
        pageSize: pageSize
      }));

      // Cập nhật factory options cache từ dữ liệu mới
      // Giữ lại các giá trị đã có thay vì ghi đè, tránh mất lựa chọn khi đã lọc
      setFactoryOptionsCache(prev => {
        const factorySet = new Set(prev.map(opt => opt.value));
        pageData.content?.forEach(item => {
          if (item.factoryName && item.factoryName.trim()) {
            factorySet.add(item.factoryName.trim());
          }
        });
        return Array.from(factorySet)
          .sort()
          .map(factoryName => ({
            value: factoryName,
            label: factoryName
          }));
      });
    } catch (err) {
      setError(err?.message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [activeSeverity, debouncedSearchText, dateRange, factoryFilter, deviceFilter, statusFilter, t.loadError]);

  const loadCounts = useCallback(async () => {
    try {
      const filters = {
        search: debouncedSearchText && debouncedSearchText.trim() ? debouncedSearchText.trim() : undefined,
        factoryName: factoryFilter,
        deviceId: deviceFilter,
        status: statusFilter,
        startDate: dateRange && dateRange[0] ? dateRange[0].tz('Asia/Ho_Chi_Minh').startOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined,
        endDate: dateRange && dateRange[1] ? dateRange[1].tz('Asia/Ho_Chi_Minh').endOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined,
      };
      const response = await fetchSyslogCounts(filters);
      const visibleSeveritiesFromBackend = response.visibleSeverities || [];
      const countsFromBackend = response.counts || {};


      if (Array.isArray(visibleSeveritiesFromBackend) && visibleSeveritiesFromBackend.length > 0) {
        setVisibleSeverities(visibleSeveritiesFromBackend);
        setActiveSeverity((prev) => {
          if (visibleSeveritiesFromBackend.includes(prev)) {
            return prev;
          }
          return visibleSeveritiesFromBackend[0] || severityList[0];
        });
      } else {

        setVisibleSeverities(severityList);
      }

      setCounts(countsFromBackend);
    } catch (err) {
      console.error("Error loading counts:", err);

      setVisibleSeverities(severityList);
      setCounts({});
    }
  }, [debouncedSearchText, dateRange, factoryFilter, deviceFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();

    loadData(0, 10);
    loadCounts();

  }, []);


  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const syslogIdParam = urlParams.get('id');

    if (syslogIdParam) {
      // Tìm syslog có id tương ứng trong data hiện tại
      const syslog = allData.find(item => String(item.id) === String(syslogIdParam));
      if (syslog) {
        // Mở modal xem chi tiết
        setViewRecord(syslog);
        // Xóa query parameter khỏi URL
        navigate('/syslog', { replace: true });
      } else {
        // Nếu không tìm thấy trong data hiện tại, load từ API
        const loadSyslogById = async () => {
          try {
            const response = await axios.get(`/api/syslogs/${syslogIdParam}`);
            if (response.data) {
              const syslog = response.data;

              // API đã trả về DTO với đầy đủ factoryName và userFullName
              setViewRecord({
                id: syslog.id,
                factoryId: syslog.factoryId,
                userId: syslog.userId,
                severity: syslog.severity,
                hostname: syslog.hostname,
                logText: syslog.logText,
                createdDate: syslog.createdDate,
                status: syslog.status,
                actionTaken: syslog.actionTaken,
                completedAt: syslog.completedAt,
                collaborator: syslog.collaborator,
                files: syslog.files || [],
                factoryName: syslog.factoryName || null,
                userFullName: syslog.userFullName || null,
              });

              // Set severity active để hiển thị đúng tab và load data
              if (syslog.severity && visibleSeverities.includes(syslog.severity)) {
                setActiveSeverity(syslog.severity);
                // Load data với severity này để syslog xuất hiện trong table
                const pageSize = pagination.pageSize || 10;
                loadData(0, pageSize);
              }

              // Xóa query parameter khỏi URL
              navigate('/syslog', { replace: true });
            }
          } catch (error) {
            console.error('Error loading syslog by ID:', error);
            notification.error({
              message: lang === 'vi' ? 'Lỗi' : '错误',
              description: lang === 'vi' ? 'Không tìm thấy syslog với ID này' : '找不到此 ID 的 syslog',
              placement: 'bottomRight'
            });
            // Xóa query parameter khỏi URL ngay cả khi lỗi
            navigate('/syslog', { replace: true });
          }
        };
        loadSyslogById();
      }
    }
  }, [location.search, allData, navigate, visibleSeverities, loadData, pagination.pageSize]);

  // Load counts khi filter thay đổi (không phụ thuộc vào severity)
  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchText, dateRange, factoryFilter, statusFilter]);

  // Load data khi severity hoặc filter thay đổi (reset về trang 1)
  useEffect(() => {
    const pageSize = pagination.pageSize || 10;
    // Reset pagination trước, sau đó load data
    setPagination(prev => ({ ...prev, current: 1, total: 0 }));
    // Load data từ trang 1
    loadData(0, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeverity, debouncedSearchText, dateRange, factoryFilter, deviceFilter, statusFilter]);

  // Xử lý khi user thay đổi trang - backend xử lý pagination
  const handlePaginationChange = useCallback((page, pageSize) => {
    setPagination(prev => {
      const total = prev.total || 0;
      const size = pageSize || prev.pageSize || 10;
      const maxPage = Math.max(1, Math.ceil(total / size));
      const safePage = Math.min(Math.max(page, 1), maxPage);
      loadData(safePage - 1, size);
      return { ...prev, current: safePage, pageSize: size };
    });
  }, [loadData]);

  // Xử lý khi user thay đổi pageSize - reset về trang 1
  const handlePageSizeChange = useCallback((current, size) => {
    setPagination(prev => {
      const total = prev.total || 0;
      const maxPage = Math.max(1, Math.ceil(total / size));
      const safePage = Math.min(1, maxPage);
      loadData(safePage - 1, size);
      return { ...prev, current: safePage, pageSize: size };
    });
  }, [loadData]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users");
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const createCollaboratorOptions = () => {
    const userOptions = users.map(user => ({
      key: `user:${user.userID}`,
      value: `user:${user.userID}`,
      label: user.fullName || user.manv || `User ${user.userID}`
    }));
    return userOptions;
  };

  // Chuẩn hóa hiển thị collaborator/id sang tên người dùng
  const findUserByIdentifier = useCallback((raw) => {
    if (!raw || !String(raw).trim()) return null;
    const trimmed = String(raw).trim();
    const lower = trimmed.toLowerCase();

    const matchById = (idStr) => users.find(u => String(u.userID) === String(idStr).trim());

    if (lower.startsWith("user:")) {
      const idPart = trimmed.slice(5);
      const matched = matchById(idPart);
      if (matched) return matched;
    } else if (/^\d+$/.test(trimmed)) {
      const matched = matchById(trimmed);
      if (matched) return matched;
    }

    return (
      users.find(
        (u) =>
          (u.manv && u.manv.trim() === trimmed) ||
          (u.fullName && u.fullName.trim() === trimmed) ||
          (u.email && u.email.trim().toLowerCase() === lower)
      ) || null
    );
  }, [users]);

  const formatCollaboratorDisplay = useCallback((value) => {
    if (!value) return "";
    const parts = Array.isArray(value) ? value : String(value).split(",");
    const names = parts
      .map((part) => {
        const item = (part || "").trim();
        if (!item) return null;
        const user = findUserByIdentifier(item);
        if (user) return user.fullName || user.manv || `User ${user.userID}`;
        return item;
      })
      .filter(Boolean);
    return names.join(", ");
  }, [findUserByIdentifier]);

  const getLastEditorDisplay = useCallback((lastEditedBy) => {
    if (!lastEditedBy) return '-';
    const userId = typeof lastEditedBy === 'number' ? lastEditedBy : Number(lastEditedBy);
    if (isNaN(userId)) return '-';
    const u = users.find(x => x.userID === userId);
    return (u?.fullName || u?.manv || (lang === 'vi' ? `User ${userId}` : `用户 ${userId}`));
  }, [users, lang]);

  const handleChangeStatus = (record) => {
    setSelectedRecord(record);
    setSelectedStatus(record.status);

    // Xử lý userFullName - chuyển string thành array và cố gắng match với user
    let userFullNameValue = record.userFullName || "";
    if (typeof userFullNameValue === 'string' && userFullNameValue.trim()) {
      // Nếu là string có dấu phẩy, chuyển thành array
      const parts = userFullNameValue.split(',').map(s => s.trim()).filter(s => s);
      // Cố gắng match với user, nếu không match thì giữ nguyên string
      userFullNameValue = parts.map(part => {
        const matchedUser = users.find(u =>
          (u.fullName && u.fullName.trim() === part) ||
          (u.manv && u.manv.trim() === part)
        );
        return matchedUser ? `user:${matchedUser.userID}` : part;
      });
    } else if (Array.isArray(userFullNameValue)) {
      userFullNameValue = userFullNameValue;
    } else {
      userFullNameValue = [];
    }

    // Xử lý collaborator - chuyển string thành array và cố gắng match với user
    let collaboratorValue = record.collaborator || "";
    if (typeof collaboratorValue === 'string' && collaboratorValue.trim()) {
      // Nếu là string có dấu phẩy, chuyển thành array
      const parts = collaboratorValue.split(',').map(s => s.trim()).filter(s => s);
      // Cố gắng match với user, nếu không match thì giữ nguyên string
      collaboratorValue = parts.map(part => {
        const matchedUser = users.find(u =>
          (u.fullName && u.fullName.trim() === part) ||
          (u.manv && u.manv.trim() === part)
        );
        return matchedUser ? `user:${matchedUser.userID}` : part;
      });
    } else if (Array.isArray(collaboratorValue)) {
      collaboratorValue = collaboratorValue;
    } else {
      collaboratorValue = [];
    }

    statusForm.setFieldsValue({
      status: record.status,
      factoryName: record.factoryName || "",
      userFullName: userFullNameValue,
      collaborator: collaboratorValue,
      actionTaken: record.actionTaken || "",
    });
    setExistingFiles(Array.isArray(record.files) ? record.files : []);
    setFiles([]);
    setStatusModalVisible(true);
  };

  const uploadFile = async (file, severity) => {
    const formData = new FormData();
    formData.append('file', file);
    if (severity) formData.append('severity', severity);

    const response = await fetch(API_CONFIG.getSyslogUploadUrl(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return result;
  };

  const handleStatusModalOk = async () => {
    try {
      const values = await statusForm.validateFields();
      if (selectedRecord) {
        // Upload new files
        let uploadedFiles = [];
        if (files.length > 0) {
          for (const file of files) {
            if (file.originFileObj) {
              const uploadResult = await uploadFile(file.originFileObj, selectedRecord.severity);

              const fileExtension = file.name.split('.').pop().toLowerCase();
              let fileType = 'other';
              if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
                fileType = 'image';
              } else if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(fileExtension)) {
                fileType = 'video';
              } else if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
                fileType = 'document';
              }

              uploadedFiles.push({
                filePath: uploadResult.url,
                fileName: uploadResult.name || file.name,
                fileType: fileType,
                fileSize: file.originFileObj.size
              });
            }
          }
        }

        // Combine existing and new files
        const filesToKeep = existingFiles.map(f => ({
          id: f.id,
          filePath: f.filePath,
          fileName: f.fileName,
          fileType: f.fileType,
          fileSize: f.fileSize,
          createdAt: f.createdAt
        }));
        const allFiles = [...filesToKeep, ...uploadedFiles];

        // Xử lý userFullName - chuyển array thành string nếu là array
        let userFullNameValue = values.userFullName;
        if (Array.isArray(userFullNameValue)) {
          userFullNameValue = userFullNameValue
            .map(item => {
              if (typeof item === 'string' && item.startsWith('user:')) {
                // Tìm user tương ứng
                const userId = item.replace('user:', '');
                const user = users.find(u => String(u.userID) === userId);
                return user ? (user.fullName || user.manv || `User ${userId}`) : item;
              }
              return item;
            })
            .filter(item => item && item.trim())
            .join(', ');
        } else if (!userFullNameValue) {
          userFullNameValue = "";
        }

        // Xử lý collaborator - chuyển array thành string nếu là array
        let collaboratorValue = values.collaborator;
        if (Array.isArray(collaboratorValue)) {
          // Lọc bỏ các giá trị có format "user:xxx" và chỉ lấy phần text tự do
          collaboratorValue = collaboratorValue
            .map(item => {
              if (typeof item === 'string' && item.startsWith('user:')) {
                // Tìm user tương ứng
                const userId = item.replace('user:', '');
                const user = users.find(u => String(u.userID) === userId);
                return user ? (user.fullName || user.manv || `User ${userId}`) : item;
              }
              return item;
            })
            .filter(item => item && item.trim())
            .join(', ');
        } else if (!collaboratorValue) {
          collaboratorValue = "";
        }

        await axios.patch(`/api/syslogs/${selectedRecord.id}`, {
          status: values.status,
          factoryName: values.factoryName,
          userFullName: userFullNameValue,
          collaborator: collaboratorValue,
          actionTaken: values.actionTaken,
          files: allFiles,
        });
        notification.success({
          message: t.successTitle,
          description: t.updateSuccess,
          placement: "bottomRight",
        });
        setStatusModalVisible(false);
        setSelectedRecord(null);
        setSelectedStatus(null);
        setFiles([]);
        setExistingFiles([]);
        statusForm.resetFields();
        // Reload dữ liệu với trang hiện tại
        loadData(pagination.current - 1, pagination.pageSize);
        loadCounts(); // Reload counts
      }
    } catch (err) {
      if (err.errorFields) {
        // Validation errors
        return;
      }
      notification.error({
        message: t.systemTitle,
        description: t.updateError,
        placement: "bottomRight",
      });
    }
  };

  const handleStatusModalCancel = () => {
    setStatusModalVisible(false);
    setSelectedRecord(null);
    setSelectedStatus(null);
    setFiles([]);
    setExistingFiles([]);
    statusForm.resetFields();
  };

  const handleDeleteSyslog = (record) => {
    if (!record?.id) return;
    Modal.confirm({
      title: lang === 'vi' ? 'Xóa syslog?' : '删除 syslog?',
      content: lang === 'vi'
        ? 'Bạn chắc chắn muốn xóa syslog này? Thao tác không thể hoàn tác.'
        : '确定要删除此 syslog 吗？该操作无法撤销。',
      okText: lang === 'vi' ? 'Xóa' : '删除',
      cancelText: t.cancelText,
      okType: 'danger',
      onOk: async () => {
        try {
          await axios.delete(`/api/syslogs/${record.id}`);
          notification.success({
            message: t.successTitle,
            description: lang === 'vi' ? 'Đã xóa syslog' : '已删除 syslog',
            placement: 'bottomRight',
          });
          // Nếu xóa xong trang hiện tại không còn dữ liệu, lùi về trang trước nếu có
          const currentPage = pagination.current || 1;
          const currentSize = pagination.pageSize || 10;
          const nextPage = Math.max(currentPage - 1, 1);
          await loadData(nextPage - 1, currentSize);
          loadCounts();
        } catch (error) {
          notification.error({
            message: t.systemTitle,
            description: lang === 'vi' ? 'Xóa không thành công' : '删除失败',
            placement: 'bottomRight',
          });
        }
      },
    });
  };

  const handleBatchStatusModalOk = async () => {
    try {
      const values = await batchStatusForm.validateFields();
      const status = values.status;
      const actionTaken = values.actionTaken || "";

      // Hiển thị loading
      const hide = message.loading(
        lang === 'vi'
          ? 'Đang cập nhật syslog...'
          : '正在更新 syslog...',
        0
      );

      try {
        // Chuẩn bị các filter hiện tại
        const filters = {
          severity: activeSeverity !== "All" ? activeSeverity : undefined,
          search: debouncedSearchText && debouncedSearchText.trim() ? debouncedSearchText.trim() : undefined,
          factoryName: factoryFilter,
          deviceId: deviceFilter,
          status: statusFilter,
          startDate: dateRange && dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
          endDate: dateRange && dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined,
        };

        // Gọi API backend để cập nhật hàng loạt
        const response = await axios.patch('/api/syslogs/batch-update', {
          status: status,
          actionTaken: actionTaken,
        }, {
          params: filters
        });

        const updatedCount = response.data?.updatedCount || 0;

        hide();

        if (updatedCount > 0) {
          notification.success({
            message: t.successTitle,
            description: lang === 'vi'
              ? `Đã cập nhật ${updatedCount} syslog thành công`
              : `已成功更新 ${updatedCount} 个 syslog`,
            placement: "bottomRight",
          });
        } else {
          notification.warning({
            message: lang === 'vi' ? 'Thông báo' : '通知',
            description: lang === 'vi'
              ? 'Không có syslog nào được cập nhật. Vui lòng kiểm tra lại bộ lọc.'
              : '没有 syslog 被更新。请检查筛选条件。',
            placement: "bottomRight",
          });
        }

        setBatchStatusModalVisible(false);
        batchStatusForm.resetFields();

        // Reload data
        loadData(pagination.current - 1, pagination.pageSize);
        loadCounts();
      } catch (error) {
        hide();
        console.error("Error updating batch status:", error);
        const errorMessage = error.response?.data?.error || error.message ||
          (lang === 'vi' ? 'Có lỗi xảy ra khi cập nhật' : '更新时发生错误');
        notification.error({
          message: t.systemTitle,
          description: errorMessage,
          placement: "bottomRight",
        });
      }
    } catch (error) {
      console.error("Form validation error:", error);
    }
  };

  const handleBatchStatusModalCancel = () => {
    setBatchStatusModalVisible(false);
    batchStatusForm.resetFields();
  };

  const removeFile = (fileId) => {
    const file = existingFiles.find(f => f.id === fileId);
    Modal.confirm({
      title: t.delete,
      content: t.fileConfirmDelete(file?.fileName || 'file'),
      okText: t.delete,
      cancelText: t.cancelText,
      okType: 'danger',
      onOk: () => {
        setExistingFiles(existingFiles.filter(f => f.id !== fileId));
        notification.success({
          message: t.successTitle,
          description: t.fileDeleted,
          placement: "bottomRight",
        });
      },
    });
  };

  const handleDownload = (filePath, fileName) => {
    if (!filePath) return;
    // Construct download URL
    const downloadUrl = filePath.startsWith('http')
      ? filePath
      : `${API_CONFIG.BACKEND_URL}${filePath}`;

    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName || 'file';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewFile = (filePath, fileName) => {
    if (!filePath) return;
    // Construct view URL
    const viewUrl = filePath.startsWith('http')
      ? filePath
      : `${API_CONFIG.BACKEND_URL}${filePath}`;

    // Open file in new tab to view
    window.open(viewUrl, '_blank');
  };

  const columns = [
    {
      title: "STT",
      width: 80,
      align: "center",
      render: (_, __, index) => {
        const currentPage = pagination?.current || 1;
        const pageSize = pagination?.pageSize || 10;
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
      title: t.factory,
      dataIndex: "factoryName",
      width: 120,
      render: (text) => <div style={{ padding: "4px", minHeight: "24px" }}>{text || "-"}</div>,
    },
    {
      title: lang === 'vi' ? 'Thiết bị' : '设备',
      dataIndex: "deviceName",
      width: 120,
      render: (text) => <div style={{ padding: "4px", minHeight: "24px" }}>{text || "-"}</div>,
    },
    {
      title: t.handler,
      dataIndex: "userFullName",
      width: 150,
      render: (text) => <div style={{ padding: "4px", minHeight: "24px" }}>{text || "-"}</div>,
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
      width: 350,
      render: (text) => (
        <div style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          wordBreak: "break-word",
          maxWidth: "420px",
          lineHeight: "1.5"
        }}>
          {text || "-"}
        </div>
      ),
    },
    {
      title: t.status,
      dataIndex: "status",
      width: 120,
      render: (status) => {
        const colorMap = {
          0: "default",
          1: "processing",
          2: "success",
          3: "error",
        };
        return <Tag color={colorMap[status] || "default"}>{statusText(status)}</Tag>;
      },
    },
    {
      title: t.action,
      dataIndex: "actionTaken",
      width: 250,
      render: (text) => (
        <div style={{
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          wordBreak: "break-word",
          maxWidth: "300px",
          lineHeight: "1.5"
        }}>
          {text || "-"}
        </div>
      ),
    },
    {
      title: t.completedAt,
      dataIndex: "completedAt",
      width: 180,
      render: (val) => formatDateShortVN(val),
    },
    {
      title: t.collaborator,
      dataIndex: "collaborator",
      width: 150,
      render: (text) => {
        const display = formatCollaboratorDisplay(text);
        return <div style={{ padding: "4px", minHeight: "24px" }}>{display || "-"}</div>;
      },
    },
    {
      title: t.actions,
      key: "action",
      fixed: "right",
      width: 200,
      align: "center",
      render: (_, record) => {
        // Kiểm tra xem có thể đổi trạng thái không
        // Nếu quá 7 ngày kể từ ngày hoàn thành và không phải admin thì disable
        let canChangeStatus = true;
        if (!isAdmin && record.completedAt) {
          const completedDate = dayjs(record.completedAt);
          const now = dayjs();
          const daysDiff = now.diff(completedDate, 'day');
          if (daysDiff > 7) {
            canChangeStatus = false;
          }
        }

        return (
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Button
              icon={<EyeOutlined style={{ fontSize: "14px" }} />}
              size="middle"
              onClick={() => setViewRecord(record)}
              style={{ minWidth: "36px", height: "36px" }}
              title={t.viewDetail}
            />
            <Button
              icon={<SwapOutlined style={{ fontSize: "14px" }} />}
              size="middle"
              onClick={() => handleChangeStatus(record)}
              style={{ minWidth: "36px", height: "36px" }}
              title={canChangeStatus ? t.changeStatus : (lang === 'vi' ? 'Không thể đổi trạng thái sau 7 ngày kể từ ngày hoàn thành' : '完成日期后7天无法更改状态')}
              disabled={!canChangeStatus}
            />
            {isAdmin && (
              <Button
                icon={<MailOutlined style={{ fontSize: "14px" }} />}
                size="middle"
                style={{ minWidth: "36px", height: "36px" }}
                title={t.mail}
                disabled
              />
            )}
            {isAdmin && (
              <Button
                icon={<DeleteOutlined style={{ fontSize: "14px" }} />}
                size="middle"
                danger
                onClick={() => handleDeleteSyslog(record)}
                style={{ minWidth: "36px", height: "36px" }}
                title={lang === 'vi' ? 'Xóa syslog' : '删除 syslog'}
              />
            )}
          </div>
        );
      },
    },
  ];

  // Backend đã filter counts rồi, chỉ cần dùng trực tiếp
  const displayCounts = useMemo(() => {
    return counts || {};
  }, [counts]);

  // Dữ liệu đã được filter và pagination ở backend
  const filteredData = allData;

  const severitiesToShow = useMemo(() => {
    return (visibleSeverities && visibleSeverities.length > 0) ? visibleSeverities : severityList;
  }, [visibleSeverities]);

  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      const tableData = filteredData.map((row, index) => {
        const stt = ((pagination.current - 1) * pagination.pageSize) + index + 1;
        const statusDisplay = statusText(row.status);
        return `
          <tr>
            <td style="text-align: center;">${stt}</td>
            <td style="text-align: left;">${formatDateShortVN(row.createdDate)}</td>
            <td style="text-align: left;">${row.factoryName || '-'}</td>
            <td style="text-align: left;">${row.deviceName || '-'}</td>
            <td style="text-align: left;">${row.userFullName || '-'}</td>
            <td style="text-align: center;">${row.severity || '-'}</td>
            <td style="text-align: left;">${row.hostname || '-'}</td>
            <td style="text-align: left;">${(row.logText || '-').substring(0, 100)}${(row.logText || '').length > 100 ? '...' : ''}</td>
            <td style="text-align: center;">${statusDisplay}</td>
            <td style="text-align: left;">${(row.actionTaken || '-').substring(0, 100)}${(row.actionTaken || '').length > 100 ? '...' : ''}</td>
            <td style="text-align: left;">${formatDateShortVN(row.completedAt)}</td>
            <td style="text-align: left;">${formatCollaboratorDisplay(row.collaborator) || '-'}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Danh sách Syslog</title>
          <style>
            @page { 
              margin: 0;
              size: landscape;
            }
            @media print {
              html, body {
                margin: 0 !important;
                padding: 0 !important;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
            }
            h1 { 
              text-align: center; 
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 30px;
              margin-top: 20px;
              color: #000;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
              font-size: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px;
              text-align: left;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Danh sách Syslog</h1>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Ngày tạo</th>
                <th>Khu vực</th>
                <th>Thiết bị</th>
                <th>Người phụ trách</th>
                <th>Cấp độ</th>
                <th>Hostname</th>
                <th>Log</th>
                <th>Trạng thái</th>
                <th>Cách xử lý</th>
                <th>Ngày hoàn thành</th>
                <th>Người phối hợp</th>
              </tr>
            </thead>
            <tbody>
              ${tableData}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      notification.error({
        message: t.systemTitle,
        description: t.downloadError + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        'STT',
        t.createdDate,
        t.factory,
        (lang === 'vi' ? 'Thiết bị' : '设备'),
        t.handler,
        t.severity,
        t.hostname,
        t.log,
        t.status,
        t.action,
        t.completedAt,
        t.collaborator
      ];

      const escapeCSV = (str) => {
        if (!str) return '';
        const s = String(str);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const csvRows = [
        headers.join(','),
        ...filteredData.map((row, index) => {
          const stt = ((pagination.current - 1) * pagination.pageSize) + index + 1;
          const statusDisplay = statusText(row.status);
          return [
            stt,
            formatDateShortVN(row.createdDate),
            escapeCSV(row.factoryName || ''),
            escapeCSV(row.deviceName || ''),
            escapeCSV(row.userFullName || ''),
            escapeCSV(row.severity || ''),
            escapeCSV(row.hostname || ''),
            escapeCSV(row.logText || ''),
            escapeCSV(statusDisplay),
            escapeCSV(row.actionTaken || ''),
            formatDateShortVN(row.completedAt),
            escapeCSV(formatCollaboratorDisplay(row.collaborator) || '')
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `syslog_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notification.success({
        message: t.successTitle,
        description: t.exportExcel,
        placement: "bottomRight",
      });
    } catch (error) {
      notification.error({
        message: t.systemTitle,
        description: t.exportError + error.message,
        placement: 'bottomRight'
      });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex',
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff1f0',
          color: '#ff4d4f',
          borderRadius: 8
        }}>
          <BugOutlined />
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{t.pageTitle}</h2>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "4px",
            width: "fit-content",
          }}
        >
          {severitiesToShow.map((sev) => (
            <button
              key={sev}
              onClick={() => setActiveSeverity(sev)}
              style={{
                padding: "8px 20px",
                border: "none",
                background: activeSeverity === sev ? "#f5f5f5" : "transparent",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: activeSeverity === sev ? 500 : 400,
                color: activeSeverity === sev ? "#333" : "#666",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (activeSeverity !== sev) {
                  e.currentTarget.style.background = "#fafafa";
                }
              }}
              onMouseLeave={(e) => {
                if (activeSeverity !== sev) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <span>{sev}</span>
              <span>{displayCounts[sev] || 0}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'pdf',
                  label: t.exportPdf,
                  icon: <FilePdfOutlined />,
                  onClick: () => handleExportPDF()
                },
                {
                  key: 'excel',
                  label: t.exportExcel,
                  icon: <FileExcelOutlined />,
                  onClick: () => handleExportExcel()
                }
              ]
            }}
            trigger={['click']}
          >
            <Button icon={<DownloadOutlined />}>
              {t.export}
            </Button>
          </Dropdown>
          {isAdmin && (
            <Button
              icon={<MailOutlined />}
              onClick={() => {
                if (activeSeverity) {
                  setSelectedSeverityForMail(activeSeverity);
                  setMailConfigVisible(true);
                } else {
                  notification.warning({
                    message: lang === 'vi' ? 'Thông báo' : '通知',
                    description: lang === 'vi' ? 'Vui lòng chọn một cấp độ syslog để cấu hình email' : '请选择一个 syslog 级别来配置邮件',
                    placement: 'bottomRight'
                  });
                }
              }}
            >
              {t.mail}
            </Button>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      {/* Filter Section */}
      <div className="page-filter" style={{ marginBottom: 16, padding: 12, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8 }}>
        <div className="page-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space wrap>
            <Input
              placeholder={t.searchPlaceholder}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <DatePicker.RangePicker
              placeholder={t.datePlaceholder}
              value={dateRange}
              onChange={(vals) => setDateRange(vals || [])}
              style={{ width: 240 }}
              format="DD/MM/YYYY"
            />
            <Select
              placeholder={t.filterFactory}
              value={factoryFilter}
              onChange={setFactoryFilter}
              style={{ width: 160 }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={getFactoryOptions}
            >
            </Select>
            <Select
              placeholder={t.filterStatus}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              allowClear
            >
              <Select.Option value={0}>Chờ xử lý</Select.Option>
              <Select.Option value={1}>Đang xử lý</Select.Option>
              <Select.Option value={2}>Hoàn thành</Select.Option>
              <Select.Option value={3}>Đã hủy</Select.Option>
            </Select>
            <Select
              placeholder={lang === 'vi' ? 'Lọc theo thiết bị' : '按设备筛选'}
              value={deviceFilter}
              onChange={(val) => {
                setDeviceFilter(val);
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
              style={{ width: 160 }}
              allowClear
              options={getDeviceOptions}
            />
            <Button onClick={() => {
              setSearchText("");
              setDateRange([]);
              setFactoryFilter(undefined);
              setStatusFilter(undefined);
              setDeviceFilter(undefined);
            }}>
              {t.clearFilters}
            </Button>
            <Button
              icon={<SwapOutlined />}
              onClick={() => {
                if (allData.length === 0) {
                  notification.warning({
                    message: lang === 'vi' ? 'Thông báo' : '通知',
                    description: lang === 'vi' ? 'Không có syslog nào để cập nhật' : '没有可更新的 syslog',
                    placement: 'bottomRight'
                  });
                  return;
                }

                // Kiểm tra nếu có syslog đã hoàn thành (status = 2) trong danh sách
                const hasCompletedSyslog = allData.some(record => record.status === 2);
                if (hasCompletedSyslog) {
                  notification.warning({
                    message: lang === 'vi' ? 'Thông báo' : '通知',
                    description: lang === 'vi'
                      ? 'Không thể đổi trạng thái hàng loạt syslog đã hoàn thành.'
                      : '无法批量更改已完成的 syslog 状态。',
                    placement: 'bottomRight'
                  });
                  return;
                }

                // Kiểm tra nếu có syslog quá 7 ngày kể từ ngày hoàn thành (chỉ áp dụng cho user thường, admin không bị chặn)
                if (!isAdmin) {
                  const now = dayjs();
                  const hasExpiredSyslog = allData.some(record => {
                    if (record.completedAt) {
                      const completedDate = dayjs(record.completedAt);
                      const daysDiff = now.diff(completedDate, 'day');
                      return daysDiff > 7;
                    }
                    return false;
                  });

                  if (hasExpiredSyslog) {
                    notification.warning({
                      message: lang === 'vi' ? 'Thông báo' : '通知',
                      description: lang === 'vi'
                        ? 'Không thể đổi trạng thái. Có syslog đã quá 7 ngày kể từ ngày hoàn thành.'
                        : '无法更改状态。有 syslog 已完成超过 7 天。',
                      placement: 'bottomRight'
                    });
                    return;
                  }
                }

                batchStatusForm.resetFields();
                setBatchStatusModalVisible(true);
              }}
            >
              {t.changeStatusBatch}
            </Button>
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        <Table
          className="syslog-table"
          rowKey="id"
          columns={columns}
          dataSource={filteredData}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t.total(total),
            onChange: handlePaginationChange,
            onShowSizeChange: handlePageSizeChange,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Spin>

      <Modal
        title={t.editModalTitle}
        open={statusModalVisible}
        onOk={handleStatusModalOk}
        onCancel={handleStatusModalCancel}
        okText={t.okText}
        cancelText={t.cancelText}
        width={600}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="factoryName"
            label={t.factory}
          >
            <Select
              placeholder="Chọn khu vực"
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={getFactoryOptions}
              notFoundContent={null}
            />
          </Form.Item>
          <Form.Item
            name="userFullName"
            label={t.handler}
          >
            <Select
              mode="tags"
              placeholder={t.handlerPlaceholder}
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={createCollaboratorOptions()}
              listHeight={240}
              tokenSeparators={[',']}
            />
          </Form.Item>
          <Form.Item
            name="collaborator"
            label={t.collaborator}
          >
            <Select
              mode="tags"
              placeholder={t.collaboratorPlaceholder}
              showSearch
              allowClear
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={createCollaboratorOptions()}
              listHeight={240}
              tokenSeparators={[',']}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label={t.status}
          >
            <Select style={{ width: "100%" }}>
              <Select.Option value={0}>{t.statusOptions[0]}</Select.Option>
              <Select.Option value={1}>{t.statusOptions[1]}</Select.Option>
              <Select.Option value={2}>{t.statusOptions[2]}</Select.Option>
              <Select.Option value={3}>{t.statusOptions[3]}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="actionTaken"
            label={t.action}
          >
            <Input.TextArea
              placeholder={t.actionTakenPlaceholder}
              rows={3}
              style={{ resize: "vertical" }}
            />
          </Form.Item>
          <Form.Item label={t.uploadLabel}>
            <Upload
              multiple
              showUploadList={false}
              beforeUpload={async (file) => {
                const { validateFileSizeAsync } = await import('../utils/fileUtils');
                const validation = await validateFileSizeAsync(file, 'vi');
                return false;
              }}
              onChange={async (info) => {
                const { validateFileSizeAsync } = await import('../utils/fileUtils');
                const { fileList } = info;

                const newFiles = fileList.filter(f => f.originFileObj);
                const checks = await Promise.all(newFiles.map(async (f) => ({
                  f,
                  validation: await validateFileSizeAsync(f.originFileObj, 'vi')
                })));

                checks.filter(c => !c.validation.isValid).forEach(c => {
                  notification.error({
                    message: "Lỗi",
                    description: c.validation.errorMessage,
                    placement: "bottomRight",
                  });
                });

                const mapped = checks
                  .filter(c => c.validation.isValid)
                  .map(c => ({ uid: c.f.uid, name: c.f.name, originFileObj: c.f.originFileObj }));

                setFiles(prevFiles => {
                  const existingNames = prevFiles.map(f => f.name);
                  const uniqueNewFiles = mapped.filter(f => !existingNames.includes(f.name));
                  return [...prevFiles, ...uniqueNewFiles];
                });
              }}
            >
              <Button icon={<UploadOutlined />}>Chọn tài liệu</Button>
            </Upload>

            {(existingFiles?.length > 0 || files?.length > 0) && (
              <List
                style={{ marginTop: 12 }}
                size="small"
                bordered
                dataSource={[
                  ...existingFiles.map(f => ({ ...f, isExisting: true })),
                  ...files.map(f => ({ ...f, name: f.name, isExisting: false }))
                ]}
                renderItem={(item, index) => (
                  <List.Item
                    actions={item.isExisting ? [
                      <Button
                        key="view"
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewFile(item.filePath, item.fileName)}
                        title="Xem/Tải file"
                      />,
                      <Button
                        key="delete"
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeFile(item.id)}
                        title="Xóa file"
                      />
                    ] : [
                      <Button
                        key="delete"
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          Modal.confirm({
                            title: t.delete,
                            content: t.fileConfirmDelete(item.name || 'file'),
                            okText: t.delete,
                            cancelText: t.cancelText,
                            okType: 'danger',
                            onOk: () => {
                              setFiles(files.filter(f => f.uid !== item.uid));
                              notification.success({
                                message: t.successTitle,
                                description: t.fileDeleted,
                                placement: "bottomRight",
                              });
                            },
                          });
                        }}
                        title="Xóa file"
                      />
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Typography.Text style={{ fontSize: 12 }}>
                          <Tag color={item.isExisting ? "blue" : "green"} style={{ marginRight: 8 }}>
                            #{index + 1}
                          </Tag>
                          {item.fileName || item.name}
                        </Typography.Text>
                      }
                      description={
                        item.isExisting && item.fileSize && (
                          <div style={{ fontSize: 10, color: '#666' }}>
                            {formatFileSize(item.fileSize)}
                          </div>
                        )
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t.viewModalTitle}
        open={!!viewRecord}
        onCancel={() => setViewRecord(null)}
        footer={[
          <Button key="close" onClick={() => setViewRecord(null)}>
            {t.close}
          </Button>
        ]}
        width={700}
      >
        {viewRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t.factory}>{viewRecord.factoryName || t.notFound}</Descriptions.Item>
            <Descriptions.Item label={t.handler}>{viewRecord.userFullName || t.notFound}</Descriptions.Item>
            <Descriptions.Item label={t.severity}>
              <Tag color="default" style={{ background: "#f5f5f5", borderColor: "#d9d9d9", color: "#000" }}>
                {viewRecord.severity || t.notFound}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t.hostname}>{viewRecord.hostname || t.notFound}</Descriptions.Item>
            <Descriptions.Item label={t.log}>
              <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                {viewRecord.logText || t.notFound}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label={t.createdDate}>
              {formatDateShortVN(viewRecord.createdDate)}
            </Descriptions.Item>
            <Descriptions.Item label={t.status}>
              <Tag color={
                viewRecord.status === 0 ? "default" :
                  viewRecord.status === 1 ? "processing" :
                    viewRecord.status === 2 ? "success" :
                      viewRecord.status === 3 ? "error" : "default"
              }>
                {statusText(viewRecord.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t.action}>{viewRecord.actionTaken || t.notFound}</Descriptions.Item>
            <Descriptions.Item label={t.completedAt}>
              {formatDateShortVN(viewRecord.completedAt)}
            </Descriptions.Item>
            <Descriptions.Item label={t.collaborator}>{formatCollaboratorDisplay(viewRecord.collaborator) || t.notFound}</Descriptions.Item>
            <Descriptions.Item label={t.lastEditor}>{getLastEditorDisplay(viewRecord.lastEditedBy)}</Descriptions.Item>
            <Descriptions.Item label={t.uploadLabel}>
              {Array.isArray(viewRecord.files) && viewRecord.files.length > 0 ? (
                <List
                  size="small"
                  bordered
                  dataSource={viewRecord.files}
                  renderItem={(file, index) => (
                    <List.Item
                      actions={[
                        <Button
                          key="download"
                          type="link"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(file.filePath, file.fileName)}
                          title="Tải xuống"
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Typography.Text style={{ fontSize: 13 }}>
                            {file.fileName || 'file'}
                          </Typography.Text>
                        }
                        description={
                          file.fileSize && (
                            <div style={{ fontSize: 11, color: '#666' }}>
                              {formatFileSize(file.fileSize)}
                            </div>
                          )
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <SyslogMailSettings
        severity={selectedSeverityForMail}
        visible={mailConfigVisible}
        onCancel={() => {
          setMailConfigVisible(false);
          setSelectedSeverityForMail(null);
        }}
      />

      <Modal
        title={t.changeStatusBatchTitle}
        open={batchStatusModalVisible}
        onOk={handleBatchStatusModalOk}
        onCancel={handleBatchStatusModalCancel}
        okText={t.okText}
        cancelText={t.cancelText}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            {lang === 'vi'
              ? <>Bạn đang cập nhật trạng thái cho <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{pagination.total || 0}</span> syslog đang được lọc (theo các bộ lọc hiện tại).</>
              : <>您正在更新 <span style={{ fontWeight: 'bold', color: '#ff4d4f' }}>{pagination.total || 0}</span> 个已筛选的 syslog 的状态（根据当前筛选条件）。</>}
          </Typography.Text>
        </div>
        <Form form={batchStatusForm} layout="vertical">
          <Form.Item
            name="status"
            label={t.status}
            rules={[{ required: true, message: lang === 'vi' ? 'Vui lòng chọn trạng thái' : '请选择状态' }]}
          >
            <Select style={{ width: "100%" }}>
              <Select.Option value={0}>{t.statusOptions[0]}</Select.Option>
              <Select.Option value={1}>{t.statusOptions[1]}</Select.Option>
              <Select.Option value={2}>{t.statusOptions[2]}</Select.Option>
              <Select.Option value={3}>{t.statusOptions[3]}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="actionTaken"
            label={t.action}
          >
            <Input.TextArea
              placeholder={t.actionTakenPlaceholder}
              rows={4}
              style={{ resize: "vertical" }}
            />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
}

export default SyslogPage;


