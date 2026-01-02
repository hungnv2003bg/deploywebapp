import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button, DatePicker, Form, Input, Modal, Space, Spin, Table, Tag, notification, Select, Upload, Popconfirm, List, Dropdown, message } from "antd";
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, UploadOutlined, DownloadOutlined, FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";
import { formatDateShortVN } from "../utils/dateUtils";
import API_CONFIG from "../config/api";

function NetworkConnectionProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { quyenList } = useSelector((state) => state.user);

  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [problems, setProblems] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [uploadFileList, setUploadFileList] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [ownerFilter, setOwnerFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();
  const [dateRange, setDateRange] = useState([]);

  const [userPerms, setUserPerms] = useState({ view: false, edit: false, del: false, create: false });

  const isAdmin = useMemo(() => {
    if (!Array.isArray(quyenList) || quyenList.length === 0) return false;
    return quyenList.some((role) => role === "ADMIN" || role === "ROLE_ADMIN");
  }, [quyenList]);

  const canView = useMemo(() => isAdmin || !!userPerms.view, [isAdmin, userPerms.view]);
  const canEdit = useMemo(() => isAdmin || !!userPerms.edit, [isAdmin, userPerms.edit]);
  const canDelete = useMemo(() => isAdmin || !!userPerms.del, [isAdmin, userPerms.del]);
  const canCreate = useMemo(() => isAdmin || !!userPerms.create, [isAdmin, userPerms.create]);

  const t = useMemo(() => {
    return {
      header: lang === "vi" ? "Sự cố Network Connection" : "网络连接异常记录",
      back: lang === "vi" ? "Quay lại" : "返回",
      addNew: lang === "vi" ? "Thêm sự cố" : "新增异常",
      stt: lang === "vi" ? "STT" : "序号",
      problemContent: lang === "vi" ? "Nội dung sự cố" : "异常内容",
      owner: lang === "vi" ? "Người phụ trách" : "负责人",
      cooperator: lang === "vi" ? "Người phối hợp" : "配合人",
      startTime: lang === "vi" ? "Thời điểm bắt đầu" : "开始时间",
      endTime: lang === "vi" ? "Thời điểm kết thúc" : "结束时间",
      status: lang === "vi" ? "Trạng thái" : "状态",
      note: lang === "vi" ? "Ghi chú" : "备注",
      createdAt: lang === "vi" ? "Ngày tạo" : "创建时间",
      action: lang === "vi" ? "Thao tác" : "操作",
      edit: lang === "vi" ? "Sửa" : "编辑",
      required: lang === "vi" ? "Bắt buộc" : "必填",
      save: lang === "vi" ? "Lưu" : "保存",
      cancel: lang === "vi" ? "Hủy" : "取消",
      modalAdd: lang === "vi" ? "Thêm sự cố" : "新增异常",
      modalEdit: lang === "vi" ? "Sửa sự cố" : "编辑异常",
      system: lang === "vi" ? "Hệ thống" : "系统",
      createdOk: lang === "vi" ? "Thêm sự cố thành công" : "新增异常成功",
      updatedOk: lang === "vi" ? "Cập nhật sự cố thành công" : "更新异常成功",
      failed: lang === "vi" ? "Thao tác thất bại" : "操作失败",
      searchPlaceholder:
        lang === "vi"
          ? "Tìm theo nội dung sự cố..."
          : "按异常内容搜索...",
      filterOwnerPlaceholder: lang === "vi" ? "Lọc theo người phụ trách" : "按负责人筛选",
      filterStatusPlaceholder: lang === "vi" ? "Lọc theo trạng thái" : "按状态筛选",
      filterDatePlaceholder:
        lang === "vi" ? ["Từ ngày", "Đến ngày"] : ["开始日期", "结束日期"],
      clearFilters: lang === "vi" ? "Xóa bộ lọc" : "清除筛选",
      allStatus: lang === "vi" ? "Tất cả" : "全部",
      ownerPh: lang === "vi" ? "Chọn hoặc nhập người phụ trách" : "选择或输入负责人",
      cooperatorPh: lang === "vi" ? "Chọn hoặc nhập người phối hợp" : "选择或输入配合人",
      exportPrint: lang === "vi" ? "Xuất/In" : "导出/打印",
      exportPDF: lang === "vi" ? "In PDF" : "打印PDF",
      exportExcel: lang === "vi" ? "Xuất Excel" : "导出Excel",
    };
  }, [lang]);

  const statusOptions = useMemo(() => {
    if (lang === "vi") {
      return [
        { value: "PENDING", label: "Chưa xử lý" },
        { value: "IN_PROGRESS", label: "Đang xử lý" },
        { value: "DONE", label: "Hoàn thành" },
        { value: "CANCELLED", label: "Đã hủy" },
      ];
    }
    return [
      { value: "PENDING", label: "未处理" },
      { value: "IN_PROGRESS", label: "处理中" },
      { value: "DONE", label: "已完成" },
      { value: "CANCELLED", label: "已取消" },
    ];
  }, [lang]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("/api/users");
      const list = Array.isArray(res.data) ? res.data : [];
      const activeUsers = list.filter((u) => !u.status || u.status === "ACTIVE");
      setUsers(activeUsers);
    } catch {
      setUsers([]);
    }
  }, []);

  const userOptions = useMemo(() => {
    return users.map((user) => {
      const label = user.fullName || user.manv || `User ${user.userID}`;
      return { value: label, label };
    });
  }, [users]);

  const ownerFilterOptions = useMemo(() => {
    const set = new Set();
    problems.forEach((p) => {
      const text = p.owner;
      if (!text) return;
      String(text)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((name) => set.add(name));
    });
    return Array.from(set).map((name) => ({ value: name, label: name }));
  }, [problems]);

  const normalizeToTags = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const fetchConnection = useCallback(async () => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/network-connections/${encodeURIComponent(String(id))}`);
      setConnection(res?.data || null);
    } catch (e) {
      if (e?.response?.status === 403) {
        notification.error({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description:
            lang === "vi"
              ? "Bạn không có quyền xem Network Connection"
              : "您没有查看 Network Connection 的权限",
          placement: "bottomRight",
        });
      }
      setConnection(null);
    }
  }, [id, lang]);

  const fetchProblems = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params = { networkConnectionId: id };
      if (searchText && searchText.trim()) params.search = searchText.trim();
      if (ownerFilter && ownerFilter.trim()) params.owner = ownerFilter.trim();
      if (statusFilter && String(statusFilter).trim()) params.status = String(statusFilter).trim();
      if (dateRange && dateRange[0]) {
        params.startDate = dateRange[0].startOf("day").toISOString();
      }
      if (dateRange && dateRange[1]) {
        params.endDate = dateRange[1].endOf("day").toISOString();
      }
      const res = await axios.get("/api/network-connection-problems", {
        params,
      });
      const data = res?.data;
      setProblems(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e?.response?.status === 403) {
        notification.error({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description:
            lang === "vi"
              ? "Bạn không có quyền xem sự cố Network Connection"
              : "您没有查看 Network Connection 异常的权限",
          placement: "bottomRight",
        });
      }
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [id, searchText, ownerFilter, statusFilter, dateRange, lang]);

  const fetchUserPermissions = useCallback(async () => {
    try {
      const res = await axios.get("/api/network-connections/global/permissions/check");
      const data = res?.data || {};
      setUserPerms({
        view: !!data.view,
        edit: !!data.edit,
        del: !!data.del,
        create: !!data.create,
      });
    } catch {
      setUserPerms({ view: false, edit: false, del: false, create: false });
    }
  }, []);

  const fetchFilesForProblem = useCallback(
    async (problemId) => {
      if (!problemId) {
        setExistingFiles([]);
        return;
      }
      setLoadingFiles(true);
      try {
        const res = await axios.get("/api/network-connection-files", {
          params: { networkConnectionProblemId: problemId },
        });
        const data = res?.data;
        setExistingFiles(Array.isArray(data) ? data : []);
      } catch {
        setExistingFiles([]);
      } finally {
        setLoadingFiles(false);
      }
    },
    []
  );

  const handleOpenFile = (file) => {
    if (!file) return;
    const filePath = file.filePath || file.url || "";
    if (!filePath) return;
    const hasProtocol = /^https?:\/\//i.test(filePath);
    const normalizedPath = hasProtocol ? filePath : API_CONFIG.getApiUrl(filePath);
    window.open(encodeURI(normalizedPath), "_blank");
  };

  useEffect(() => {
    fetchUserPermissions();
    fetchUsers();
  }, [fetchUserPermissions, fetchUsers]);

  useEffect(() => {
    if (!canView) {
      setConnection(null);
      setProblems([]);
      return;
    }
    fetchConnection();
    fetchProblems();
  }, [fetchConnection, fetchProblems, canView]);

  const handleClearFilters = () => {
    setSearchText("");
    setOwnerFilter(undefined);
    setStatusFilter(undefined);
    setDateRange([]);
  };

  const openCreate = () => {
    if (!canCreate) {
      notification.error({
        message: t.system,
        description:
          lang === "vi"
            ? "Bạn không có quyền thêm sự cố Network Connection"
            : "您没有新增 Network Connection 异常的权限",
        placement: "bottomRight",
      });
      return;
    }
    setEditing(null);
    setViewRecord(null);
    setUploadFileList([]);
    setExistingFiles([]);
    form.resetFields();
    form.setFieldsValue({ status: "PENDING" });
    setOpenModal(true);
  };

  const openEdit = (record) => {
    if (!canEdit) {
      notification.error({
        message: t.system,
        description:
          lang === "vi"
            ? "Bạn không có quyền sửa sự cố Network Connection"
            : "您没有编辑 Network Connection 异常的权限",
        placement: "bottomRight",
      });
      return;
    }
    setEditing(record);
    setViewRecord(null);
    setUploadFileList([]);
    setExistingFiles([]);
    form.resetFields();
    form.setFieldsValue({
      problemContent: record?.problemContent ?? null,
      owner: normalizeToTags(record?.owner),
      cooperator: normalizeToTags(record?.cooperator),
      status: record?.status ?? null,
      note: record?.note ?? null,
      startTime: record?.startTime ? dayjs(record.startTime) : null,
      endTime: record?.endTime ? dayjs(record.endTime) : null,
    });
    if (record?.id) {
      fetchFilesForProblem(record.id);
    }
    setOpenModal(true);
  };

  const openView = (record) => {
    if (!canView) {
      notification.error({
        message: t.system,
        description:
          lang === "vi"
            ? "Bạn không có quyền xem sự cố Network Connection"
            : "您没有查看 Network Connection 异常的权限",
        placement: "bottomRight",
      });
      return;
    }
    setViewRecord(record);
    setEditing(null);
    setUploadFileList([]);
    setExistingFiles([]);
    form.resetFields();
    form.setFieldsValue({
      problemContent: record?.problemContent ?? null,
      owner: normalizeToTags(record?.owner),
      cooperator: normalizeToTags(record?.cooperator),
      status: record?.status ?? null,
      note: record?.note ?? null,
      startTime: record?.startTime ? dayjs(record.startTime) : null,
      endTime: record?.endTime ? dayjs(record.endTime) : null,
    });
    if (record?.id) {
      fetchFilesForProblem(record.id);
    }
    setOpenModal(true);
  };

  const handleDelete = async (record) => {
    if (!record?.id) return;
    if (!canDelete) {
      notification.error({
        message: t.system,
        description:
          lang === "vi"
            ? "Bạn không có quyền xóa sự cố Network Connection"
            : "您没有删除 Network Connection 异常的权限",
        placement: "bottomRight",
      });
      return;
    }
    try {
      await axios.delete(`/api/network-connection-problems/${encodeURIComponent(String(record.id))}`);
      notification.success({
        message: t.system,
        description: lang === "vi" ? "Xóa sự cố thành công" : "删除异常成功",
        placement: "bottomRight",
      });
      fetchProblems();
    } catch {
      notification.error({
        message: t.system,
        description: t.failed,
        placement: "bottomRight",
      });
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      const ownerValue = Array.isArray(values.owner) ? values.owner.join(", ") : values.owner || null;
      const cooperatorValue = Array.isArray(values.cooperator)
        ? values.cooperator.join(", ")
        : values.cooperator || null;
      const payload = {
        problemContent: values.problemContent,
        owner: ownerValue,
        cooperator: cooperatorValue,
        status: values.status,
        note: values.note,
        startTime: values.startTime ? values.startTime.toISOString() : null,
        endTime: values.endTime ? values.endTime.toISOString() : null,
        networkConnection: { id: Number(id) },
      };

      if (editing?.id) {
        payload.updatedBy = connection?.updatedBy || connection?.createdBy || null;
        await axios.put(`/api/network-connection-problems/${encodeURIComponent(String(editing.id))}`, payload);
        if (uploadFileList.length > 0) {
          const formData = new FormData();
          uploadFileList.forEach((f) => {
            const raw = f?.originFileObj || f;
            if (raw) formData.append("files", raw);
          });
          await axios.post(
            `/api/network-connection-files/upload/network-connection-problem/${encodeURIComponent(String(editing.id))}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }
        notification.success({
          message: t.system,
          description: t.updatedOk,
          placement: "bottomRight",
        });
      } else {
        payload.createdBy = connection?.createdBy || null;
        const createdRes = await axios.post("/api/network-connection-problems", payload);
        const createdId = createdRes?.data?.id;
        if (createdId && uploadFileList.length > 0) {
          const formData = new FormData();
          uploadFileList.forEach((f) => {
            const raw = f?.originFileObj || f;
            if (raw) formData.append("files", raw);
          });
          await axios.post(
            `/api/network-connection-files/upload/network-connection-problem/${encodeURIComponent(String(createdId))}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }
        notification.success({
          message: t.system,
          description: t.createdOk,
          placement: "bottomRight",
        });
      }

      setOpenModal(false);
      setEditing(null);
      setUploadFileList([]);
      form.resetFields();
      fetchProblems();
    } catch (e) {
      if (e?.errorFields) return;
      notification.error({
        message: t.system,
        description: t.failed,
        placement: "bottomRight",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderStatusLabel = (status) => {
    if (!status) return "-";
    const found = statusOptions.find((opt) => opt.value === status);
    if (found) return found.label;
    return status;
  };

  const columns = useMemo(() => {
    return [
      {
        title: t.stt,
        key: "stt",
        width: 80,
        align: "center",
        render: (_, __, index) => <Tag color="blue">{index + 1}</Tag>,
      },
      {
        title: t.problemContent,
        dataIndex: "problemContent",
        key: "problemContent",
        width: 300,
        render: (v) => (
          <div
            style={{
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={v}
          >
            {v || "-"}
          </div>
        ),
      },
      { title: t.owner, dataIndex: "owner", key: "owner", width: 150 },
      { title: t.cooperator, dataIndex: "cooperator", key: "cooperator", width: 150 },
      {
        title: t.startTime,
        dataIndex: "startTime",
        key: "startTime",
        width: 170,
        render: (v) => (v ? formatDateShortVN(v) : "-"),
      },
      {
        title: t.endTime,
        dataIndex: "endTime",
        key: "endTime",
        width: 170,
        render: (v) => (v ? formatDateShortVN(v) : "-"),
      },
      {
        title: t.status,
        dataIndex: "status",
        key: "status",
        width: 150,
        align: "center",
        render: (v) => {
          if (!v) return "-";
          const code = String(v).toUpperCase();
          let color = "default";
          if (code === "PENDING") color = "gold";
          else if (code === "IN_PROGRESS") color = "blue";
          else if (code === "DONE") color = "green";
          else if (code === "CANCELLED") color = "red";
          return <Tag color={color}>{renderStatusLabel(code)}</Tag>;
        },
      },
      { title: t.note, dataIndex: "note", key: "note", width: 220 },
      {
        title: t.action,
        key: "action",
        width: 160,
        align: "center",
        fixed: "right",
        render: (_, record) => (
          <Space>
            {canView && (
              <Button icon={<EyeOutlined />} onClick={() => openView(record)} />
            )}
            {canEdit && (
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
            )}
            {canDelete && (
              <Popconfirm
                title={lang === "vi" ? "Bạn chắc chắn muốn xóa?" : "确认删除？"}
                onConfirm={() => handleDelete(record)}
                okText={lang === "vi" ? "Xác nhận" : "确认"}
                cancelText={t.cancel}
              >
                <Button danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ];
  }, [lang, t, statusOptions, renderStatusLabel, canView, canEdit, canDelete]);

  const headerText = useMemo(() => {
    if (!connection) return t.header;
    const parts = [
      connection?.connectionType?.typeName,
      connection?.provider?.providerName,
      connection?.line?.lineName,
      connection?.detailAddress,
    ].filter(Boolean);
    return parts.length ? parts.join(" / ") : t.header;
  }, [connection, t]);

  const handleExportPDF = () => {
    try {
      const printWindow = window.open("", "_blank");
      const tableData = problems.map((row, index) => {
        const stt = index + 1;
        const statusDisplay = renderStatusLabel(row.status ? String(row.status).toUpperCase() : "");
        return `
          <tr>
            <td style="text-align:center;">${stt}</td>
            <td style="text-align:left;">${row.problemContent || "-"}</td>
            <td style="text-align:left;">${row.owner || "-"}</td>
            <td style="text-align:left;">${row.cooperator || "-"}</td>
            <td style="text-align:left;">${row.startTime ? formatDateShortVN(row.startTime) : "-"}</td>
            <td style="text-align:left;">${row.endTime ? formatDateShortVN(row.endTime) : "-"}</td>
            <td style="text-align:left;">${row.note || "-"}</td>
            <td style="text-align:center;">${statusDisplay}</td>
          </tr>
        `;
      }).join("");

      const titleText =
        (lang === "vi" ? "Danh sách sự cố" : "异常列表") +
        (connection && headerText ? ` - ${headerText}` : "");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <title>${titleText}</title>
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
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 24px;
              margin-top: 12px;
              color: #000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px 8px;
              font-size: 12px;
            }
            th {
              background-color: #f5f5f5;
              text-align: center;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #fafafa;
            }
          </style>
        </head>
        <body>
          <h1>${titleText}</h1>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>${t.problemContent}</th>
                <th>${t.owner}</th>
                <th>${t.cooperator}</th>
                <th>${t.startTime}</th>
                <th>${t.endTime}</th>
                <th>${t.note}</th>
                <th>${t.status}</th>
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
        message: t.system,
        description:
          (lang === "vi" ? "Lỗi khi in PDF: " : "打印PDF错误: ") +
          (error?.message || ""),
        placement: "bottomRight",
      });
    }
  };

  const handleExportExcel = () => {
    try {
      const hide = message.loading(
        lang === "vi" ? "Đang xuất Excel..." : "正在导出Excel...",
        0
      );

      const headers = [
        "STT",
        t.problemContent,
        t.owner,
        t.cooperator,
        t.startTime,
        t.endTime,
        t.note,
        t.status,
      ];

      const escapeCSV = (str) => {
        if (str === null || str === undefined) return "";
        const s = String(str);
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rowsData = problems.map((row, index) => {
        const stt = index + 1;
        const statusDisplay = renderStatusLabel(
          row.status ? String(row.status).toUpperCase() : ""
        );
        return [
          stt,
          row.problemContent || "-",
          row.owner || "-",
          row.cooperator || "-",
          row.startTime ? formatDateShortVN(row.startTime) : "-",
          row.endTime ? formatDateShortVN(row.endTime) : "-",
          row.note || "-",
          statusDisplay,
        ]
          .map(escapeCSV)
          .join(",");
      });

      const csvRows = [headers.map(escapeCSV).join(","), ...rowsData];
      const csvContent = csvRows.join("\n");
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `NetworkConnectionProblems_${dayjs().format(
        "YYYY-MM-DD_HH-mm-ss"
      )}.csv`;

      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      hide();
    } catch (error) {
      notification.error({
        message: t.system,
        description:
          (lang === "vi" ? "Lỗi khi xuất Excel: " : "导出Excel错误: ") +
          (error?.message || ""),
        placement: "bottomRight",
      });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/leasedline-ftth")}>
          {t.back}
        </Button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{headerText}</h2>
      </div>

      <div
        className="page-filter"
        style={{ marginBottom: 16, padding: 12, background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Space wrap>
            <Input
              placeholder={t.searchPlaceholder}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              placeholder={t.filterOwnerPlaceholder}
              value={ownerFilter}
              onChange={(v) => setOwnerFilter(v || undefined)}
              style={{ width: 220 }}
              allowClear
              showSearch
              options={ownerFilterOptions}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v || [])}
              style={{ width: 260 }}
              format="YYYY-MM-DD"
              placeholder={t.filterDatePlaceholder}
            />
            <Select
              allowClear
              placeholder={t.filterStatusPlaceholder}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 200 }}
              options={statusOptions}
            />
            <Button onClick={handleClearFilters}>{t.clearFilters}</Button>
          </Space>
          <Space>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "pdf",
                    label: t.exportPDF,
                    icon: <FilePdfOutlined />,
                    onClick: () => handleExportPDF(),
                  },
                  {
                    key: "excel",
                    label: t.exportExcel,
                    icon: <FileExcelOutlined />,
                    onClick: () => handleExportExcel(),
                  },
                ],
              }}
              trigger={["click"]}
            >
              <Button icon={<DownloadOutlined />}>{t.exportPrint}</Button>
            </Dropdown>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                {t.addNew}
              </Button>
            )}
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          dataSource={problems}
          columns={columns}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }}
        />
      </Spin>

      <Modal
        open={openModal}
        title={
          viewRecord
            ? lang === "vi"
              ? "Xem chi tiết sự cố"
              : "查看异常详情"
            : editing
              ? t.modalEdit
              : t.modalAdd
        }
        onCancel={() => {
          setOpenModal(false);
          setEditing(null);
          setViewRecord(null);
          setUploadFileList([]);
          setExistingFiles([]);
          form.resetFields();
        }}
        onOk={viewRecord ? undefined : handleSave}
        okText={viewRecord ? (lang === "vi" ? "Đóng" : "关闭") : t.save}
        cancelButtonProps={viewRecord ? { style: { display: "none" } } : undefined}
        confirmLoading={saving}
        width={700}
        destroyOnHidden
        footer={
          viewRecord
            ? [
              <Button key="close" type="primary" onClick={() => {
                setOpenModal(false);
                setViewRecord(null);
                setUploadFileList([]);
                setExistingFiles([]);
                form.resetFields();
              }}>
                {lang === "vi" ? "Đóng" : "关闭"}
              </Button>,
            ]
            : undefined
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="problemContent"
            label={t.problemContent}
            rules={[{ required: true, message: t.required }]}
          >
            <Input.TextArea rows={4} disabled={!!viewRecord} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item name="owner" label={t.owner}>
              <Select
                mode="tags"
                placeholder={t.ownerPh}
                showSearch
                allowClear
                options={userOptions}
                style={{ width: "100%" }}
                disabled={!!viewRecord}
              />
            </Form.Item>
            <Form.Item name="cooperator" label={t.cooperator}>
              <Select
                mode="tags"
                placeholder={t.cooperatorPh}
                showSearch
                allowClear
                options={userOptions}
                style={{ width: "100%" }}
                disabled={!!viewRecord}
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item name="startTime" label={t.startTime}>
              <DatePicker showTime style={{ width: "100%" }} disabled={!!viewRecord} />
            </Form.Item>
            <Form.Item name="endTime" label={t.endTime}>
              <DatePicker showTime style={{ width: "100%" }} disabled={!!viewRecord} />
            </Form.Item>
          </div>

          <Form.Item name="status" label={t.status}>
            <Select
              allowClear
              options={statusOptions}
              placeholder={t.filterStatusPlaceholder}
              disabled={!!viewRecord}
            />
          </Form.Item>

          <Form.Item name="note" label={t.note}>
            <Input.TextArea rows={3} disabled={!!viewRecord} />
          </Form.Item>

          <Form.Item
            label={
              viewRecord
                ? lang === "vi"
                  ? "File đã thêm"
                  : "已上传文件"
                : lang === "vi"
                  ? "File đính kèm"
                  : "附件"
            }
          >
            {viewRecord ? (
              <div>
                {loadingFiles ? (
                  <Spin size="small" />
                ) : existingFiles && existingFiles.length > 0 ? (
                  <List
                    size="small"
                    dataSource={existingFiles}
                    renderItem={(file, index) => (
                      <List.Item>
                        <Button
                          type="link"
                          style={{ padding: 0 }}
                          onClick={() => handleOpenFile(file)}
                        >
                          {file.fileName || `File ${index + 1}`}
                        </Button>
                      </List.Item>
                    )}
                  />
                ) : (
                  <div>{lang === "vi" ? "Không có file" : "没有文件"}</div>
                )}
              </div>
            ) : (
              <>
                {existingFiles && existingFiles.length > 0 && (
                  <List
                    size="small"
                    style={{ marginBottom: 8 }}
                    dataSource={existingFiles}
                    renderItem={(file, index) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="delete"
                            title={lang === "vi" ? "Xóa file này?" : "删除该文件？"}
                            okText={lang === "vi" ? "Xóa" : "删除"}
                            cancelText={t.cancel}
                            onConfirm={async () => {
                              if (!file?.id) return;
                              try {
                                await axios.delete(
                                  `/api/network-connection-files/${encodeURIComponent(String(file.id))}`
                                );
                                setExistingFiles((prev) =>
                                  Array.isArray(prev) ? prev.filter((f) => f.id !== file.id) : []
                                );
                                notification.success({
                                  message: t.system,
                                  description: lang === "vi" ? "Đã xóa file" : "已删除文件",
                                  placement: "bottomRight",
                                });
                              } catch {
                                notification.error({
                                  message: t.system,
                                  description: t.failed,
                                  placement: "bottomRight",
                                });
                              }
                            }}
                          >
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                            />
                          </Popconfirm>,
                        ]}
                      >
                        <Button
                          type="link"
                          style={{ padding: 0 }}
                          onClick={() => handleOpenFile(file)}
                        >
                          {file.fileName || `File ${index + 1}`}
                        </Button>
                      </List.Item>
                    )}
                  />
                )}
                <Upload
                  beforeUpload={() => false}
                  multiple
                  fileList={uploadFileList}
                  onChange={({ fileList }) => setUploadFileList(fileList)}
                  onRemove={(file) => {
                    setUploadFileList((prev) => prev.filter((x) => x.uid !== file.uid));
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />}>
                    {lang === "vi" ? "Chọn file" : "选择文件"}
                  </Button>
                </Upload>
              </>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default NetworkConnectionProblemPage;
