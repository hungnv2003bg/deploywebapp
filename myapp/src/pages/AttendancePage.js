import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  TimePicker,
  DatePicker,
  Select,
  Pagination,
  message,
  notification,
  Card,
  Row,
  Col,
  Statistic,
  Avatar,
  Popconfirm,
  Switch,
  Dropdown,
  Tooltip,
  InputNumber,
} from "antd";
import {
  ClockCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  StarOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  DashboardOutlined,
  TeamOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";
import attendanceService from "../services/attendanceService";
import PersonIcon from "../components/PersonIcon";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;
const { TextArea } = Input;

function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userAttendanceList, setUserAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUserAttendance, setLoadingUserAttendance] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, attendance, tracking
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [groupFilter, setGroupFilter] = useState(undefined);
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);
  // Pagination states for present and absent lists
  const [presentPage, setPresentPage] = useState(1);
  const [absentPage, setAbsentPage] = useState(1);
  const PAGE_SIZE = 6;
  // Pagination state for attendance table
  const [attendancePagination, setAttendancePagination] = useState({
    current: 1,
    pageSize: 10,
  });
  // Pagination state for tracking table
  const [trackingPagination, setTrackingPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [overtimeSummary, setOvertimeSummary] = useState(null);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [overtimeMonth, setOvertimeMonth] = useState(dayjs());
  const [overtimeTarget, setOvertimeTarget] = useState(null);
  const [overtimePagination, setOvertimePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [overtimeSearchText, setOvertimeSearchText] = useState("");
  const [overtimeGroupFilter, setOvertimeGroupFilter] = useState(undefined);
  const [overtimeEmployeePage, setOvertimeEmployeePage] = useState([]);
  const [plannedOvertimeDataByDate, setPlannedOvertimeDataByDate] = useState({});
  // State để lưu dữ liệu overtime theo từng ngày (key: userId_date, value: hours)
  const [overtimeDataByDate, setOvertimeDataByDate] = useState({});
  // State để lưu attendance reports trong tháng (để lấy dữ liệu theo từng ngày)
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState([]);
  const [overtimeTargetByUser, setOvertimeTargetByUser] = useState({});
  const [actualSummaryByUser, setActualSummaryByUser] = useState({});
  // Tracking filters
  const [trackingSearchText, setTrackingSearchText] = useState("");
  const [trackingGroupFilter, setTrackingGroupFilter] = useState(undefined);
  const [trackingActiveFilter, setTrackingActiveFilter] = useState(undefined);
  const [filteredTrackingList, setFilteredTrackingList] = useState([]);
  const { lang } = useLanguage();
  const { quyenList, nguoiDung } = useSelector((state) => state.user) || {};

  // Quyền thêm mới/chỉnh sửa - chỉ admin và manager
  const hasAddPermission = useMemo(() => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some(
      (role) =>
        role === "ADMIN" ||
        role === "MANAGER" ||
        role === "ROLE_ADMIN" ||
        role === "ROLE_MANAGER"
    );
  }, [quyenList]);

  // Quyền admin (dùng riêng cho phần Tăng ca)
  const isAdmin = useMemo(() => {
    if (!quyenList || quyenList.length === 0) return false;
    return quyenList.some((role) => role === "ADMIN" || role === "ROLE_ADMIN");
  }, [quyenList]);

  // Lấy userID của user hiện tại
  const currentUserId = nguoiDung?.userID;

  // Kiểm tra xem user có thể chỉnh sửa record này không
  // Admin/Manager: full quyền
  // User thường: chỉ được sửa chính mình
  const canEditRecord = (record) => {
    if (hasAddPermission) return true; // Admin/Manager có full quyền
    
    // User thường chỉ được sửa chính mình
    const recordUserId = record.user?.userID || record.userId;
    return currentUserId && recordUserId && currentUserId === recordUserId;
  };

  // Kiểm tra quyền chỉnh sửa dữ liệu Tăng ca theo userId mục tiêu
  // Yêu cầu: chỉ Admin hoặc chính chủ tài khoản
  const canEditOvertimeForUser = (userId) => {
    if (isAdmin) return true;
    return currentUserId && userId && currentUserId === userId;
  };

  // Tất cả users đều có thể xem danh sách theo dõi
  const hasTrackingAccess = true;

  const labels = {
    vi: {
      title: "Attendance",
      date: "Ngày",
      employee: "Nhân viên",
      area: "Nhóm",
      status: "Trạng thái",
      clockIn: "Giờ vào",
      clockOut: "Giờ ra",
      note: "Ghi chú",
      action: "Thao tác",
      edit: "Sửa",
      present: "Có mặt",
      halfDay: "Nửa ngày",
      absent: "Vắng mặt",
      late: "Đi muộn",
      leave: "Nghỉ phép",
      weekendOff: "Nghỉ CN",
      addNew: "Thêm mới",
      addEmployee: "Thêm nhân viên",
      addEmployeeDescription: "Chọn nhân viên (có thể nhiều) để thêm vào danh sách theo dõi điểm danh",
      addSuccess: "Đã thêm nhân viên",
      addError: "Không thể tạo điểm danh cho nhân viên",
      summary: "Tổng quan",
      presentCount: "Có mặt",
      halfDayCount: "Nửa ngày",
      absentCount: "Vắng",
      leaveCount: "Nghỉ phép",
      editAttendance: "Chỉnh sửa điểm danh",
      statusRequired: "Vui lòng chọn trạng thái",
      userRequired: "Vui lòng chọn nhân viên",
      dateRequired: "Vui lòng chọn ngày",
      saveSuccess: "Đã lưu thông tin điểm danh",
      saveError: "Không thể lưu thông tin điểm danh",
      loadError: "Không thể tải dữ liệu điểm danh",
      cannotLoadUsers: "Không thể tải danh sách nhân viên",
      employeeList: "Danh sách nhân viên",
      attendanceBoard: "Điểm danh",
      trackingList: "Danh sách theo dõi",
      dashboard: "Tổng quan",
      isActive: "Hoạt động",
      shift: "Ca",
      shiftDay: "Ngày",
      shiftNight: "Đêm",
      removeConfirm: "Bạn có chắc chắn muốn xóa nhân viên này khỏi danh sách theo dõi?",
      removeSuccess: "Đã xóa nhân viên khỏi danh sách theo dõi",
      removeError: "Không thể xóa nhân viên khỏi danh sách",
      updateSuccess: "Đã cập nhật thông tin",
      updateError: "Không thể cập nhật thông tin",
      cannotLoadTrackingList: "Không thể tải danh sách theo dõi",
      exportPrint: "Xuất/In",
      exportPDF: "In PDF",
      exportExcel: "Xuất Excel",
      overtimeTab: "Tăng ca",
      overtimeMonthLabel: "Tháng",
      overtimeTargetLabel: "Số giờ tăng ca quy định trong tháng",
      overtimeSave: "Lưu",
      overtimeLoadError: "Không thể tải dữ liệu tăng ca",
      overtimeSaveError: "Không thể lưu giờ tăng ca quy định",
      overtimeSaveSuccess: "Đã lưu giờ tăng ca quy định",
    },
    zh: {
      title: "考勤表",
      date: "日期",
      employee: "员工",
      area: "组",
      status: "状态",
      clockIn: "上班时间",
      clockOut: "下班时间",
      note: "备注",
      action: "操作",
      edit: "编辑",
      present: "出勤",
      halfDay: "半天",
      absent: "缺勤",
      late: "迟到",
      leave: "请假",
      weekendOff: "周日休",
      addNew: "新增",
      addEmployee: "添加员工",
      addEmployeeDescription: "选择一个或多个员工添加到考勤跟踪列表。系统将自动生成每日考勤记录，并预先创建未来7天的记录，默认状态为'出勤'",
      addSuccess: "已成功为员工创建7天考勤记录",
      addError: "无法为员工创建考勤记录",
      summary: "总览",
      presentCount: "出勤",
      halfDayCount: "半天",
      absentCount: "缺勤",
      leaveCount: "请假",
      editAttendance: "编辑考勤",
      statusRequired: "请选择状态",
      userRequired: "请选择员工",
      dateRequired: "请选择日期",
      saveSuccess: "已保存考勤信息",
      saveError: "无法保存考勤信息",
      loadError: "无法加载考勤数据",
      cannotLoadUsers: "无法加载员工列表",
      employeeList: "员工列表",
      attendanceBoard: "考勤表",
      trackingList: "跟踪列表",
      dashboard: "总览",
      isActive: "正在跟踪",
      shift: "班次",
      shiftDay: "日班",
      shiftNight: "夜班",
      removeConfirm: "您确定要从跟踪列表中删除此员工吗？",
      removeSuccess: "已从跟踪列表中删除员工",
      removeError: "无法从跟踪列表中删除员工",
      updateSuccess: "已更新信息",
      updateError: "无法更新信息",
      cannotLoadTrackingList: "无法加载跟踪列表",
      exportPrint: "导出/打印",
      exportPDF: "打印PDF",
      exportExcel: "导出Excel",
      overtimeTab: "加班",
      overtimeMonthLabel: "月份",
      overtimeTargetLabel: "当月加班目标小时数",
      overtimeSave: "保存",
      overtimeLoadError: "无法加载加班数据",
      overtimeSaveError: "无法保存当月加班目标",
      overtimeSaveSuccess: "已保存当月加班目标",
    },
  };

  const t = labels[lang];

  const activeTrackedUserIds = new Set(
    (userAttendanceList || [])
      .filter((item) => item && item.isActive)
      .map((item) => item.user?.userID ?? item.userId)
  );

  // Tính toán thống kê
  const calculateStats = () => {
    const stats = {
      present: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
      weekendLeave: 0,
    };

    const isActiveRecord = (record) => {
      const uid = record.user?.userID || record.userId;
      return activeTrackedUserIds.has(uid);
    };

    attendanceData.filter(isActiveRecord).forEach((record) => {
      const status = record.status || "";
      if (status.includes("Có mặt") || status.includes("出勤")) {
        stats.present++;
      } else if (status.includes("Nửa ngày") || status.includes("半天")) {
        stats.halfDay++;
      } else if (status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤")) {
        stats.absent++;
      } else if (status.includes("Nghỉ CN") || status.includes("周日休")) {
        stats.weekendLeave++;
      } else if (status.includes("Nghỉ phép") || status.includes("请假")) {
        stats.leave++;
      }
    });

    return stats;
  };

  const stats = calculateStats();

  const activeAttendanceData = attendanceData.filter(
    (record) => activeTrackedUserIds.has(record.user?.userID || record.userId)
  );

  // Calculate stats from filtered data
  const calculateFilteredStats = () => {
    const filteredStats = {
      present: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
      weekendLeave: 0,
    };

    filteredAttendanceData.forEach((record) => {
      const status = record.status || "";
      if (status.includes("Có mặt") || status.includes("出勤")) {
        filteredStats.present++;
      } else if (status.includes("Nửa ngày") || status.includes("半天")) {
        filteredStats.halfDay++;
      } else if (status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤")) {
        filteredStats.absent++;
      } else if (status.includes("Nghỉ CN") || status.includes("周日休")) {
        filteredStats.weekendLeave++;
      } else if (status.includes("Nghỉ phép") || status.includes("请假")) {
        filteredStats.leave++;
      }
    });

    return filteredStats;
  };

  const filteredStats = calculateFilteredStats();

  function collectGroups(groupsValue) {
    if (!groupsValue) return [];
    if (Array.isArray(groupsValue)) return groupsValue;
    if (groupsValue instanceof Set) return Array.from(groupsValue);
    if (groupsValue.size !== undefined) return Array.from(groupsValue);
    return [];
  }

  function getUserGroup(user) {
    if (!user) return "-";
    const foundUser = typeof user === "object" ? user : users.find((u) => u.userID === user);
    if (!foundUser) return "-";

    let userGroups = collectGroups(foundUser.groups);
    if (userGroups.length === 0) {
      const fromUsers = users.find((u) => u.userID === foundUser.userID);
      userGroups = collectGroups(fromUsers?.groups);
    }

    if (userGroups.length > 0) {
      const firstGroup = userGroups[0];
      const byId = groups.find((g) => String(g.id) === String(firstGroup?.id));
      return firstGroup?.name || byId?.name || "-";
    }
    return "-";
  }

  function getUserGroupId(user) {
    if (!user) return null;
    const foundUser = typeof user === "object" ? user : users.find((u) => u.userID === user);
    if (!foundUser) return null;

    let userGroups = collectGroups(foundUser.groups);
    if (userGroups.length === 0) {
      const fromUsers = users.find((u) => u.userID === foundUser.userID);
      userGroups = collectGroups(fromUsers?.groups);
    }

    if (userGroups.length > 0) {
      const firstGroup = userGroups[0];
      if (firstGroup && firstGroup.id !== undefined) return firstGroup.id;
      const byName = groups.find((g) => g.name === firstGroup?.name);
      return byName ? byName.id : null;
    }
    return null;
  }

  function getUserShift(user, record) {
    if (!user) return "-";
    const userId = typeof user === "object" ? (user?.userID || user?.userId) : user;
    if (!userId) return "-";
    
    // Ưu tiên lấy shift từ record trước (nếu có)
    if (record && record.shift) {
      const shift = String(record.shift).trim();
      return shift === "Đêm" ? t.shiftNight : t.shiftDay;
    }
    
    // Fallback: lấy từ userAttendanceList
    const userAttendance = userAttendanceList.find(
      (ua) => {
        const uaUserId = ua.user?.userID || ua.userId;
        // Compare as both string and number to handle type mismatches
        return String(uaUserId) === String(userId) || uaUserId === userId;
      }
    );
    
    if (userAttendance && userAttendance.shift) {
      // Normalize shift value: trim whitespace and handle case
      const shift = String(userAttendance.shift).trim();
      return shift === "Đêm" ? t.shiftNight : t.shiftDay;
    }
    return "-";
  }
  
  function getUserShiftRaw(user, record) {
    if (!user) return null;
    const userId = typeof user === "object" ? (user?.userID || user?.userId) : user;
    if (!userId) return null;
    
    // Ưu tiên lấy shift từ record trước (nếu có)
    if (record && record.shift) {
      return String(record.shift).trim();
    }
    
    // Fallback: lấy từ userAttendanceList
    const userAttendance = userAttendanceList.find(
      (ua) => {
        const uaUserId = ua.user?.userID || ua.userId;
        return String(uaUserId) === String(userId) || uaUserId === userId;
      }
    );
    
    if (userAttendance && userAttendance.shift) {
      return String(userAttendance.shift).trim();
    }
    return "Ngày"; // Default
  }

  // Filtered lists for detailed sections with memoization
  const presentFiltered = useMemo(() => {
    return activeAttendanceData
      .filter((record) => {
        const gid = getUserGroupId(record.user || record.userId);
        return !groupFilter || groupFilter === "all" || String(gid) === String(groupFilter);
      })
      .filter(
        (record) =>
          record.status?.includes("Có mặt") ||
          record.status?.includes("出勤") ||
          record.status?.includes("Đi muộn") ||
          record.status?.includes("迟到") ||
          record.status?.includes("Nửa ngày") ||
          record.status?.includes("半天")
      );
  }, [activeAttendanceData, groupFilter]);

  const absentFiltered = useMemo(() => {
    return activeAttendanceData
      .filter((record) => {
        const gid = getUserGroupId(record.user || record.userId);
        return !groupFilter || groupFilter === "all" || String(gid) === String(groupFilter);
      })
      .filter(
        (record) =>
          record.status?.includes("Vắng") ||
          record.status?.includes("Vắng mặt") ||
          record.status?.includes("缺勤") ||
          record.status?.includes("Nghỉ phép") ||
          record.status?.includes("请假") ||
          record.status?.includes("Nghỉ CN") ||
          record.status?.includes("周日休")
      );
  }, [activeAttendanceData, groupFilter]);

  // Reset page when filters or dataset change
  useEffect(() => {
    setPresentPage(1);
    setAbsentPage(1);
    setAttendancePagination(prev => ({ ...prev, current: 1 }));
  }, [groupFilter, selectedDate, attendanceData, searchText, statusFilter]);

  // Lấy danh sách users
  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users");
      const list = Array.isArray(response.data) ? response.data : [];
      const activeUsers = list.filter((u) => !u.status || u.status === "ACTIVE");
      setUsers(activeUsers);
    } catch (error) {
      message.error({
        content: t.cannotLoadUsers,
        placement: "bottomRight",
      });
    }
  };

  // Lấy danh sách nhân viên đang theo dõi
  const fetchUserAttendanceList = async () => {
    setLoadingUserAttendance(true);
    try {
      const response = await axios.get("/api/user-attendance");
      setUserAttendanceList(response.data || []);
    } catch (error) {
      message.error({
        content: t.cannotLoadTrackingList,
        placement: "bottomRight",
      });
    } finally {
      setLoadingUserAttendance(false);
    }
  };

  // Lấy dữ liệu điểm danh theo ngày
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const data = await attendanceService.getAttendanceByDate(dateStr);
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error({
        content: t.loadError,
        placement: "bottomRight",
      });
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách groups
  const fetchGroups = async () => {
    try {
      const response = await axios.get("/api/groups");
      setGroups(response.data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  useEffect(() => {
    // Tất cả users đều có thể xem danh sách theo dõi
    fetchUserAttendanceList();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  // Filter attendance data
  useEffect(() => {
    let filtered = [...attendanceData];

    // Filter by search text (tên, mã nhân viên)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((record) => {
        const userId = record.user?.userID || record.userId;
        const foundUser = users.find((u) => u.userID === userId);
        if (foundUser) {
          const fullName = (foundUser.fullName || "").toLowerCase();
          const manv = (foundUser.manv || "").toLowerCase();
          return fullName.includes(searchLower) || manv.includes(searchLower);
        }
        return false;
      });
    }

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((record) => {
        const status = record.status || "";
        if (statusFilter === "Có mặt" || statusFilter === "出勤") {
          return status.includes("Có mặt") || status.includes("出勤");
        } else if (statusFilter === "Đi muộn" || statusFilter === "迟到") {
          return status.includes("Đi muộn") || status.includes("迟到");
        } else if (statusFilter === "Nửa ngày" || statusFilter === "半天") {
          return status.includes("Nửa ngày") || status.includes("半天");
        } else if (statusFilter === "Vắng mặt" || statusFilter === "缺勤") {
          return status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤");
        } else if (statusFilter === "Nghỉ phép" || statusFilter === "请假") {
          return status.includes("Nghỉ phép") || status.includes("请假");
        } else if (statusFilter === "Nghỉ CN" || statusFilter === "周日休") {
          return status.includes("Nghỉ CN") || status.includes("周日休");
        }
        return false;
      });
    }

    // Filter by group
    if (groupFilter && groupFilter !== 'all') {
      filtered = filtered.filter((record) => {
        const userId = record.user?.userID || record.userId;
        const foundUser = users.find((u) => u.userID === userId);
        if (foundUser && foundUser.groups) {
          let userGroups = [];
          if (Array.isArray(foundUser.groups)) {
            userGroups = foundUser.groups;
          } else if (foundUser.groups instanceof Set) {
            userGroups = Array.from(foundUser.groups);
          } else if (foundUser.groups.size !== undefined) {
            userGroups = Array.from(foundUser.groups);
          }
          return userGroups.some((g) => String(g.id) === String(groupFilter));
        }
        return false;
      });
    }

    setFilteredAttendanceData(filtered);
  }, [attendanceData, searchText, statusFilter, groupFilter, users]);

  // Lọc danh sách theo dõi theo tìm kiếm, nhóm và trạng thái hoạt động
  useEffect(() => {
    let filtered = [...userAttendanceList];

    if (trackingSearchText && trackingSearchText.trim() !== "") {
      const keyword = trackingSearchText.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const user = item.user || {};
        const name = (user.fullName || "").toLowerCase();
        const manv = (user.manv || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return name.includes(keyword) || manv.includes(keyword) || email.includes(keyword);
      });
    }

    if (trackingGroupFilter) {
      filtered = filtered.filter((item) => {
        const gid = getUserGroupId(item.user || item.userId);
        return String(gid) === String(trackingGroupFilter);
      });
    }

    if (trackingActiveFilter) {
      filtered = filtered.filter((item) => {
        if (trackingActiveFilter === 'active') return !!item.isActive;
        if (trackingActiveFilter === 'inactive') return !item.isActive;
        return true;
      });
    }

    setFilteredTrackingList(filtered);
  }, [userAttendanceList, trackingSearchText, trackingGroupFilter, trackingActiveFilter, users, groups]);

  useEffect(() => {
    if (activeTab !== "overtime") {
      return;
    }
    const fetchOvertime = async () => {
      try {
        setOvertimeLoading(true);
        const year = overtimeMonth.year();
        const month = overtimeMonth.month() + 1;
        const userIds = Array.from(
          (userAttendanceList || [])
            .filter((item) => item && item.isActive)
            .map((item) => item.user?.userID ?? item.userId)
        );
        const params = { year, month };
        if (userIds.length > 0) {
          params.userIds = userIds.join(",");
        }
        const response = await axios.get("/api/overtime/month-summary", { params });
        const data = response.data || null;
        setOvertimeSummary(data);
        if (data && Array.isArray(data.users)) {
          const map = {};
          data.users.forEach((u) => {
            if (u && u.userId != null) {
              map[u.userId] = {
                weekdayHours: Number(u.weekdayHours || 0),
                sundayHours: Number(u.sundayHours || 0),
                totalHours: Number(u.totalHours || 0),
              };
            }
          });
          setActualSummaryByUser(map);
        } else {
          setActualSummaryByUser({});
        }
        if (data && data.targetHours !== undefined && data.targetHours !== null) {
          setOvertimeTarget(Number(data.targetHours));
        } else {
          setOvertimeTarget(null);
        }
      } catch (error) {
        message.error({
          content: t.overtimeLoadError,
          placement: "bottomRight",
        });
        setOvertimeSummary(null);
        setActualSummaryByUser({});
      } finally {
        setOvertimeLoading(false);
      }
    };
    
    const fetchMonthlyAttendance = async () => {
      try {
        const year = overtimeMonth.year();
        const month = overtimeMonth.month() + 1;
        const startDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
        const endDate = dayjs(`${year}-${String(month).padStart(2, '0')}-${dayjs(overtimeMonth).daysInMonth()}`).format('YYYY-MM-DD');
        const response = await axios.get("/api/attendance/range", {
          params: { startDate, endDate }
        });
        const data = response.data || [];
        setMonthlyAttendanceData(data);
        
        // Khởi tạo overtimeDataByDate và plannedOvertimeDataByDate từ attendance data
        const overtimeMap = {};
        const plannedOvertimeMap = {};
        data.forEach((record) => {
          if (record.user?.userID && record.attendanceDate) {
            const key = `${record.user.userID}_${record.attendanceDate}`;
            // Nếu có overtimeHours từ API thì dùng, nếu null thì = 0 (không tự tính ở FE)
            if (record.overtimeHours !== undefined && record.overtimeHours !== null) {
              overtimeMap[key] = Number(record.overtimeHours);
            } else {
              overtimeMap[key] = 0;
            }
            if (record.plannedOvertimeHours !== undefined && record.plannedOvertimeHours !== null) {
              plannedOvertimeMap[key] = Number(record.plannedOvertimeHours);
            } else {
              plannedOvertimeMap[key] = 0;
            }
          }
        });
        setOvertimeDataByDate(overtimeMap);
        setPlannedOvertimeDataByDate(plannedOvertimeMap);
      } catch (error) {
        console.error("Error fetching monthly attendance:", error);
      }
    };
    
    if (activeTab === "overtime") {
      fetchOvertime();
      fetchMonthlyAttendance();
    }
  }, [
    activeTab,
    overtimeMonth,
    userAttendanceList,
    t.overtimeLoadError,
  ]);

  useEffect(() => {
    if (activeTab !== "overtime") {
      return;
    }
    const fetchOvertimeEmployees = async () => {
      try {
        const params = {
          page: overtimePagination.current - 1,
          size: overtimePagination.pageSize,
        };
        if (overtimeSearchText && overtimeSearchText.trim() !== "") {
          params.search = overtimeSearchText.trim();
        }
        if (overtimeGroupFilter && overtimeGroupFilter !== "all") {
          params.groupId = overtimeGroupFilter;
        }
        const response = await axios.get("/api/user-attendance/active/page", { params });
        const data = response.data || {};
        const content = Array.isArray(data.content) ? data.content : [];
        setOvertimeEmployeePage(content);
        // fetch per-user target hours for displayed employees
        try {
          const year = overtimeMonth.year();
          const month = overtimeMonth.month() + 1;
          const ids = content
            .map((it) => it.user?.userID ?? it.userId)
            .filter((id) => id != null);
          if (ids.length > 0) {
            const resp2 = await axios.get("/api/overtime/month-user-targets", {
              params: {
                year,
                month,
                userIds: ids.join(","),
              },
            });
            const list = Array.isArray(resp2.data) ? resp2.data : [];
            const map = {};
            list.forEach((item) => {
              if (item && item.userId != null && item.targetHours != null) {
                map[item.userId] = Number(item.targetHours);
              }
            });
            setOvertimeTargetByUser(map);
          } else {
            setOvertimeTargetByUser({});
          }
        } catch (err) {
          console.error("Error fetching per-user targets:", err);
        }
        setOvertimePagination((prev) => ({
          ...prev,
          current: (data.page || 0) + 1,
          pageSize: data.size || prev.pageSize,
          total: data.totalElements || content.length,
        }));
      } catch (error) {
        console.error("Error fetching overtime employees:", error);
      }
    };
    fetchOvertimeEmployees();
  }, [activeTab, overtimePagination.current, overtimePagination.pageSize, overtimeSearchText, overtimeGroupFilter]);

  // Không cần kiểm tra quyền để chuyển tab nữa vì tất cả users đều có thể xem

  const handleAddEmployee = async () => {
    try {
      const values = await addForm.validateFields();
      const userIds = Array.isArray(values.userIds) ? values.userIds : [];
      const shift = values.shift || "Ngày";

      if (userIds.length === 0) {
        message.warning(lang === "vi" ? "Vui lòng chọn ít nhất một nhân viên" : "请至少选择一名员工");
        return;
      }

      const results = await Promise.allSettled(
        userIds.map((userId) => axios.post("/api/user-attendance", { userId, shift }))
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        notification.success({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description:
            lang === "vi"
              ? `Đã thêm ${successCount} nhân viên và tạo điểm danh 7 ngày`
              : `已成功添加 ${successCount} 名员工并生成未来 7 天的考勤`,
          placement: "bottomRight",
        });
      }

      if (failCount > 0) {
        notification.warning({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description:
            lang === "vi"
              ? `${failCount} nhân viên không thể thêm (có thể đã tồn tại trong danh sách)`
              : `${failCount} 名员工未能添加（可能已在列表中）`,
          placement: "bottomRight",
        });
      }

      setIsAddModalVisible(false);
      addForm.resetFields();
      fetchAttendance();
      fetchUserAttendanceList(); // Refresh danh sách theo dõi
    } catch (error) {
      message.error({
        content: t.addError,
        placement: "bottomRight",
      });
    }
  };

  const handleRemoveUser = async (id) => {
    try {
      await axios.delete(`/api/user-attendance/${id}`);
      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.removeSuccess,
        placement: "bottomRight",
      });
      fetchUserAttendanceList();
    } catch (error) {
      message.error({
        content: t.removeError,
        placement: "bottomRight",
      });
    }
  };

  const handleToggleActive = async (record) => {
    try {
      const nextActive = !record.isActive;

      await axios.put(`/api/user-attendance/${record.id}`, {
        isActive: nextActive,
      });

      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.updateSuccess,
        placement: "bottomRight",
      });

      fetchUserAttendanceList();
      fetchAttendance();
    } catch (error) {
      message.error({
        content: t.updateError,
        placement: "bottomRight",
      });
    }
  };

  const handleUpdateShift = async (record, newShift) => {
    const oldShift = record.shift;
    try {
      // Optimistically update UI
      setUserAttendanceList((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              item.id === record.id ? { ...item, shift: newShift } : item
            )
          : prev
      );

      // Send update to backend
      const response = await axios.put(`/api/user-attendance/${record.id}`, {
        shift: newShift,
      });

      // Update with response data to ensure consistency
      if (response.data && response.data.shift) {
        setUserAttendanceList((prev) =>
          Array.isArray(prev)
            ? prev.map((item) =>
                item.id === record.id ? { ...item, shift: response.data.shift } : item
              )
            : prev
        );
      }

      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.updateSuccess,
        placement: "bottomRight",
      });

      // Refresh data from server
      fetchUserAttendanceList();
      fetchAttendance();
    } catch (error) {
      // Rollback on error
      setUserAttendanceList((prev) =>
        Array.isArray(prev)
          ? prev.map((item) =>
              item.id === record.id ? { ...item, shift: oldShift } : item
            )
          : prev
      );
      message.error({
        content: t.updateError,
        placement: "bottomRight",
      });
    }
  };

  const handleSaveOvertimeTarget = async () => {
    if (!isAdmin) {
      message.warning(lang === "vi" ? "Chỉ admin mới được đặt chỉ tiêu tăng ca chung" : "仅管理员可设置全局加班指标");
      return;
    }
    if (!overtimeMonth || overtimeTarget === null || overtimeTarget === undefined) {
      return;
    }
    try {
      const year = overtimeMonth.year();
      const month = overtimeMonth.month() + 1;
      await axios.post("/api/overtime/month-target", {
        year,
        month,
        targetHours: Number(overtimeTarget),
      });
      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.overtimeSaveSuccess,
        placement: "bottomRight",
      });
    } catch (error) {
      message.error({
        content: t.overtimeSaveError,
        placement: "bottomRight",
      });
    }
  };

  // Generate danh sách các ngày trong tháng
  const getDaysInMonth = () => {
    const year = overtimeMonth.year();
    const month = overtimeMonth.month() + 1;
    const daysInMonth = dayjs(overtimeMonth).daysInMonth();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      days.push({
        date,
        dayOfMonth: day,
        dayOfWeek: date.day(), // 0 = Sunday, 1 = Monday, etc.
        isSunday: date.day() === 0,
      });
    }
    return days;
  };

  // Lấy danh sách nhân viên cần hiển thị cho tab Tăng ca (dựa trên trang backend)
  const getActiveEmployees = () => {
    const employees = (overtimeEmployeePage || []).map((item) => {
      const userId = item.user?.userID ?? item.userId;
      const foundUser = users.find((u) => u.userID === userId);
      return {
        userId,
        userName: foundUser ? foundUser.fullName : "-",
        manv: foundUser ? foundUser.manv : "",
        group: getUserGroup(userId),
      };
    }).filter((emp) => emp.userId);
    
    // Sắp xếp: user đăng nhập hiện tại lên đầu
    if (currentUserId) {
      return employees.sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        return 0;
      });
    }
    
    return employees;
  };

  const getOvertimeMatrixData = () => {
    const days = getDaysInMonth();
    const rows = [];
    getActiveEmployees().forEach((employee) => {
      const plannedSummary = calculateEmployeeSummary(employee.userId, getPlannedOvertimeHours);
      const actualSummary = calculateEmployeeSummary(employee.userId, getOvertimeHours);
      const regulation = overtimeTargetByUser[employee.userId] != null
        ? overtimeTargetByUser[employee.userId]
        : (overtimeTarget != null ? overtimeTarget : 60);
      const plannedRow = {
        key: `${employee.userId}_planned`,
        type: "planned",
        employee,
        summaryWeekday: plannedSummary.weekdayHours,
        summarySunday: plannedSummary.sundayHours,
        summaryTotal: plannedSummary.totalHours,
        regulation,
      };
      const actualRow = {
        key: `${employee.userId}_actual`,
        type: "actual",
        employee,
        summaryWeekday: actualSummary.weekdayHours,
        summarySunday: actualSummary.sundayHours,
        summaryTotal: actualSummary.totalHours,
        regulation,
      };
      days.forEach(({ date, dayOfMonth }) => {
        plannedRow[`d${dayOfMonth}`] = getPlannedOvertimeHours(employee.userId, date);
        actualRow[`d${dayOfMonth}`] = getOvertimeHours(employee.userId, date);
      });
      rows.push(plannedRow, actualRow);
    });
    return rows;
  };

  const getOvertimeMatrixColumns = () => {
    const days = getDaysInMonth();
    const cols = [
      {
        title: <div style={{ textAlign: "center" }}>{t.employee}</div>,
        dataIndex: "employee",
        key: "employee",
        width: 200,
        fixed: "left",
        render: (employee, row) => {
          const initial = employee.userName ? employee.userName.charAt(0).toUpperCase() : "?";
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar style={{ backgroundColor: "#1890ff" }}>{initial}</Avatar>
              <div>
                <div style={{ fontWeight: 500 }}>{employee.userName}</div>
                {employee.manv && <div style={{ fontSize: 11, color: "#999" }}>{employee.manv}</div>}
              </div>
            </div>
          );
        },
        onCell: (row) => ({
          rowSpan: row.type === "planned" ? 2 : 0,
          className: row.type === "planned" ? "ot-employee-cell" : undefined,
        }),
      },
      {
        title: <div style={{ textAlign: "center" }}>{lang === "vi" ? "Loại" : "类型"}</div>,
        dataIndex: "type",
        key: "type",
        width: 90,
        fixed: "left",
        align: "center",
        render: (_, row) => {
          const label = row.type === "planned"
            ? (lang === "vi" ? "Dự tính" : "预估")
            : (lang === "vi" ? "Thực tế" : "实际");
          return (
            <span
              style={{
                display: "inline-block",
                padding: "2px 12px",
                backgroundColor: "#f6ffed",
                border: "1px solid #d9d9d9",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
          );
        },
      },
    ];
    const dayNamesVi = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dayNamesZh = ["日", "一", "二", "三", "四", "五", "六"];
    days.forEach(({ date, dayOfMonth, dayOfWeek }) => {
      const isSunday = dayOfWeek === 0;
      const title = (
        <div style={{ textAlign: "center" }}>
          <div>{lang === "vi" ? dayNamesVi[dayOfWeek] : dayNamesZh[dayOfWeek]}</div>
          <div>{dayOfMonth}</div>
        </div>
      );
      cols.push({
        title,
        dataIndex: `d${dayOfMonth}`,
        key: `d${dayOfMonth}`,
        width: 90,
        align: "center",
        render: (value, row) => (
          <InputNumber
            size="large"
            min={0}
            max={24}
            step={0.5}
            precision={1}
            value={value}
            disabled={!canEditOvertimeForUser(row?.employee?.userId)}
            formatter={(val) => {
              if (val === null || val === undefined || val === '') return '';
              const num = Number(val);
              return Number.isFinite(num) ? num.toFixed(1) : val;
            }}
            parser={(val) => {
              if (val === null || val === undefined || val === '') return 0;
              const parsed = parseFloat(String(val).replace(/,/g, ''));
              return Number.isFinite(parsed) ? parsed : 0;
            }}
            onChange={(v) => {
              if (!canEditOvertimeForUser(row?.employee?.userId)) {
                message.warning(lang === "vi" ? "Bạn không có quyền sửa tăng ca mục này" : "您无权编辑此加班项");
                return;
              }
              if (row.type === "planned") {
                handlePlannedOvertimeHoursChange(row.employee.userId, date, v || 0);
              } else {
                handleSaveOvertimeHours(row.employee.userId, date, v || 0);
              }
            }}
            style={{
              width: "100%",
              border: "none",
              height: 34,
              fontSize: 14,
              padding: "0 4px",
              boxSizing: "border-box",
              textAlign: "center",
              backgroundColor: isSunday ? "#fffbe6" : "#fff",
            }}
            controls
          />
        ),
      });
    });
    cols.push(
      {
        title: (
          <div style={{ textAlign: "center", backgroundColor: "#00b050", color: "#fff", whiteSpace: "pre-line", padding: 4 }}>
            {lang === "vi" ? "Tăng ca\nngày thường" : "平日加班"}
          </div>
        ),
        dataIndex: "summaryWeekday",
        key: "summaryWeekday",
        width: 90,
        fixed: "right",
        align: "center",
        render: (v) => <span style={{ color: "#00b050", fontWeight: 600 }}>{Number(v).toFixed(1)}</span>,
      },
      {
        title: (
          <div style={{ textAlign: "center", backgroundColor: "#00b050", color: "#fff", whiteSpace: "pre-line", padding: 4 }}>
            {lang === "vi" ? "Tăng ca\nchủ nhật" : "周日加班"}
          </div>
        ),
        dataIndex: "summarySunday",
        key: "summarySunday",
        width: 90,
        fixed: "right",
        align: "center",
        render: (v) => <span style={{ color: "#00b050", fontWeight: 600 }}>{Number(v).toFixed(1)}</span>,
      },
      {
        title: (
          <div style={{ textAlign: "center", backgroundColor: "#00b050", color: "#fff", whiteSpace: "pre-line", padding: 4 }}>
            {lang === "vi" ? "Tổng\ntăng ca" : "加班合计"}
          </div>
        ),
        dataIndex: "summaryTotal",
        key: "summaryTotal",
        width: 90,
        fixed: "right",
        align: "center",
        render: (v) => <span style={{ color: "#00b050", fontWeight: 700 }}>{Number(v).toFixed(1)}</span>,
      },
      {
        title: (
          <div style={{ textAlign: "center", backgroundColor: "#ff0000", color: "#fff", whiteSpace: "pre-line", padding: 4 }}>
            {lang === "vi" ? "Số giờ tăng ca\nquy định trong tháng" : "当月规定加班小时"}
          </div>
        ),
        dataIndex: "regulation",
        key: "regulation",
        width: 120,
        fixed: "right",
        align: "center",
        render: (v, row) => (
          <InputNumber
            className="ot-target-input"
            size="small"
            min={0}
            max={200}
            step={0.5}
            precision={1}
            value={v}
            disabled={!canEditOvertimeForUser(row?.employee?.userId)}
            controls
            onChange={async (val) => {
              if (!canEditOvertimeForUser(row?.employee?.userId)) {
                message.warning(lang === "vi" ? "Bạn không có quyền sửa chỉ tiêu tăng ca" : "您无权编辑当月加班指标");
                return;
              }
              const year = overtimeMonth.year();
              const month = overtimeMonth.month() + 1;
              const userId = row.employee?.userId;
              const editor = nguoiDung?.userID;
              const safeVal = val || 0;
              setOvertimeTargetByUser((prev) => ({
                ...prev,
                [userId]: safeVal,
              }));
              try {
                await axios.post("/api/overtime/month-user-target", {
                  year,
                  month,
                  userId,
                  targetHours: safeVal,
                  lastEditBy: editor,
                });
              } catch (err) {
                console.error("Error saving user target hours:", err);
              }
            }}
            style={{
              width: "100%",
              border: "none",
              textAlign: "center",
            }}
          />
        ),
        onCell: (row) => ({
          rowSpan: row.type === "planned" ? 2 : 0,
          className: row.type === "planned" ? "ot-regulation-cell" : undefined,
        }),
      }
    );
    return cols;
  };

  const handleOvertimeExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      const days = getDaysInMonth();
      const headerDays = days.map(({ dayOfMonth }) => `<th style="border:1px solid #ddd;padding:4px 6px;text-align:center;">${dayOfMonth}</th>`).join('');
      const activeIds = new Set(getActiveEmployees().map((e) => e.userId));
      const currentPageRows = getOvertimeMatrixData().filter((row) => activeIds.has(row.employee?.userId));
      const rowsHtml = currentPageRows.map((row) => {
        const employeeName = row.employee?.userName || '-';
        const manv = row.employee?.manv || '';
        const typeLabel = row.type === 'planned' ? (lang === 'vi' ? 'Dự tính' : '预估') : (lang === 'vi' ? 'Thực tế' : '实际');
        const dayCells = days.map(({ dayOfMonth }) => {
          const v = row[`d${dayOfMonth}`];
          const display = (v !== undefined && v !== null) ? Number(v).toFixed(1) : '0.0';
          return `<td style="border:1px solid #ddd;padding:4px 6px;text-align:center;">${display}</td>`;
        }).join('');
        const weekday = Number(row.summaryWeekday || 0).toFixed(1);
        const sunday = Number(row.summarySunday || 0).toFixed(1);
        const total = Number(row.summaryTotal || 0).toFixed(1);
        const regulation = Number(row.regulation || 0).toFixed(1);
        return `
          <tr>
            <td style="border:1px solid #ddd;padding:4px 6px;">${employeeName}<div style="color:#888;font-size:11px;">${manv}</div></td>
            <td style="border:1px solid #ddd;padding:4px 6px;text-align:center;">${typeLabel}</td>
            ${dayCells}
            <td style="border:1px solid #ddd;padding:4px 6px;text-align:center;color:#00b050;">${weekday}</td>
            <td style="border:1px solid #ddd;padding:4px 6px;text-align:center;color:#00b050;">${sunday}</td>
            <td style="border:1px solid #ddd;padding:4px 6px;text-align:center;color:#00b050;font-weight:700;">${total}</td>
            <td style="border:1px solid #ddd;padding:4px 6px;text-align:center;color:#ff0000;font-weight:700;">${regulation}</td>
          </tr>
        `;
      }).join('');
      const titleText = (lang === 'vi' ? 'Bảng Tăng ca' : '加班表') + ` - ${overtimeMonth.format('MM/YYYY')} - ${lang === 'vi' ? 'Trang' : '页'} ${overtimePagination.current}`;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${titleText}</title>
          <style>
            @page { margin: 10mm; size: landscape; }
            body { font-family: Arial, sans-serif; font-size: 12px; }
            h2 { text-align: center; margin: 0 0 6px 0; }
            table { width: 100%; border-collapse: collapse; }
            thead th { background: #fafafa; font-weight: 600; border:1px solid #ddd; padding:4px 6px; text-align:center; }
          </style>
        </head>
        <body>
          <h2>${titleText}</h2>
          <table>
            <thead>
              <tr>
                <th style="border:1px solid #ddd;padding:4px 6px;">${t.employee}</th>
                <th style="border:1px solid #ddd;padding:4px 6px;">${lang === 'vi' ? 'Loại' : '类型'}</th>
                ${headerDays}
                <th style="border:1px solid #ddd;padding:4px 6px;">${lang === 'vi' ? 'Tăng ca ngày thường' : '平日加班'}</th>
                <th style="border:1px solid #ddd;padding:4px 6px;">${lang === 'vi' ? 'Tăng ca chủ nhật' : '周日加班'}</th>
                <th style="border:1px solid #ddd;padding:4px 6px;">${lang === 'vi' ? 'Tổng tăng ca' : '加班合计'}</th>
                <th style="border:1px solid #ddd;padding:4px 6px;">${lang === 'vi' ? 'Số giờ tăng ca quy định trong tháng' : '当月规定加班小时'}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = function(){window.print(); setTimeout(()=>window.close(), 300);};</script>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: (lang === 'vi' ? 'Lỗi khi in PDF: ' : '打印PDF错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleOvertimeExportExcel = () => {
    try {
      const days = getDaysInMonth();
      const headers = [
        'STT',
        t.employee,
        lang === 'vi' ? 'Mã NV' : '员工编号',
        lang === 'vi' ? 'Loại' : '类型',
        ...days.map(({ dayOfMonth }) => `D${dayOfMonth}`),
        lang === 'vi' ? 'Tăng ca ngày thường' : '平日加班',
        lang === 'vi' ? 'Tăng ca chủ nhật' : '周日加班',
        lang === 'vi' ? 'Tổng tăng ca' : '加班合计',
        lang === 'vi' ? 'Giờ quy định' : '规定小时'
      ];
      const activeIds = new Set(getActiveEmployees().map((e) => e.userId));
      const currentPageRows = getOvertimeMatrixData().filter((row) => activeIds.has(row.employee?.userId));
      const rows = currentPageRows.map((row, index) => {
        const employeeName = row.employee?.userName || '-';
        const manv = row.employee?.manv || '';
        const typeLabel = row.type === 'planned' ? (lang === 'vi' ? 'Dự tính' : '预估') : (lang === 'vi' ? 'Thực tế' : '实际');
        const dayValues = days.map(({ dayOfMonth }) => {
          const v = row[`d${dayOfMonth}`];
          const display = (v !== undefined && v !== null) ? Number(v).toFixed(1) : '0.0';
          return `"${display}"`;
        });
        const weekday = Number(row.summaryWeekday || 0).toFixed(1);
        const sunday = Number(row.summarySunday || 0).toFixed(1);
        const total = Number(row.summaryTotal || 0).toFixed(1);
        const regulation = Number(row.regulation || 0).toFixed(1);
        return [
          index + 1,
          `"${employeeName}"`,
          `"${manv}"`,
          `"${typeLabel}"`,
          ...dayValues,
          `"${weekday}"`,
          `"${sunday}"`,
          `"${total}"`,
          `"${regulation}"`
        ].join(',');
      });
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `overtime_${overtimeMonth.format('YYYY-MM')}_p${overtimePagination.current}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: (lang === 'vi' ? 'Lỗi khi xuất Excel: ' : '导出Excel错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };
  // Lấy số giờ tăng ca cho một ngày cụ thể
  const getOvertimeHours = (userId, date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const key = `${userId}_${dateStr}`;
    return overtimeDataByDate[key] || 0;
  };

  const getPlannedOvertimeHours = (userId, date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const key = `${userId}_${dateStr}`;
    return plannedOvertimeDataByDate[key] || 0;
  };

  const handlePlannedOvertimeHoursChange = async (userId, date, hours) => {
    if (!canEditOvertimeForUser(userId)) {
      message.warning(lang === "vi" ? "Bạn không có quyền sửa tăng ca dự tính" : "您无权编辑预估加班");
      return;
    }
    const dateStr = date.format('YYYY-MM-DD');
    const key = `${userId}_${dateStr}`;
    const safeHours = hours || 0;

    // update local state trước cho mượt
    setPlannedOvertimeDataByDate((prev) => ({
      ...prev,
      [key]: safeHours,
    }));

    try {
      let existingRecord = monthlyAttendanceData.find(
        (record) =>
          record.user?.userID === userId &&
          record.attendanceDate === dateStr
      );

      if (existingRecord && existingRecord.id) {
        await axios.put(`/api/attendance/${existingRecord.id}/planned-overtime`, {
          plannedOvertimeHours: safeHours,
        });
        setMonthlyAttendanceData((prev) =>
          prev.map((record) =>
            record.id === existingRecord.id
              ? { ...record, plannedOvertimeHours: safeHours }
              : record
          )
        );
      } else {
        const foundUser = users.find((u) => u.userID === userId);
        if (!foundUser) {
          throw new Error("User not found");
        }

        const newRecord = await axios.post("/api/attendance", {
          userId: userId,
          attendanceDate: dateStr,
          status: lang === "vi" ? "Có mặt" : "出勤",
          shift: "Ngày",
          plannedOvertimeHours: safeHours,
        });

        setMonthlyAttendanceData((prev) => [...prev, newRecord.data]);
      }
    } catch (error) {
      console.error("Error saving planned overtime hours:", error);
      setPlannedOvertimeDataByDate((prev) => {
        const newState = { ...prev };
        if (prev[key] !== undefined) {
          newState[key] = prev[key];
        } else {
          delete newState[key];
        }
        return newState;
      });
      message.error({
        content: lang === "vi" ? "Không thể lưu giờ tăng ca dự tính" : "无法保存预估加班时间",
        placement: "bottomRight",
      });
    }
  };

  // Lưu số giờ tăng ca cho một ngày
  const handleSaveOvertimeHours = async (userId, date, hours) => {
    if (!canEditOvertimeForUser(userId)) {
      message.warning(lang === "vi" ? "Bạn không có quyền sửa tăng ca thực tế" : "您无权编辑实际加班");
      return;
    }
    const dateStr = date.format('YYYY-MM-DD');
    const key = `${userId}_${dateStr}`;
    
    // Update local state immediately for responsive UI
    const prevValue = overtimeDataByDate[key];
    setOvertimeDataByDate((prev) => ({
      ...prev,
      [key]: hours || 0,
    }));

    try {
      // Tìm attendance report tương ứng
      let existingRecord = monthlyAttendanceData.find(
        (record) =>
          record.user?.userID === userId &&
          record.attendanceDate === dateStr
      );

      if (existingRecord && existingRecord.id) {
        // Update existing record using the new endpoint
        await axios.put(`/api/attendance/${existingRecord.id}/overtime`, {
          overtimeHours: hours || 0,
        });
        // Update monthlyAttendanceData để sync
        setMonthlyAttendanceData((prev) =>
          prev.map((record) =>
            record.id === existingRecord.id
              ? { ...record, overtimeHours: hours || 0 }
              : record
          )
        );
      } else {
        // Tạo mới attendance record với status mặc định và overtimeHours
        const foundUser = users.find((u) => u.userID === userId);
        if (!foundUser) {
          throw new Error("User not found");
        }
        
        const newRecord = await axios.post("/api/attendance", {
          userId: userId,
          attendanceDate: dateStr,
          status: lang === "vi" ? "Có mặt" : "出勤",
          shift: "Ngày",
          overtimeHours: hours || 0,
        });
        
        // Thêm vào monthlyAttendanceData
        setMonthlyAttendanceData((prev) => [...prev, newRecord.data]);
      }
    } catch (error) {
      console.error("Error saving overtime hours:", error);
      // Revert local state on error
      setOvertimeDataByDate((prev) => {
        const newState = { ...prev };
        if (prevValue !== undefined) {
          newState[key] = prevValue;
        } else {
          delete newState[key];
        }
        return newState;
      });
      message.error({
        content: lang === "vi" ? "Không thể lưu giờ tăng ca" : "无法保存加班时间",
        placement: "bottomRight",
      });
    }
  };

  // Tính toán tổng hợp cho một nhân viên
  const calculateEmployeeSummary = (userId, getHoursFn) => {
    const days = getDaysInMonth();
    let weekdayHours = 0;
    let sundayHours = 0;
    
    days.forEach(({ date, isSunday }) => {
      const hours = getHoursFn(userId, date);
      if (isSunday) {
        sundayHours += hours;
      } else {
        weekdayHours += hours;
      }
    });
    
    return {
      weekdayHours: Math.round(weekdayHours * 10) / 10,
      sundayHours: Math.round(sundayHours * 10) / 10,
      totalHours: Math.round((weekdayHours + sundayHours) * 10) / 10,
    };
  };


  const handleCancelAdd = () => {
    setIsAddModalVisible(false);
    addForm.resetFields();
  };

  const handleExportPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      const tableData = filteredAttendanceData.map((record, index) => {
        const userId = record.user?.userID || record.userId;
        const foundUser = users.find((u) => u.userID === userId);
        const userName = foundUser ? foundUser.fullName : "-";
        const manv = foundUser ? foundUser.manv : "-";
        const groupName = getUserGroup(record.user || record.userId);
        const status = record.status || "-";
        const clockInTime = record.clockInTime || "-";
        const clockOutTime = record.clockOutTime || "-";
        const note = record.note || "-";
        
        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="text-align: left;">${userName}</td>
            <td style="text-align: left;">${manv}</td>
            <td style="text-align: left;">${groupName}</td>
            <td style="text-align: center;">${status}</td>
            <td style="text-align: center;">${clockInTime}</td>
            <td style="text-align: center;">${clockOutTime}</td>
            <td style="text-align: left;">${note}</td>
          </tr>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${lang === 'vi' ? 'Attendance' : '考勤表'}</title>
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
            .info {
              margin-bottom: 20px;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left;
              font-size: 12px;
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold;
              text-align: center;
            }
            tr:nth-child(even) { 
              background-color: #f9f9f9; 
            }
          </style>
        </head>
        <body>
          <h1>${lang === 'vi' ? 'Attendance' : '考勤表'}</h1>
          <div class="info">
            <strong>${lang === 'vi' ? 'Ngày' : '日期'}:</strong> ${selectedDate.format('DD/MM/YYYY')}
          </div>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>${t.employee}</th>
                <th>${lang === 'vi' ? 'Mã NV' : '员工编号'}</th>
                <th>${t.area}</th>
                <th>${t.status}</th>
                <th>${t.clockIn}</th>
                <th>${t.clockOut}</th>
                <th>${t.note}</th>
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
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: (lang === 'vi' ? 'Lỗi khi in PDF: ' : '打印PDF错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const headers = [
        'STT',
        t.employee,
        lang === 'vi' ? 'Mã NV' : '员工编号',
        t.area,
        t.status,
        t.clockIn,
        t.clockOut,
        t.note
      ];

      const csvRows = [
        headers.join(','),
        ...filteredAttendanceData.map((record, index) => {
          const userId = record.user?.userID || record.userId;
          const foundUser = users.find((u) => u.userID === userId);
          const userName = foundUser ? foundUser.fullName : "-";
          const manv = foundUser ? foundUser.manv : "-";
          const groupName = getUserGroup(record.user || record.userId);
          const status = record.status || "-";
          const clockInTime = record.clockInTime || "-";
          const clockOutTime = record.clockOutTime || "-";
          const note = (record.note || "-").replace(/,/g, ';');
          
          return [
            index + 1,
            `"${userName}"`,
            `"${manv}"`,
            `"${groupName}"`,
            `"${status}"`,
            `"${clockInTime}"`,
            `"${clockOutTime}"`,
            `"${note}"`
          ].join(',');
        })
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_${selectedDate.format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: (lang === 'vi' ? 'Lỗi khi xuất Excel: ' : '导出Excel错误: ') + error.message,
        placement: 'bottomRight'
      });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    // Mặc định giờ vào 8:00 AM và giờ ra 17:00 PM nếu chưa có
    const defaultClockIn = record.clockInTime 
      ? dayjs(record.clockInTime, "HH:mm") 
      : dayjs("08:00", "HH:mm");
    const defaultClockOut = record.clockOutTime 
      ? dayjs(record.clockOutTime, "HH:mm") 
      : dayjs("17:00", "HH:mm");
    
    form.setFieldsValue({
      userId: record.user?.userID || record.userId,
      attendanceDate: dayjs(record.attendanceDate),
      status: record.status,
      clockInTime: defaultClockIn,
      clockOutTime: defaultClockOut,
      note: record.note,
    });
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Lấy shift từ record (nếu đang edit) hoặc từ userAttendanceList
      let shift = null;
      if (editingRecord && editingRecord.shift) {
        shift = editingRecord.shift;
      } else {
        shift = getUserShiftRaw(values.userId, null);
      }
      
      // Tự động xóa giờ vào/ra nếu status là Vắng mặt, Nghỉ phép, hoặc Nghỉ CN
      const status = values.status;
      const shouldClearTime = status === "Vắng mặt" || status === "Nghỉ phép" || status === "Nghỉ CN" ||
                              status === "缺勤" || status === "请假" || status === "周日休" ||
                              status?.includes("Vắng") || status?.includes("Nghỉ phép") || status?.includes("Nghỉ CN");
      
      const payload = {
        userId: values.userId,
        attendanceDate: values.attendanceDate.format("YYYY-MM-DD"),
        status: values.status,
        clockInTime: shouldClearTime ? null : (values.clockInTime ? values.clockInTime.format("HH:mm") : null),
        clockOutTime: shouldClearTime ? null : (values.clockOutTime ? values.clockOutTime.format("HH:mm") : null),
        note: values.note || null,
        shift: shift || "Ngày",
      };

      if (editingRecord) {
        await attendanceService.updateAttendance(editingRecord.id, payload);
      } else {
        await attendanceService.createAttendance(payload);
      }

      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.saveSuccess,
        placement: "bottomRight",
      });

      setIsModalVisible(false);
      form.resetFields();
      setEditingRecord(null);
      fetchAttendance();
    } catch (error) {
      message.error({
        content: t.saveError,
        placement: "bottomRight",
      });
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingRecord(null);
  };

  const getStatusIcon = (status) => {
    if (!status) return <PersonIcon status="" size="sm" />;
    return <PersonIcon status={status} size="sm" />;
  };

  const getStatusTag = (status) => {
    if (!status) return <Tag color="red">{t.absent}</Tag>;
    if (status.includes("Có mặt") || status.includes("出勤")) {
      return <Tag color="green">{t.present}</Tag>;
    }
    if (status.includes("Đi muộn") || status.includes("迟到")) {
      return <Tag color="orange">{t.late}</Tag>;
    }
    if (status.includes("Nửa ngày") || status.includes("半天")) {
      return <Tag color="orange">{t.halfDay}</Tag>;
    }
    if (status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤")) {
      return <Tag color="red">{t.absent}</Tag>;
    }
    if (status.includes("Nghỉ CN") || status.includes("周日休")) {
      return <Tag color="geekblue">{t.weekendOff}</Tag>;
    }
    if (status.includes("Nghỉ phép") || status.includes("请假")) {
      return <Tag color="orange">{t.leave}</Tag>;
    }
    return <Tag>{status}</Tag>;
  };

  const getUserName = (user) => {
    if (!user) return "-";
    if (typeof user === "object") {
      return user.fullName || "-";
    }
    const foundUser = users.find((u) => u.userID === user);
    return foundUser ? foundUser.fullName : "-";
  };

  const columns = [
    {
      title: <div style={{ textAlign: "center" }}>STT</div>,
      key: "stt",
      width: "5%",
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.employee}</div>,
      dataIndex: "user",
      key: "employee",
      width: "20%",
      render: (user, record) => {
        const userId = user?.userID || record.userId;
        const userName = getUserName(user || userId);
        const foundUser = users.find((u) => u.userID === userId);
        const initial = userName ? userName.charAt(0).toUpperCase() : "?";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar style={{ backgroundColor: "#1890ff" }}>{initial}</Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>{userName}</div>
              {foundUser && (
                <div style={{ fontSize: 12, color: "#999" }}>
                  {foundUser.manv || ""}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.area}</div>,
      key: "area",
      width: "10%",
      align: "center",
      render: (_, record) => getUserGroup(record.user || record.userId),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.shift}</div>,
      key: "shift",
      width: "8%",
      align: "center",
      render: (_, record) => getUserShift(record.user || record.userId, record),
    },
    {
      title: <div style={{ textAlign: "center" }}>Icon</div>,
      key: "icon",
      width: "5%",
      align: "center",
      render: (_, record) => getStatusIcon(record.status),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.status}</div>,
      dataIndex: "status",
      key: "status",
      width: "12%",
      align: "center",
      render: (status) => getStatusTag(status),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.clockIn}</div>,
      dataIndex: "clockInTime",
      key: "clockInTime",
      width: "10%",
      align: "center",
      render: (time) => time || "-",
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.clockOut}</div>,
      dataIndex: "clockOutTime",
      key: "clockOutTime",
      width: "10%",
      align: "center",
      render: (time) => time || "-",
    },
    {
      title: <div style={{ textAlign: "center" }}>Tăng ca</div>,
      dataIndex: "overtimeHours",
      key: "overtimeHours",
      width: "8%",
      align: "center",
      render: (_, record) => {
        const userId = record.user?.userID || record.userId;
        const dateStr = record.attendanceDate;
        if (!userId || !dateStr) {
          return record.overtimeHours != null ? record.overtimeHours.toFixed(1) : "0.0";
        }
        const key = `${userId}_${dateStr}`;
        const value = overtimeDataByDate[key];
        const hours = value != null ? value : record.overtimeHours;
        if (hours == null) return "0.0";
        const num = Number(hours);
        if (Number.isNaN(num)) return "0.0";
        return num.toFixed(1);
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.note}</div>,
      dataIndex: "note",
      key: "note",
      width: "12%",
      render: (note) => note || "-",
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.action}</div>,
      key: "action",
      width: "10%",
      align: "center",
      render: (_, record) => {
        // Kiểm tra xem ngày điểm danh có quá 7 ngày không
        const attendanceDate = record.attendanceDate ? dayjs(record.attendanceDate) : null;
        const today = dayjs();
        const sevenDaysAgo = today.subtract(7, 'day').startOf('day');
        const isOlderThan7Days = attendanceDate && attendanceDate.isBefore(sevenDaysAgo);
        
        return (
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={isOlderThan7Days}
            title={isOlderThan7Days ? (lang === 'vi' ? 'Không thể sửa điểm danh quá 7 ngày' : '不能编辑超过7天的考勤') : ''}
          />
        );
      },
    },
  ];

  // Columns cho bảng danh sách theo dõi
  const trackingColumns = [
    {
      title: <div style={{ textAlign: "center" }}>{t.employee}</div>,
      dataIndex: "user",
      key: "employee",
      width: "40%",
      render: (user) => {
        const userName = user?.fullName || "-";
        const initial = userName ? userName.charAt(0).toUpperCase() : "?";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar style={{ backgroundColor: "#1890ff" }}>{initial}</Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>{userName}</div>
              {user && (
                <div style={{ fontSize: 12, color: "#999" }}>
                  {user.manv || user.email || ""}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.area}</div>,
      key: "group",
      width: "15%",
      align: "center",
      render: (_, record) => getUserGroup(record.user || record.userId),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.shift}</div>,
      dataIndex: "shift",
      key: "shift",
      width: "15%",
      align: "center",
      render: (shift, record) => {
        // Normalize shift value to handle both "Ngày" and "Ngay" (without accent)
        const normalizedShift = (shift || record.shift || "Ngày").trim();
        const isDayShift = normalizedShift === "Ngày" || normalizedShift === "Ngay" || normalizedShift.toLowerCase() === "ngày" || normalizedShift.toLowerCase() === "ngay";
        
        return (
          <Switch
            checked={isDayShift}
            disabled={!canEditRecord(record)}
            onChange={(checked) => handleUpdateShift(record, checked ? "Ngày" : "Đêm")}
            checkedChildren={t.shiftDay}
            unCheckedChildren={t.shiftNight}
          />
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.isActive}</div>,
      dataIndex: "isActive",
      key: "isActive",
      width: "15%",
      align: "center",
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          disabled={!canEditRecord(record)}
          onChange={() => handleToggleActive(record)}
          checkedChildren="Có"
          unCheckedChildren="Không"
        />
      ),
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.action}</div>,
      key: "action",
      width: "15%",
      align: "center",
      render: (_, record) => {
        // Chỉ admin/manager mới được xóa
        if (!hasAddPermission) {
          return "-";
        }
        return (
          <Popconfirm
            title={t.removeConfirm}
            onConfirm={() => handleRemoveUser(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              aria-label={lang === "vi" ? "Xóa" : "删除"}
            />
          </Popconfirm>
        );
      },
    },
  ];

  const overtimeColumns = [
    {
      title: <div style={{ textAlign: "center" }}>STT</div>,
      key: "stt",
      width: "8%",
      align: "center",
      render: (_, __, index) =>
        (overtimePagination.current - 1) * overtimePagination.pageSize + index + 1,
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.employee}</div>,
      dataIndex: "userId",
      key: "employee",
      width: "32%",
      render: (userId) => {
        const foundUser = users.find((u) => u.userID === userId);
        const userName = foundUser ? foundUser.fullName : "-";
        const manv = foundUser ? foundUser.manv : "";
        const initial = userName ? userName.charAt(0).toUpperCase() : "?";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar style={{ backgroundColor: "#1890ff" }}>{initial}</Avatar>
            <div>
              <div style={{ fontWeight: 500 }}>{userName}</div>
              {manv && (
                <div style={{ fontSize: 12, color: "#999" }}>
                  {manv}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: <div style={{ textAlign: "center" }}>{t.area}</div>,
      key: "area",
      width: "15%",
      align: "center",
      render: (_, record) => getUserGroup(record.userId),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          {lang === "vi" ? "Giờ tăng ca ngày thường" : "平日加班小时数"}
        </div>
      ),
      dataIndex: "weekdayHours",
      key: "weekdayHours",
      width: "15%",
      align: "center",
      render: (value) => (value != null ? value.toFixed(1) : "0.0"),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          {lang === "vi" ? "Giờ tăng ca Chủ nhật" : "周日加班小时数"}
        </div>
      ),
      dataIndex: "sundayHours",
      key: "sundayHours",
      width: "15%",
      align: "center",
      render: (value) => (value != null ? value.toFixed(1) : "0.0"),
    },
    {
      title: (
        <div style={{ textAlign: "center" }}>
          {lang === "vi" ? "Tổng giờ tăng ca" : "总加班小时数"}
        </div>
      ),
      dataIndex: "totalHours",
      key: "totalHours",
      width: "15%",
      align: "center",
      render: (value) => (value != null ? value.toFixed(1) : "0.0"),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
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
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              padding: "8px 20px",
              border: "none",
              background: activeTab === "dashboard" ? "#f5f5f5" : "transparent",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: activeTab === "dashboard" ? 500 : 400,
              color: activeTab === "dashboard" ? "#333" : "#666",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "dashboard") {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "dashboard") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <DashboardOutlined style={{ fontSize: 16 }} />
            {t.dashboard}
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            style={{
              padding: "8px 20px",
              border: "none",
              background: activeTab === "attendance" ? "#f5f5f5" : "transparent",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: activeTab === "attendance" ? 500 : 400,
              color: activeTab === "attendance" ? "#333" : "#666",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "attendance") {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "attendance") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <ClockCircleOutlined style={{ fontSize: 16 }} />
            {t.attendanceBoard}
          </button>
          {hasTrackingAccess && (
            <button
              onClick={() => setActiveTab("tracking")}
              style={{
                padding: "8px 20px",
                border: "none",
                background: activeTab === "tracking" ? "#f5f5f5" : "transparent",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: activeTab === "tracking" ? 500 : 400,
                color: activeTab === "tracking" ? "#333" : "#666",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== "tracking") {
                  e.currentTarget.style.background = "#fafafa";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== "tracking") {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <UserOutlined style={{ fontSize: 16 }} />
              {t.trackingList}
            </button>
          )}
          <button
            onClick={() => setActiveTab("overtime")}
            style={{
              padding: "8px 20px",
              border: "none",
              background: activeTab === "overtime" ? "#f5f5f5" : "transparent",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: activeTab === "overtime" ? 500 : 400,
              color: activeTab === "overtime" ? "#333" : "#666",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "overtime") {
                e.currentTarget.style.background = "#fafafa";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "overtime") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <ClockCircleOutlined style={{ fontSize: 16 }} />
            {t.overtimeTab}
          </button>
        </div>
        {(activeTab === "attendance" || activeTab === "dashboard") && (
          <DatePicker
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            format="DD/MM/YYYY"
            placeholder={t.date}
            style={{ width: 200 }}
            allowClear={false}
          />
        )}
        {hasAddPermission && activeTab === "tracking" && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setIsAddModalVisible(true);
              addForm.resetFields();
            }}
          >
            {t.addNew}
          </Button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
              {lang === "vi" ? "Bảng điểm danh" : "点名表"}
            </h3>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 14 }}>
              {lang === "vi" ? "Ngày" : "日期"}: {selectedDate.format("DD/MM/YYYY")}
            </p>
          </div>

          <Row gutter={16} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap' }}>
            <Col xs={24} sm={12} md={8} style={{ flex: '1 1 0', minWidth: '200px' }}>
              <Card>
                <Statistic
                  title={lang === "vi" ? "Tổng nhân viên" : "总员工数"}
                  value={activeTrackedUserIds.size}
                  prefix={<TeamOutlined style={{ color: "#1890ff" }} />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} style={{ flex: '1 1 0', minWidth: '200px' }}>
              <Card>
                <Statistic
                  title={t.presentCount}
                  value={stats.present}
                  prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                  valueStyle={{ color: "#52c41a" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} style={{ flex: '1 1 0', minWidth: '200px' }}>
              <Card>
                <Statistic
                  title={t.halfDayCount}
                  value={stats.halfDay}
                  prefix={<ExclamationCircleOutlined style={{ color: "#8B4513" }} />}
                  valueStyle={{ color: "#8B4513" }}
                  titleStyle={{ color: "rgba(0, 0, 0, 0.85)" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} style={{ flex: '1 1 0', minWidth: '200px' }}>
              <Card>
                <Statistic
                  title={t.leaveCount}
                  value={stats.leave}
                  prefix={<StarOutlined style={{ color: "#ff7a45" }} />}
                  valueStyle={{ color: "#ff7a45" }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} style={{ flex: '1 1 0', minWidth: '200px' }}>
              <Card>
                <Statistic
                  title={t.absentCount}
                  value={stats.absent}
                  prefix={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                  valueStyle={{ color: "#ff4d4f" }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card>
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ marginBottom: 24 }}>
                    {lang === "vi" ? "Tỉ lệ đi làm tổng thể" : "总体出勤率"}
                  </h4>
                  <div style={{ position: "relative", display: "inline-block", width: 160, height: 160 }}>
                    {(() => {
                      const effectivePresent = stats.present + stats.halfDay * 0.5;
                      const totalActive = activeTrackedUserIds.size;
                      const overallRate = totalActive > 0
                        ? Math.round((effectivePresent / totalActive) * 100)
                        : 0;
                      const color = overallRate >= 80 ? "#52c41a" : overallRate >= 50 ? "#ff7a45" : "#ff4d4f";
                      const circumference = 2 * Math.PI * 40; // radius = 40
                      const offset = circumference - (overallRate / 100) * circumference;
                      
                      return (
                        <>
                          <svg viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="#e5e7eb"
                              strokeWidth="8"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={color}
                              strokeWidth="8"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              fontSize: 32,
                              fontWeight: "bold",
                              color: color,
                            }}
                          >
                            {overallRate}%
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {groups.map((group) => {
                    const groupUsers = users.filter((u) => {
                      if (!activeTrackedUserIds.has(u.userID)) return false;
                      if (!u.groups) return false;
                      let userGroups = [];
                      if (Array.isArray(u.groups)) {
                        userGroups = u.groups;
                      } else if (u.groups instanceof Set) {
                        userGroups = Array.from(u.groups);
                      } else if (u.groups.size !== undefined) {
                        userGroups = Array.from(u.groups);
                      }
                      return userGroups.some((g) => g.id === group.id);
                    });

                    const groupAttendance = attendanceData.filter((record) => {
                      const userId = record.user?.userID || record.userId;
                      return groupUsers.some((u) => u.userID === userId);
                    });

                    const groupPresent = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Có mặt") || status.includes("出勤");
                    }).length;

                    const groupHalfDay = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Nửa ngày") || status.includes("半天");
                    }).length;

                    const groupAbsent = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Vắng") || status.includes("Vắng mặt") || status.includes("缺勤");
                    }).length;

                    const groupLeave = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Nghỉ phép") || status.includes("请假");
                    }).length;

                    const groupWeekendLeave = groupAttendance.filter((record) => {
                      const status = record.status || "";
                      return status.includes("Nghỉ CN") || status.includes("周日休");
                    }).length;

                    const effectivePresent = groupPresent + groupHalfDay * 0.5;
                    const groupRate = groupUsers.length > 0 
                      ? Math.round((effectivePresent / groupUsers.length) * 100) 
                      : 0;

                    return (
                      <div key={group.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <div>
                            <span style={{ fontWeight: 500 }}>
                              {lang === "vi" ? "Nhóm" : "组"} {group.name}
                            </span>
                            <span style={{ color: "#666", marginLeft: 8 }}>
                              ({groupUsers.length} {lang === "vi" ? "người" : "人"})
                            </span>
                          </div>
                          <span
                            style={{
                              color: groupRate >= 80 ? "#52c41a" : groupRate >= 50 ? "#ff7a45" : "#ff4d4f",
                              fontWeight: 500,
                            }}
                          >
                            {groupRate}%
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              backgroundColor: "#f0f0f0",
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${groupRate}%`,
                                height: "100%",
                                backgroundColor: groupRate >= 80 ? "#52c41a" : groupRate >= 50 ? "#ff7a45" : "#ff4d4f",
                                transition: "width 0.3s",
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            <span style={{ color: "#52c41a" }}>{groupPresent} {lang === "vi" ? "có mặt" : "出勤"}</span>,{" "}
                            <span style={{ color: "#666" }}>{groupHalfDay} {lang === "vi" ? "nửa ngày" : "半天"}</span>,{" "}
                            <span style={{ color: "#ff7a45" }}>{groupLeave} {lang === "vi" ? "nghỉ phép" : "请假"}</span>,{" "}
                            <span style={{ color: "#3b82f6" }}>{groupWeekendLeave} {lang === "vi" ? "nghỉ CN" : "周日休"}</span>,{" "}
                            <span style={{ color: "#ff4d4f" }}>{groupAbsent} {lang === "vi" ? "vắng" : "缺勤"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>

          </Row>

          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h4 style={{ margin: 0 }}>
                {lang === "vi" ? "Trạng thái nhân viên ngày" : "员工状态"} {selectedDate.format("DD/MM/YYYY")}
              </h4>
              <Select
                placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
                value={groupFilter}
                onChange={setGroupFilter}
                style={{ width: 180 }}
                allowClear
              >
                <Option value="all">{lang === "vi" ? "Tất cả các nhóm" : "所有组"}</Option>
                {groups.map((group) => (
                  <Option key={group.id} value={String(group.id)}>
                    {group.name}
                  </Option>
                ))}
              </Select>
            </div>
            <Row gutter={24}>
              {/* Ca ngày - Wider section */}
              <Col xs={24} lg={16}>
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 500 }}>
                    {lang === "vi" ? "Ca ngày" : "日班"}
                  </h5>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      justifyContent: "flex-start",
                      padding: "20px",
                      backgroundColor: "#fafafa",
                      borderRadius: 8,
                      minHeight: 120,
                    }}
                  >
                    {activeAttendanceData
                       .filter((record) => {
                         const gid = getUserGroupId(record.user || record.userId);
                         const shiftRaw = getUserShiftRaw(record.user || record.userId, record);
                         return (shiftRaw === "Ngày" || shiftRaw === "Ngay" || !shiftRaw) &&
                                (!groupFilter || groupFilter === "all" || String(gid) === String(groupFilter));
                       })
                       .map((record) => {
                        const userId = record.user?.userID || record.userId;
                        const foundUser = users.find((u) => u.userID === userId);
                        const userName = foundUser ? foundUser.fullName : "-";
                        const groupName = getUserGroup(record.user || record.userId);
                        const shiftName = getUserShift(record.user || record.userId, record);
                        
                        const tooltipContent = (
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{userName}</div>
                            <div style={{ fontSize: 12, marginBottom: 2 }}>
                              {lang === "vi" ? "Nhóm" : "组"}: {groupName}
                            </div>
                            <div style={{ fontSize: 12 }}>
                              {lang === "vi" ? "Ca làm việc" : "班次"}: {shiftName}
                            </div>
                          </div>
                        );
                        
                        return (
                          <div
                            key={record.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 8,
                              minWidth: 80,
                            }}
                          >
                            <Tooltip title={tooltipContent} placement="top">
                              <div style={{ cursor: "pointer" }}>
                                <PersonIcon status={record.status} size="md" />
                              </div>
                            </Tooltip>
                            <div
                              style={{
                                textAlign: "center",
                                fontSize: 12,
                                color: "#666",
                                maxWidth: 80,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {userName.split(" ").pop()}
                            </div>
                          </div>
                        );
                      })}
                    {activeAttendanceData
                       .filter((record) => {
                         const gid = getUserGroupId(record.user || record.userId);
                         const shiftRaw = getUserShiftRaw(record.user || record.userId, record);
                         return (shiftRaw === "Ngày" || shiftRaw === "Ngay" || !shiftRaw) &&
                                (!groupFilter || groupFilter === "all" || String(gid) === String(groupFilter));
                       }).length === 0 && (
                        <div style={{ width: "100%", textAlign: "center", color: "#999", padding: 20 }}>
                          {lang === "vi" ? "Không có nhân viên ca ngày" : "没有日班员工"}
                        </div>
                      )}
                  </div>
                </div>
              </Col>
              {/* Ca đêm - Narrower section */}
              <Col xs={24} lg={8}>
                <div style={{ marginBottom: 16 }}>
                  <h5 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 500 }}>
                    {lang === "vi" ? "Ca đêm" : "夜班"}
                  </h5>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 16,
                      justifyContent: "flex-start",
                      padding: "20px",
                      backgroundColor: "#fafafa",
                      borderRadius: 8,
                      minHeight: 120,
                    }}
                  >
                    {activeAttendanceData
                       .filter((record) => {
                         const gid = getUserGroupId(record.user || record.userId);
                         const shiftRaw = getUserShiftRaw(record.user || record.userId, record);
                         return shiftRaw === "Đêm" &&
                                (!groupFilter || groupFilter === "all" || String(gid) === String(groupFilter));
                       })
                       .map((record) => {
                        const userId = record.user?.userID || record.userId;
                        const foundUser = users.find((u) => u.userID === userId);
                        const userName = foundUser ? foundUser.fullName : "-";
                        const groupName = getUserGroup(record.user || record.userId);
                        const shiftName = getUserShift(record.user || record.userId, record);
                        
                        const tooltipContent = (
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{userName}</div>
                            <div style={{ fontSize: 12, marginBottom: 2 }}>
                              {lang === "vi" ? "Nhóm" : "组"}: {groupName}
                            </div>
                            <div style={{ fontSize: 12 }}>
                              {lang === "vi" ? "Ca làm việc" : "班次"}: {shiftName}
                            </div>
                          </div>
                        );
                        
                        return (
                          <div
                            key={record.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 8,
                              minWidth: 80,
                            }}
                          >
                            <Tooltip title={tooltipContent} placement="top">
                              <div style={{ cursor: "pointer" }}>
                                <PersonIcon status={record.status} size="md" />
                              </div>
                            </Tooltip>
                            <div
                              style={{
                                textAlign: "center",
                                fontSize: 12,
                                color: "#666",
                                maxWidth: 80,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {userName.split(" ").pop()}
                            </div>
                          </div>
                        );
                      })}
                    {activeAttendanceData
                       .filter((record) => {
                         const gid = getUserGroupId(record.user || record.userId);
                         const shiftRaw = getUserShiftRaw(record.user || record.userId, record);
                         return shiftRaw === "Đêm" &&
                                (!groupFilter || groupFilter === "all" || String(gid) === String(groupFilter));
                       }).length === 0 && (
                        <div style={{ width: "100%", textAlign: "center", color: "#999", padding: 20 }}>
                          {lang === "vi" ? "Không có nhân viên ca đêm" : "没有夜班员工"}
                        </div>
                      )}
                  </div>
                </div>
              </Col>
            </Row>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 24,
                paddingTop: 16,
                borderTop: "1px solid #f0f0f0",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Có mặt" size="sm" />
                <span style={{ color: "#666" }}>{t.present}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Nửa ngày" size="sm" />
                <span style={{ color: "#666" }}>{t.halfDay}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Vắng mặt" size="sm" />
                <span style={{ color: "#666" }}>{t.absent}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Nghỉ phép" size="sm" />
                <span style={{ color: "#666" }}>{t.leave}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PersonIcon status="Nghỉ CN" size="sm" />
                <span style={{ color: "#666" }}>{t.weekendOff}</span>
              </div>
            </div>
          </Card>

          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card>
                <h4 style={{ marginBottom: 16 }}>
                  {lang === "vi" ? "Nhân viên có mặt" : "出勤员工"}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {presentFiltered
                    .slice((presentPage - 1) * PAGE_SIZE, presentPage * PAGE_SIZE)
                    .map((record) => {
                      const userId = record.user?.userID || record.userId;
                      const foundUser = users.find((u) => u.userID === userId);
                      const userName = foundUser ? foundUser.fullName : "-";
                      const groupName = getUserGroup(record.user || record.userId);
                      const statusInfo = getStatusTag(record.status);
                      return (
                        <div
                          key={record.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 12,
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar style={{ backgroundColor: "#1890ff" }}>
                              {userName.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 500 }}>{userName}</div>
                              <div style={{ fontSize: 12, color: "#999" }}>
                                {groupName}
                                {record.clockInTime && ` • ${lang === "vi" ? "Vào" : "进入"}: ${record.clockInTime}`}
                                {record.clockOutTime && ` • ${lang === "vi" ? "Ra" : "离开"}: ${record.clockOutTime}`}
                              </div>
                            </div>
                          </div>
                          {statusInfo}
                        </div>
                      );
                    })}
                  {presentFiltered.length === 0 && (
                    <p style={{ textAlign: "center", color: "#999", padding: 20 }}>
                      {lang === "vi" ? "Chưa có nhân viên nào điểm danh" : "暂无员工打卡"}
                    </p>
                  )}
                  {presentFiltered.length > PAGE_SIZE && (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Pagination
                        size="small"
                        current={presentPage}
                        pageSize={PAGE_SIZE}
                        total={presentFiltered.length}
                        showSizeChanger={false}
                        onChange={(p) => setPresentPage(p)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card>
                <h4 style={{ marginBottom: 16 }}>
                  {lang === "vi" ? "Vắng mặt & Nghỉ phép" : "缺勤和请假"}
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {absentFiltered
                    .slice((absentPage - 1) * PAGE_SIZE, absentPage * PAGE_SIZE)
                    .map((record) => {
                      const userId = record.user?.userID || record.userId;
                      const foundUser = users.find((u) => u.userID === userId);
                      const userName = foundUser ? foundUser.fullName : "-";
                      const groupName = getUserGroup(record.user || record.userId);
                      const statusInfo = getStatusTag(record.status);
                      return (
                        <div
                          key={record.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 12,
                            backgroundColor: "#fafafa",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <Avatar style={{ backgroundColor: "#999" }}>
                              {userName.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 500 }}>{userName}</div>
                              <div style={{ fontSize: 12, color: "#999" }}>
                                {groupName}
                                {record.note && ` • ${record.note}`}
                              </div>
                            </div>
                          </div>
                          {statusInfo}
                        </div>
                      );
                    })}
                  {absentFiltered.length === 0 && (
                    <p style={{ textAlign: "center", color: "#999", padding: 20 }}>
                      {lang === "vi" ? "Tất cả nhân viên đều có mặt" : "所有员工都出勤"}
                    </p>
                  )}
                  {absentFiltered.length > PAGE_SIZE && (
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Pagination
                        size="small"
                        current={absentPage}
                        pageSize={PAGE_SIZE}
                        total={absentFiltered.length}
                        showSizeChanger={false}
                        onChange={(p) => setAbsentPage(p)}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {activeTab === "attendance" && (
        <div>
          <div
            style={{
              marginBottom: 16,
              padding: "16px",
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Input
              placeholder={lang === "vi" ? "Tìm kiếm theo tên, mã nhân viên" : "按姓名、员工编号搜索"}
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder={lang === "vi" ? "Lọc theo trạng thái" : "按状态筛选"}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="Có mặt">{t.present}</Option>
              <Option value="Đi muộn">{t.late}</Option>
              <Option value="Nửa ngày">{t.halfDay}</Option>
              <Option value="Vắng mặt">{t.absent}</Option>
              <Option value="Nghỉ phép">{t.leave}</Option>
              <Option value="Nghỉ CN">{t.weekendOff}</Option>
            </Select>
            <Select
              placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
              value={groupFilter}
              onChange={setGroupFilter}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="all">{lang === "vi" ? "Tất cả các nhóm" : "所有组"}</Option>
              {groups.map((group) => (
                <Option key={group.id} value={String(group.id)}>
                  {group.name}
                </Option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setSearchText("");
                setStatusFilter(undefined);
                setGroupFilter(undefined);
              }}
            >
              {lang === "vi" ? "Xóa bộ lọc" : "清除筛选"}
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              marginBottom: 16,
              padding: "12px 0",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.presentCount}: <strong style={{ color: "#333" }}>{filteredStats.present}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ExclamationCircleOutlined style={{ color: "#ff7a45", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.halfDayCount}: <strong style={{ color: "#333" }}>{filteredStats.halfDay}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.absentCount}: <strong style={{ color: "#333" }}>{filteredStats.absent}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StarOutlined style={{ color: "#1890ff", fontSize: 16 }} />
              <span style={{ color: "#666", fontSize: 14 }}>
                {t.leaveCount}: <strong style={{ color: "#333" }}>{filteredStats.leave}</strong>
              </span>
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={filteredAttendanceData}
            rowKey="id"
            loading={loading}
            pagination={{
              current: attendancePagination.current,
              pageSize: attendancePagination.pageSize,
              total: filteredAttendanceData.length,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            onChange={(paginationConfig) => {
              setAttendancePagination({
                current: paginationConfig.current,
                pageSize: paginationConfig.pageSize,
              });
            }}
          />
        </div>
      )}

      {activeTab === "overtime" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{t.overtimeMonthLabel}:</span>
                <DatePicker
                  picker="month"
                  value={overtimeMonth}
                  onChange={(date) => {
                    if (date) {
                      setOvertimeMonth(date);
                    }
                  }}
                  format="MM/YYYY"
                  style={{ width: 160 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Input
                  placeholder={
                    lang === "vi"
                      ? "Tìm kiếm tên/mã nhân viên"
                      : "按姓名、员工编号搜索"
                  }
                  prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                  value={overtimeSearchText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setOvertimeSearchText(value);
                    setOvertimePagination((prev) => ({ ...prev, current: 1 }));
                  }}
                  style={{ width: 260 }}
                  allowClear
                />
                <Select
                  placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
                  value={overtimeGroupFilter}
                  onChange={(value) => {
                    setOvertimeGroupFilter(value);
                    setOvertimePagination((prev) => ({ ...prev, current: 1 }));
                  }}
                  style={{ width: 220 }}
                  allowClear
                >
                  <Option value="all">
                    {lang === "vi" ? "Tất cả các nhóm" : "所有组"}
                  </Option>
                  {groups.map((group) => (
                    <Option key={group.id} value={String(group.id)}>
                      {group.name}
                    </Option>
                  ))}
                </Select>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'overtime_pdf',
                        label: t.exportPDF,
                        icon: <FilePdfOutlined />,
                        onClick: () => handleOvertimeExportPDF()
                      },
                      {
                        key: 'overtime_excel',
                        label: t.exportExcel,
                        icon: <FileExcelOutlined />,
                        onClick: () => handleOvertimeExportExcel()
                      }
                    ]
                  }}
                  trigger={['click']}
                >
                  <Button icon={<DownloadOutlined />}>
                    {t.exportPrint}
                  </Button>
                </Dropdown>
              </div>
            </div>
          </Card>
          
          <Card>
            <style>
              {`
                .ot-target-input .ant-input-number-input {
                  color: #ff0000 !important;
                  font-weight: 700 !important;
                  text-align: center;
                }
                .ot-actual-row-separator .ant-table-cell {
                  border-bottom: 16px solid #f5f5f5 !important;
                }
                /* đảm bảo khoảng cách hiển thị cả ở cột sticky trái/phải */
                .ot-actual-row-separator .ant-table-cell-fixed-left,
                .ot-actual-row-separator .ant-table-cell-fixed-right {
                  box-shadow: inset 0 -16px #f5f5f5;
                }
                /* thêm khoảng tách dưới ô Nhân viên (rowSpan=2) để cảm cụm rõ ràng */
                .ot-employee-cell {
                  box-shadow: inset 0 -16px #f5f5f5;
                }
                /* tách dưới ô Số giờ tăng ca quy định (rowSpan=2, fixed right) */
                .ot-regulation-cell {
                  box-shadow: inset 0 -16px #f5f5f5;
                }
              `}
            </style>
            <div style={{ overflowX: "auto" }}>
              {overtimeLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div>Loading...</div>
                </div>
              ) : (
                <Table
                  columns={getOvertimeMatrixColumns()}
                  dataSource={getOvertimeMatrixData()}
                  pagination={false}
                  scroll={{
                    x: 300 + getDaysInMonth().length * 90 + 390,
                  }}
                  rowKey="key"
                  rowClassName={(record) => record.type === "actual" ? "ot-actual-row-separator" : ""}
                />
              )}
            </div>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <Pagination
                current={overtimePagination.current}
                pageSize={overtimePagination.pageSize}
                total={overtimePagination.total}
                showSizeChanger={false}
                onChange={(page) => {
                  setOvertimePagination((prev) => ({
                    ...prev,
                    current: page,
                  }));
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {hasTrackingAccess && activeTab === "tracking" && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <p style={{ margin: 0, color: "#666" }}>
              {lang === "vi"
                ? "Danh sách nhân viên được theo dõi điểm danh tự động. Hệ thống sẽ tự động tạo điểm danh hàng ngày lúc 00:00 cho các nhân viên có trạng thái 'Hoạt động' bật."
                : "自动考勤跟踪的员工列表。系统将在每天00:00为状态为'正在跟踪'的员工自动生成考勤记录。"}
            </p>
          </Card>

          {/* Filter Bar for Tracking */}
          <div
            style={{
              marginBottom: 16,
              padding: "16px",
              background: "#fff",
              border: "1px solid #e8e8e8",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Input
              placeholder={lang === "vi" ? "Tìm kiếm theo tên, mã nhân viên" : "按姓名、员工编号搜索"}
              prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
              value={trackingSearchText}
              onChange={(e) => setTrackingSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder={lang === "vi" ? "Lọc theo trạng thái" : "按状态筛选"}
              value={trackingActiveFilter}
              onChange={setTrackingActiveFilter}
              style={{ width: 180 }}
              allowClear
            >
              <Option value="active">{t.isActive}</Option>
              <Option value="inactive">{lang === "vi" ? "Không" : "未跟踪"}</Option>
            </Select>
            <Select
              placeholder={lang === "vi" ? "Lọc theo nhóm" : "按组筛选"}
              value={trackingGroupFilter}
              onChange={setTrackingGroupFilter}
              style={{ width: 180 }}
              allowClear
            >
              {groups.map((group) => (
                <Option key={group.id} value={String(group.id)}>
                  {group.name}
                </Option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setTrackingSearchText("");
                setTrackingGroupFilter(undefined);
                setTrackingActiveFilter(undefined);
              }}
            >
              {lang === "vi" ? "Xóa bộ lọc" : "清除筛选"}
            </Button>
          </div>

          <Table
            columns={trackingColumns}
            dataSource={filteredTrackingList}
            rowKey="id"
            loading={loadingUserAttendance}
            pagination={{
              current: trackingPagination.current,
              pageSize: trackingPagination.pageSize,
              total: filteredTrackingList.length,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            onChange={(paginationConfig) => {
              setTrackingPagination({
                current: paginationConfig.current,
                pageSize: paginationConfig.pageSize,
              });
            }}
          />
        </div>
      )}

      <Modal
        title={t.editAttendance}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="userId"
            label={t.employee}
            rules={[{ required: true, message: t.userRequired }]}
          >
            <Select
              placeholder={t.employee}
              disabled={!!editingRecord}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {users.map((user) => (
                <Option key={user.userID} value={user.userID} label={user.fullName}>
                  {user.fullName} ({user.manv || user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="attendanceDate"
            label={t.date}
            rules={[{ required: true, message: t.dateRequired }]}
          >
            <DatePicker 
              style={{ width: "100%" }} 
              format="DD/MM/YYYY" 
              allowClear={false}
              disabled={!!editingRecord}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label={t.status}
            rules={[{ required: true, message: t.statusRequired }]}
          >
            <Select 
              placeholder={t.status}
              onChange={(value) => {
                // Tự động xóa giờ vào/ra khi chọn Vắng mặt, Nghỉ phép, hoặc Nghỉ CN
                if (value === "Vắng mặt" || value === "Nghỉ phép" || value === "Nghỉ CN" ||
                    value === "缺勤" || value === "请假" || value === "周日休") {
                  form.setFieldsValue({
                    clockInTime: null,
                    clockOutTime: null
                  });
                } else if (value === "Có mặt" || value === "Đi muộn" || value === "Nửa ngày" ||
                           value === "出勤" || value === "迟到" || value === "半天") {
                  // Tự động set giờ vào/ra khi chọn Có mặt, Đi muộn, hoặc Nửa ngày
                  const formValues = form.getFieldsValue();
                  const userId = formValues.userId;
                  const record = editingRecord;
                  
                  // Lấy shift từ record hoặc userAttendanceList
                  let shift = null;
                  if (record && record.shift) {
                    shift = record.shift;
                  } else if (userId) {
                    shift = getUserShiftRaw(userId, null);
                  }
                  
                  // Xác định giờ vào/ra dựa trên ca
                  const isNightShift = shift === "Đêm" || shift === "Night";
                  const defaultClockIn = isNightShift ? dayjs("20:00", "HH:mm") : dayjs("08:00", "HH:mm");
                  const defaultClockOut = isNightShift ? dayjs("05:00", "HH:mm") : dayjs("17:00", "HH:mm");
                  
                  // Chỉ set nếu chưa có giá trị
                  const currentClockIn = formValues.clockInTime;
                  const currentClockOut = formValues.clockOutTime;
                  
                  form.setFieldsValue({
                    clockInTime: currentClockIn || defaultClockIn,
                    clockOutTime: currentClockOut || defaultClockOut
                  });
                }
              }}
            >
              <Option value="Có mặt">{t.present}</Option>
              <Option value="Đi muộn">{t.late}</Option>
              <Option value="Nửa ngày">{t.halfDay}</Option>
              <Option value="Vắng mặt">{t.absent}</Option>
              <Option value="Nghỉ phép">{t.leave}</Option>
              <Option value="Nghỉ CN">{t.weekendOff}</Option>
            </Select>
          </Form.Item>

          <Form.Item name="clockInTime" label={t.clockIn}>
            <TimePicker style={{ width: "100%" }} format="HH:mm" />
          </Form.Item>

          <Form.Item name="clockOutTime" label={t.clockOut}>
            <TimePicker style={{ width: "100%" }} format="HH:mm" />
          </Form.Item>

          <Form.Item name="note" label={t.note}>
            <TextArea rows={3} placeholder={t.note} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal thêm nhân viên mới */}
      <Modal
        title={t.addEmployee}
        open={isAddModalVisible}
        onOk={handleAddEmployee}
        onCancel={handleCancelAdd}
        width={500}
      >
        <p style={{ marginBottom: 16, color: "#666" }}>
          {t.addEmployeeDescription}
        </p>
        <Form form={addForm} layout="vertical">
          <Form.Item
            name="userIds"
            label={t.employee}
            rules={[{ required: true, message: t.userRequired }]}
          >
            <Select
              mode="multiple"
              placeholder={t.employee}
              allowClear
              maxTagCount="responsive"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {users.map((user) => (
                <Option key={user.userID} value={user.userID} label={user.fullName}>
                  {user.fullName} ({user.manv || user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="shift"
            label={t.shift}
            initialValue="Ngày"
            rules={[{ required: true, message: lang === "vi" ? "Vui lòng chọn ca" : "请选择班次" }]}
          >
            <Select placeholder={t.shift}>
              <Option value="Ngày">{t.shiftDay}</Option>
              <Option value="Đêm">{t.shiftNight}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AttendancePage;

