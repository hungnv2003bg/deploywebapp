import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Spin, Table, Tag, Upload, notification, List, Dropdown, message } from "antd";
import { BookOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, UploadOutlined, WifiOutlined, DownloadOutlined, FilePdfOutlined, FileExcelOutlined, SafetyOutlined } from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";
import axios from "../plugins/axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import API_CONFIG from "../config/api";
import NetworkConnectionPermissionModal from "../components/modals/NetworkConnectionPermissionModal";

function LeasedLineFTTHPage() {
  const { lang } = useLanguage();
  const { nguoiDung, quyenList } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const [typeFilter, setTypeFilter] = useState();
  const [providerFilter, setProviderFilter] = useState();
  const [lineFilter, setLineFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();

  const [areas, setAreas] = useState([]);
  const [lines, setLines] = useState([]);
  const [types, setTypes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [supports, setSupports] = useState([]);

  const [openModal, setOpenModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [openContractModal, setOpenContractModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [uploadFileList, setUploadFileList] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [userPerms, setUserPerms] = useState({ view: false, edit: false, del: false, create: false });
  const [openPermissionModal, setOpenPermissionModal] = useState(false);
  const itemStyle = { marginBottom: 8 };

  const t = useMemo(() => {
    return {
      header: lang === "vi" ? "LeadseLine&FTTH" : "专线&FTTH",
      addNew: lang === "vi" ? "Thêm mới" : "新增",
      searchPlaceholder: lang === "vi" ? "Tìm theo địa chỉ / IP / mã kênh..." : "按地址 / IP / 线路编号搜索...",
      detailAddressPlaceholder:
        lang === "vi"
          ? "Nhập địa chỉ chi tiết theo Nhà xưởng/KTX/Tầng/Phòng..."
          : "按厂房/宿舍/楼层/房间填写详细地址",
      clear: lang === "vi" ? "Xóa bộ lọc" : "清除筛选",
      stt: lang === "vi" ? "STT" : "序号",
      area: lang === "vi" ? "Khu vực" : "区域",
      line: lang === "vi" ? "Line" : "线路类型",
      type: lang === "vi" ? "Loại" : "类型",
      provider: lang === "vi" ? "Nhà mạng" : "运营商",
      contract: lang === "vi" ? "Hợp đồng" : "合同",
      support: lang === "vi" ? "Hỗ trợ" : "支持",
      contractInfo: lang === "vi" ? "Thông tin hợp đồng" : "合同信息",
      detailAddress: lang === "vi" ? "Địa chỉ chi tiết" : "详细地址",
      bandwidth: lang === "vi" ? "Băng thông" : "带宽",
      channelCode: lang === "vi" ? "Mã kênh/Account" : "线路编号/账号",
      ipWan: lang === "vi" ? "IP WAN" : "外网IP",
      ipLan: lang === "vi" ? "IP LAN" : "内网IP",
      price: lang === "vi" ? "Giá tiền" : "费用",
      status: lang === "vi" ? "Trạng thái" : "状态",
      action: lang === "vi" ? "Thao tác" : "操作",
      edit: lang === "vi" ? "Sửa" : "编辑",
      del: lang === "vi" ? "Xóa" : "删除",
      exportPrint: lang === "vi" ? "Xuất/In" : "导出/打印",
      exportPDF: lang === "vi" ? "In PDF" : "打印PDF",
      exportExcel: lang === "vi" ? "Xuất Excel" : "导出Excel",
      confirmDelete: lang === "vi" ? "Bạn chắc chắn muốn xóa?" : "确认删除？",
      modalAdd: lang === "vi" ? "Thêm Network Connection" : "新增网络连接",
      modalEdit: lang === "vi" ? "Sửa Network Connection" : "编辑网络连接",
      save: lang === "vi" ? "Lưu" : "保存",
      cancel: lang === "vi" ? "Hủy" : "取消",
      required: lang === "vi" ? "Bắt buộc" : "必填",
      created: lang === "vi" ? "Tạo mới thành công" : "创建成功",
      updated: lang === "vi" ? "Cập nhật thành công" : "更新成功",
      deleted: lang === "vi" ? "Xóa thành công" : "删除成功",
      failed: lang === "vi" ? "Thao tác thất bại" : "操作失败",
      active: lang === "vi" ? "Hoạt động" : "启用",
      inactive: lang === "vi" ? "Tạm dừng" : "暂停",
      selectPlaceholder: lang === "vi" ? "Chọn..." : "请选择...",
    };
  }, [lang]);

  const displayName = useMemo(() => {
    return nguoiDung?.fullName || nguoiDung?.manv || "";
  }, [nguoiDung]);

  const isAdmin = useMemo(() => {
    if (!Array.isArray(quyenList) || quyenList.length === 0) return false;
    return quyenList.some((role) => role === "ADMIN" || role === "ROLE_ADMIN");
  }, [quyenList]);

  const canView = useMemo(() => isAdmin || !!userPerms.view, [isAdmin, userPerms.view]);
  const canEdit = useMemo(() => isAdmin || !!userPerms.edit, [isAdmin, userPerms.edit]);
  const canDelete = useMemo(() => isAdmin || !!userPerms.del, [isAdmin, userPerms.del]);
  const canCreate = useMemo(() => isAdmin || !!userPerms.create, [isAdmin, userPerms.create]);

  const fetchLookups = useCallback(async () => {
    try {
      const [a, l, ty, p, c, s] = await Promise.all([
        axios.get("/api/network-connection-areas"),
        axios.get("/api/network-connection-lines"),
        axios.get("/api/network-connection-types"),
        axios.get("/api/network-connection-providers"),
        axios.get("/api/network-connection-contracts"),
        axios.get("/api/network-connection-supports"),
      ]);
      setAreas(Array.isArray(a.data) ? a.data : []);
      setLines(Array.isArray(l.data) ? l.data : []);
      setTypes(Array.isArray(ty.data) ? ty.data : []);
      setProviders(Array.isArray(p.data) ? p.data : []);
      setContracts(Array.isArray(c.data) ? c.data : []);
      setSupports(Array.isArray(s.data) ? s.data : []);
    } catch {
      setAreas([]);
      setLines([]);
      setTypes([]);
      setProviders([]);
      setContracts([]);
      setSupports([]);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.typeId = typeFilter;
      if (providerFilter) params.providerId = providerFilter;
      if (lineFilter) params.lineId = lineFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get("/api/network-connections", { params });
      const data = res?.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      if (e?.response?.status === 403) {
        notification.error({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description: lang === "vi" ? "Bạn không có quyền xem dữ liệu Network Connection" : "您没有查看该数据的权限",
          placement: "bottomRight",
        });
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, providerFilter, lineFilter, statusFilter, lang]);

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

  useEffect(() => {
    fetchLookups();
    fetchUserPermissions();
  }, [fetchLookups, fetchUserPermissions]);

  useEffect(() => {
    if (!canView) {
      setRows([]);
      return;
    }
    fetchData();
  }, [fetchData, canView]);

  const filteredRows = useMemo(() => {
    if (!searchText) return rows;
    const q = String(searchText).toLowerCase();
    return rows.filter((r) => {
      const fields = [
        r?.detailAddress,
        r?.channelCode,
        r?.ipWan,
        r?.ipLan,
        r?.bandwidth,
        r?.area?.areaName,
        r?.line?.lineName,
        r?.connectionType?.typeName,
        r?.provider?.providerName,
        r?.contract?.contractNumber,
        r?.support?.fullName,
      ];
      return fields.some((f) => String(f || "").toLowerCase().includes(q));
    });
  }, [rows, searchText]);

  const getStatusLabel = (status) => {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "ACTIVE") return lang === "vi" ? "Đang sử dụng" : "使用中";
    if (normalized === "INACTIVE") return lang === "vi" ? "Ngưng sử dụng" : "已停用";
    return "-";
  };

  const handleExportPDF = () => {
    try {
      const printWindow = window.open("", "_blank");
      const tableData = filteredRows.map((row, index) => {
        const stt = (pagination.current - 1) * pagination.pageSize + index + 1;
        const statusDisplay = getStatusLabel(row.status);
        return `
          <tr>
            <td style="text-align:center;">${stt}</td>
            <td style="text-align:left;">${row.connectionType?.typeName || "-"}</td>
            <td style="text-align:left;">${row.provider?.providerName || "-"}</td>
            <td style="text-align:left;">${row.line?.lineName || "-"}</td>
            <td style="text-align:left;">${row.detailAddress || "-"}</td>
            <td style="text-align:left;">${row.channelCode || "-"}</td>
            <td style="text-align:left;">${row.bandwidth || "-"}</td>
            <td style="text-align:left;">${row.ipWan || "-"}</td>
            <td style="text-align:left;">${row.ipLan || "-"}</td>
            <td style="text-align:center;">${statusDisplay}</td>
          </tr>
        `;
      }).join("");

      const titleText = lang === "vi" ? "Danh sách LeadseLine&FTTH" : "专线&FTTH 列表";

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
                <th>${t.type}</th>
                <th>${t.provider}</th>
                <th>${t.line}</th>
                <th>${t.detailAddress}</th>
                <th>${t.channelCode}</th>
                <th>${t.bandwidth}</th>
                <th>${t.ipWan}</th>
                <th>${t.ipLan}</th>
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
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          (lang === "vi" ? "Lỗi khi in PDF: " : "打印PDF错误: ") + (error?.message || ""),
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
        t.type,
        t.provider,
        t.line,
        t.detailAddress,
        t.channelCode,
        t.bandwidth,
        t.ipWan,
        t.ipLan,
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

      const rowsData = filteredRows.map((row, index) => {
        const stt = (pagination.current - 1) * pagination.pageSize + index + 1;
        const statusDisplay = getStatusLabel(row.status);
        return [
          stt,
          row.connectionType?.typeName || "-",
          row.provider?.providerName || "-",
          row.line?.lineName || "-",
          row.detailAddress || "-",
          row.channelCode || "-",
          row.bandwidth || "-",
          row.ipWan || "-",
          row.ipLan || "-",
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
      const fileName = `LeasedLineFTTH_${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.csv`;

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
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          (lang === "vi" ? "Lỗi khi xuất Excel: " : "导出Excel错误: ") +
          (error?.message || ""),
        placement: "bottomRight",
      });
    }
  };

  const handleClearFilters = () => {
    setSearchText("");
    setTypeFilter(undefined);
    setProviderFilter(undefined);
    setLineFilter(undefined);
    setStatusFilter(undefined);
  };

  const fillFormFromRecord = (record) => {
    const contract = record?.contract || null;
    const support = record?.support || null;
    form.setFieldsValue({
      detailAddress: record?.detailAddress ?? null,
      responsibleDepartment: record?.responsibleDepartment ?? null,
      costCode: record?.costCode ?? null,
      bandwidth: record?.bandwidth ?? null,
      channelCode: record?.channelCode ?? null,
      ipWan: record?.ipWan ?? null,
      ipLan: record?.ipLan ?? null,
      price: record?.price ?? null,
      purpose: record?.purpose ?? null,
      note: record?.note ?? null,
      status: record?.status ?? "ACTIVE",
      areaId: record?.area?.id ?? undefined,
      lineId: record?.line?.id ?? undefined,
      typeId: record?.connectionType?.id ?? undefined,
      providerId: record?.provider?.id ?? undefined,
      contractNumber: contract?.contractNumber ?? null,
      contractAppendix: contract?.appendix ?? null,
      contractStartDate: contract?.startDate ? dayjs(contract.startDate) : null,
      contractEndDate: contract?.endDate ? dayjs(contract.endDate) : null,
      contractPersonInCharge: contract?.personInCharge ?? null,
      contractNote: contract?.note ?? null,
      supportFullName: support?.fullName ?? null,
      supportPhoneNumber: support?.phoneNumber ?? null,
      supportHotline: support?.hotline ?? null,
      supportNote: support?.note ?? null,
    });
  };

  const openCreate = () => {
    setViewMode(false);
    setEditingRecord(null);
    setUploadFileList([]);
    setExistingFiles([]);
    form.resetFields();
    form.setFieldsValue({ status: "ACTIVE" });
    setOpenModal(true);
  };

  const handleCreateClick = () => {
    if (!canCreate) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          lang === "vi"
            ? "Bạn không có quyền tạo mới Network Connection"
            : "您没有创建 Network Connection 的权限",
        placement: "bottomRight",
      });
      return;
    }
    openCreate();
  };

  const fetchFilesForConnection = useCallback(async (connectionId) => {
    if (!connectionId) {
      setExistingFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const res = await axios.get("/api/network-connection-files", {
        params: { networkConnectionId: connectionId },
      });
      const data = res?.data;
      setExistingFiles(Array.isArray(data) ? data : []);
    } catch {
      setExistingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const handleOpenFile = (file) => {
    if (!file) return;
    const filePath = file.filePath || file.url || "";
    if (!filePath) return;
    const hasProtocol = /^https?:\/\//i.test(filePath);
    const normalizedPath = hasProtocol ? filePath : API_CONFIG.getApiUrl(filePath);
    window.open(encodeURI(normalizedPath), "_blank");
  };

  const openEdit = (record) => {
    if (!canEdit) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          lang === "vi"
            ? "Bạn không có quyền sửa Network Connection"
            : "您没有编辑 Network Connection 的权限",
        placement: "bottomRight",
      });
      return;
    }
    setViewMode(false);
    setEditingRecord(record);
    setUploadFileList([]);
    setExistingFiles([]);
    form.resetFields();
    fillFormFromRecord(record);
    if (record?.id) {
      fetchFilesForConnection(record.id);
    }
    setOpenModal(true);
  };

  const openView = (record) => {
    if (!canView) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          lang === "vi"
            ? "Bạn không có quyền xem Network Connection"
            : "您没有查看 Network Connection 的权限",
        placement: "bottomRight",
      });
      return;
    }
    setViewMode(true);
    setEditingRecord(record);
    setUploadFileList([]);
    setExistingFiles([]);
    form.resetFields();
    fillFormFromRecord(record);
    if (record?.id) {
      fetchFilesForConnection(record.id);
    }
    setOpenModal(true);
  };

  const openProblems = (record) => {
    if (!canView) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          lang === "vi"
            ? "Bạn không có quyền xem sự cố Network Connection"
            : "您没有查看 Network Connection 异常的权限",
        placement: "bottomRight",
      });
      return;
    }
    if (!record?.id) return;
    navigate(`/leasedline-ftth/${encodeURIComponent(String(record.id))}/problems`);
  };

  const buildPayload = (values, contractId, supportId) => {
    const payload = {
      detailAddress: values.detailAddress,
      responsibleDepartment: values.responsibleDepartment,
      costCode: values.costCode,
      bandwidth: values.bandwidth,
      channelCode: values.channelCode,
      ipWan: values.ipWan,
      ipLan: values.ipLan,
      price: values.price,
      purpose: values.purpose,
      note: values.note,
      status: values.status,
      area: values.areaId ? { id: Number(values.areaId) } : null,
      line: values.lineId ? { id: Number(values.lineId) } : null,
      connectionType: values.typeId ? { id: Number(values.typeId) } : null,
      provider: values.providerId ? { id: Number(values.providerId) } : null,
    };
    if (contractId) payload.contract = { id: contractId };
    if (supportId) payload.support = { id: supportId };
    if (editingRecord?.id) {
      payload.updatedBy = displayName || values.updatedBy || null;
    } else {
      payload.createdBy = displayName || values.createdBy || null;
    }
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validateFields();
      let contractId = editingRecord?.contract?.id || null;
      let supportId = editingRecord?.support?.id || null;

      const hasContractData =
        values.contractNumber ||
        values.contractAppendix ||
        values.contractStartDate ||
        values.contractEndDate ||
        values.contractPersonInCharge ||
        values.contractNote;

      if (hasContractData) {
        const contractPayload = {
          contractNumber: values.contractNumber || "",
          appendix: values.contractAppendix || "",
          startDate: values.contractStartDate ? values.contractStartDate.format("YYYY-MM-DD") : null,
          endDate: values.contractEndDate ? values.contractEndDate.format("YYYY-MM-DD") : null,
          personInCharge: values.contractPersonInCharge || null,
          note: values.contractNote || null,
        };
        if (contractId) {
          contractPayload.updatedBy = displayName || null;
          await axios.put(
            `/api/network-connection-contracts/${encodeURIComponent(String(contractId))}`,
            contractPayload
          );
        } else {
          contractPayload.createdBy = displayName || null;
          const resContract = await axios.post("/api/network-connection-contracts", contractPayload);
          contractId = resContract?.data?.id;
        }
      }

      const hasSupportData =
        values.supportFullName ||
        values.supportPhoneNumber ||
        values.supportHotline ||
        values.supportNote;

      if (hasSupportData) {
        const supportPayload = {
          fullName: values.supportFullName || "",
          phoneNumber: values.supportPhoneNumber || null,
          hotline: values.supportHotline || null,
          note: values.supportNote || null,
        };
        if (supportId) {
          supportPayload.updatedBy = displayName || null;
          await axios.put(
            `/api/network-connection-supports/${encodeURIComponent(String(supportId))}`,
            supportPayload
          );
        } else {
          supportPayload.createdBy = displayName || null;
          const resSupport = await axios.post("/api/network-connection-supports", supportPayload);
          supportId = resSupport?.data?.id;
        }
      }

      const payload = buildPayload(values, contractId, supportId);

      if (editingRecord?.id) {
        await axios.put(`/api/network-connections/${encodeURIComponent(String(editingRecord.id))}`, payload);
        if (uploadFileList.length > 0) {
          const formData = new FormData();
          uploadFileList.forEach((f) => {
            const raw = f?.originFileObj || f;
            if (raw) formData.append("files", raw);
          });
          await axios.post(
            `/api/network-connection-files/upload/network-connection/${encodeURIComponent(String(editingRecord.id))}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }
        notification.success({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description: t.updated,
          placement: "bottomRight",
        });
      } else {
        const createdRes = await axios.post("/api/network-connections", payload);
        const createdId = createdRes?.data?.id;
        if (createdId && uploadFileList.length > 0) {
          const formData = new FormData();
          uploadFileList.forEach((f) => {
            const raw = f?.originFileObj || f;
            if (raw) formData.append("files", raw);
          });
          await axios.post(
            `/api/network-connection-files/upload/network-connection/${encodeURIComponent(String(createdId))}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }
        notification.success({
          message: lang === "vi" ? "Hệ thống" : "系统",
          description: t.created,
          placement: "bottomRight",
        });
      }

      setOpenModal(false);
      setEditingRecord(null);
      setUploadFileList([]);
      form.resetFields();
      fetchLookups();
      fetchData();
    } catch (e) {
      if (e?.errorFields) return;
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.failed,
        placement: "bottomRight",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description:
          lang === "vi"
            ? "Bạn không có quyền xóa Network Connection"
            : "您没有删除 Network Connection 的权限",
        placement: "bottomRight",
      });
      return;
    }
    try {
      await axios.delete(`/api/network-connections/${encodeURIComponent(String(id))}`);
      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: t.deleted,
        placement: "bottomRight",
      });
      fetchData();
    } catch (e) {
      const backendMsg =
        e?.response?.data?.message ||
        (lang === "vi"
          ? "Không thể xóa vì còn dữ liệu liên quan (Sự cố, File...)"
          : "无法删除，因为仍有关联数据（异常、文件等）");
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: backendMsg,
        placement: "bottomRight",
      });
    }
  };

  const columns = useMemo(() => {
    return [
      {
        title: t.stt,
        key: "stt",
        render: (_, __, index) => <Tag color="blue">{(pagination.current - 1) * pagination.pageSize + index + 1}</Tag>,
        width: 80,
        align: "center",
      },
      { title: t.type, dataIndex: ["connectionType", "typeName"], key: "type", width: 140 },
      { title: t.provider, dataIndex: ["provider", "providerName"], key: "provider", width: 140 },
      { title: t.line, dataIndex: ["line", "lineName"], key: "line", width: 140 },
      {
        title: t.detailAddress,
        dataIndex: "detailAddress",
        key: "detailAddress",
        width: 260,
        render: (v) => (
          <div style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v}>
            {v || "-"}
          </div>
        ),
      },
      { title: t.channelCode, dataIndex: "channelCode", key: "channelCode", width: 160 },
      { title: t.bandwidth, dataIndex: "bandwidth", key: "bandwidth", width: 120 },
      { title: t.ipWan, dataIndex: "ipWan", key: "ipWan", width: 130 },
      { title: t.ipLan, dataIndex: "ipLan", key: "ipLan", width: 130 },
      {
        title: t.status,
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center",
        render: (v) => {
          const normalized = String(v || "").toUpperCase();
          let label = "-";
          if (normalized === "ACTIVE") label = t.active;
          else if (normalized === "INACTIVE") label = t.inactive;
          else if (v) label = v;
          return <Tag color={normalized === "ACTIVE" ? "green" : "default"}>{label}</Tag>;
        },
      },
      {
        title: t.action,
        key: "action",
        fixed: "right",
        width: 200,
        align: "center",
        render: (_, record) => (
          <Space>
            {canView && (
              <Button icon={<EyeOutlined />} onClick={() => openView(record)} />
            )}
            {canEdit && (
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
            )}
            {canView && (
              <Button icon={<BookOutlined />} onClick={() => openProblems(record)} />
            )}
            {canDelete && (
              <Popconfirm
                title={t.confirmDelete}
                onConfirm={() => handleDelete(record.id)}
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
  }, [lang, pagination.current, pagination.pageSize, t, canView, canEdit, canDelete]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              background: "#e6f4ff",
              color: "#1677ff",
              borderRadius: 8,
            }}
          >
            <WifiOutlined />
          </span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {t.header}
          </h2>
        </div>
        <Space>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateClick}>
              {t.addNew}
            </Button>
          )}
        </Space>
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
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              allowClear
              placeholder={t.type}
              style={{ width: 160 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={types.map((x) => ({ value: x.id, label: x.typeName }))}
            />
            <Select
              allowClear
              placeholder={t.provider}
              style={{ width: 160 }}
              value={providerFilter}
              onChange={setProviderFilter}
              options={providers.map((x) => ({ value: x.id, label: x.providerName }))}
            />
            <Select
              allowClear
              placeholder={t.line}
              style={{ width: 160 }}
              value={lineFilter}
              onChange={setLineFilter}
              options={lines.map((x) => ({ value: x.id, label: x.lineName }))}
            />
            <Select
              allowClear
              placeholder={t.status}
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ACTIVE", label: t.active },
                { value: "INACTIVE", label: t.inactive },
              ]}
            />
            <Button onClick={handleClearFilters}>{t.clear}</Button>
          </Space>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            {isAdmin && (
              <Button
                icon={<SafetyOutlined />}
                onClick={() => setOpenPermissionModal(true)}
              >
                {lang === "vi" ? "Phân quyền" : "权限"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          dataSource={filteredRows}
          columns={columns}
          scroll={{ x: "max-content" }}
          onRow={(record) => {
            const normalized = String(record?.status || "").toUpperCase();
            if (normalized === "INACTIVE") {
              return { style: { color: "red" } };
            }
            return {};
          }}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, showSizeChanger: true, showQuickJumper: true }}
          onChange={(p) => setPagination({ current: p.current, pageSize: p.pageSize })}
        />
      </Spin>

      <NetworkConnectionPermissionModal
        open={openPermissionModal}
        onCancel={() => setOpenPermissionModal(false)}
        onSaved={() => {
          fetchUserPermissions();
        }}
      />

      <Modal
        open={openModal}
        title={
          viewMode
            ? lang === "vi"
              ? "Xem Network Connection"
              : "查看网络连接"
            : editingRecord
              ? t.modalEdit
              : t.modalAdd
        }
        onCancel={() => {
          setOpenModal(false);
          setEditingRecord(null);
          form.resetFields();
          setUploadFileList([]);
          setExistingFiles([]);
        }}
        onOk={viewMode ? undefined : handleSave}
        okText={t.save}
        cancelText={t.cancel}
        confirmLoading={viewMode ? false : saving}
        width={900}
        destroyOnHidden
        footer={
          viewMode
            ? [
              <Button
                key="close"
                onClick={() => {
                  setOpenModal(false);
                  setEditingRecord(null);
                  form.resetFields();
                  setUploadFileList([]);
                  setExistingFiles([]);
                }}
              >
                {t.cancel}
              </Button>,
            ]
            : undefined
        }
      >
        <Form form={form} layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="providerId" label={t.provider} rules={[{ required: true, message: t.required }]}>
              <Select
                disabled={viewMode}
                showSearch
                optionFilterProp="label"
                placeholder={t.selectPlaceholder}
                options={providers.map((x) => ({ value: x.id, label: x.providerName }))}
              />
            </Form.Item>
            <Form.Item style={itemStyle} name="typeId" label={t.type} rules={[{ required: true, message: t.required }]}>
              <Select
                disabled={viewMode}
                showSearch
                optionFilterProp="label"
                placeholder={t.selectPlaceholder}
                options={types.map((x) => ({ value: x.id, label: x.typeName }))}
              />
            </Form.Item>

            <Form.Item style={itemStyle} name="lineId" label={t.line} rules={[{ required: true, message: t.required }]}>
              <Select
                disabled={viewMode}
                showSearch
                optionFilterProp="label"
                placeholder={t.selectPlaceholder}
                options={lines.map((x) => ({ value: x.id, label: x.lineName }))}
              />
            </Form.Item>
            <Form.Item style={itemStyle} name="areaId" label={t.area} rules={[{ required: true, message: t.required }]}>
              <Select
                disabled={viewMode}
                showSearch
                optionFilterProp="label"
                placeholder={t.selectPlaceholder}
                options={areas.map((x) => ({ value: x.id, label: x.areaName }))}
              />
            </Form.Item>
          </div>

          <Form.Item
            style={itemStyle}
            name="detailAddress"
            label={t.detailAddress}
            rules={[{ required: true, message: t.required }]}
          >
            <Input placeholder={t.detailAddressPlaceholder} readOnly={viewMode} />
          </Form.Item>

          <Form.Item style={itemStyle} name="purpose" label={lang === "vi" ? "Mục đích sử dụng" : "用途"}>
            <Input readOnly={viewMode} />
          </Form.Item>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="channelCode" label={t.channelCode}>
              <Input readOnly={viewMode} />
            </Form.Item>
            <Form.Item style={itemStyle} name="bandwidth" label={t.bandwidth}>
              <Input readOnly={viewMode} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="ipWan" label={t.ipWan}>
              <Input.TextArea rows={3} readOnly={viewMode} />
            </Form.Item>
            <Form.Item style={itemStyle} name="ipLan" label={t.ipLan}>
              <Input.TextArea rows={3} readOnly={viewMode} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="responsibleDepartment" label={lang === "vi" ? "Bộ phận phụ trách" : "负责部门"}>
              <Input readOnly={viewMode} />
            </Form.Item>
            <Form.Item style={itemStyle} name="status" label={t.status} rules={[{ required: true, message: t.required }]}>
              <Select
                disabled={viewMode}
                options={[
                  { value: "ACTIVE", label: t.active },
                  { value: "INACTIVE", label: t.inactive },
                ]}
              />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="costCode" label={lang === "vi" ? "Mã chi phí" : "成本代码"}>
              <Input readOnly={viewMode} />
            </Form.Item>
            <Form.Item style={itemStyle} name="price" label={t.price}>
              <InputNumber style={{ width: "100%" }} min={0} step={1000} disabled={viewMode} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="supportFullName" label={lang === "vi" ? "Họ tên người hỗ trợ" : "支持联系人"}>
              <Input readOnly={viewMode} />
            </Form.Item>
            <Form.Item style={itemStyle} name="supportPhoneNumber" label={lang === "vi" ? "Điện thoại" : "电话"}>
              <Input readOnly={viewMode} />
            </Form.Item>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
            <Form.Item style={itemStyle} name="supportHotline" label="Hotline">
              <Input readOnly={viewMode} />
            </Form.Item>
            <Form.Item style={itemStyle} name="supportNote" label={lang === "vi" ? "Ghi chú hỗ trợ" : "支持备注"}>
              <Input readOnly={viewMode} />
            </Form.Item>
          </div>

          <Form.Item style={itemStyle}>
            <Button block onClick={() => setOpenContractModal(true)}>
              {viewMode
                ? lang === "vi"
                  ? "Xem thông tin hợp đồng"
                  : "查看合同信息"
                : lang === "vi"
                  ? "Xem / chỉnh sửa thông tin hợp đồng"
                  : "查看 / 编辑合同信息"}
            </Button>
          </Form.Item>

          <Form.Item style={itemStyle} name="note" label={lang === "vi" ? "Ghi chú chung" : "备注"}>
            <Input.TextArea rows={3} readOnly={viewMode} />
          </Form.Item>

          <Form.Item
            style={itemStyle}
            label={
              viewMode
                ? lang === "vi"
                  ? "File đã thêm"
                  : "已上传文件"
                : lang === "vi"
                  ? "File (upload)"
                  : "上传文件"
            }
          >
            {viewMode ? (
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
                                  message: lang === "vi" ? "Hệ thống" : "系统",
                                  description:
                                    lang === "vi" ? "Đã xóa file" : "已删除文件",
                                  placement: "bottomRight",
                                });
                              } catch {
                                notification.error({
                                  message: lang === "vi" ? "Hệ thống" : "系统",
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
                  showUploadList
                  fileList={uploadFileList}
                  onChange={({ fileList }) => setUploadFileList(fileList)}
                  onRemove={(file) => {
                    setUploadFileList((prev) => prev.filter((x) => x.uid !== file.uid));
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />}>{lang === "vi" ? "Chọn file" : "选择文件"}</Button>
                </Upload>
              </>
            )}
          </Form.Item>

          <Modal
            open={openContractModal}
            title={t.contractInfo}
            onCancel={() => setOpenContractModal(false)}
            footer={[
              <Button key="close" onClick={() => setOpenContractModal(false)}>
                {t.cancel}
              </Button>,
            ]}
            destroyOnHidden={false}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
              <Form.Item style={itemStyle} name="contractNumber" label={lang === "vi" ? "Số hợp đồng" : "合同编号"}>
                <Input readOnly={viewMode} />
              </Form.Item>
              <Form.Item style={itemStyle} name="contractAppendix" label={lang === "vi" ? "Phụ lục hợp đồng" : "合同附件"}>
                <Input readOnly={viewMode} />
              </Form.Item>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
              <Form.Item style={itemStyle} name="contractStartDate" label={lang === "vi" ? "Ngày bắt đầu" : "开始日期"}>
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" disabled={viewMode} />
              </Form.Item>
              <Form.Item style={itemStyle} name="contractEndDate" label={lang === "vi" ? "Ngày kết thúc" : "结束日期"}>
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" disabled={viewMode} />
              </Form.Item>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 8, rowGap: 8 }}>
              <Form.Item
                style={itemStyle}
                name="contractPersonInCharge"
                label={lang === "vi" ? "Nhân viên phụ trách" : "负责人"}
              >
                <Input readOnly={viewMode} />
              </Form.Item>
              <Form.Item style={itemStyle} name="contractNote" label={lang === "vi" ? "Ghi chú hợp đồng" : "合同备注"}>
                <Input readOnly={viewMode} />
              </Form.Item>
            </div>
          </Modal>
        </Form>
      </Modal>

    </div>
  );
}

export default LeasedLineFTTHPage;
