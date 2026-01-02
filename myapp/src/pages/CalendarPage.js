import React, { useState, useEffect, useRef } from "react";
import { Calendar, Modal, Form, Input, Button, message, notification, Card, Space, Popconfirm, Badge, Layout, List, Empty, Spin, Typography, Select, ConfigProvider, Checkbox } from "antd";
import { useSelector } from "react-redux";
import { EditOutlined, DeleteOutlined, PlusOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import "dayjs/locale/zh-cn";
import locale from "antd/locale/vi_VN";
import zhCN from "antd/locale/zh_CN";
import personalNoteService from "../services/personalNoteService";
import { useLanguage } from "../contexts/LanguageContext";
import "./CalendarPage.css";

const { TextArea } = Input;
const { Sider, Content } = Layout;
const { Text, Paragraph } = Typography;

export default function CalendarPage() {
  const { lang } = useLanguage();
  const { nguoiDung } = useSelector(state => state.user || {});
  const [notes, setNotes] = useState([]);
  const [publicNotes, setPublicNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]); // Tất cả notes từ hôm nay trở đi (cho danh sách bên trái)
  const [publicFutureNotes, setPublicFutureNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [calendarValue, setCalendarValue] = useState(dayjs()); // Value để control Calendar component
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form] = Form.useForm();
  const [monthCounts, setMonthCounts] = useState({}); // Map tháng (1-12) -> số lượng ghi chú
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [calendarMode, setCalendarMode] = useState('month');
  const [isChangingMode, setIsChangingMode] = useState(false); // Flag để track khi đang chuyển mode
  const typeChangeHandlerRef = useRef(null); // Lưu reference đến onTypeChange từ headerRender

  const i18n = {
    vi: {
      title: "Lịch Ghi Chú Cá Nhân",
      selectDate: "Chọn ngày để xem hoặc thêm ghi chú",
      addNote: "Thêm Ghi Chú",
      editNote: "Sửa Ghi Chú",
      deleteNote: "Xóa Ghi Chú",
      content: "Nội dung",
      contentPlaceholder: "Nhập nội dung ghi chú...",
      save: "Lưu",
      cancel: "Hủy",
      delete: "Xóa",
      deleteConfirm: "Bạn có chắc chắn muốn xóa ghi chú này?",
      successAdd: "Thêm ghi chú thành công",
      successUpdate: "Cập nhật ghi chú thành công",
      successDelete: "Xóa ghi chú thành công",
      errorLoad: "Không thể tải ghi chú",
      errorSave: "Không thể lưu ghi chú",
      errorDelete: "Không thể xóa ghi chú",
      noNote: "Không có ghi chú",
      date: "Ngày",
      notesList: "Danh Sách Ghi Chú",
      clickToEdit: "Click để xem/sửa",
      today: "Hôm nay",
      notesCount: (count) => `${count} ghi chú`,
      publicVisible: "Hiển thị với tất cả mọi người",
      othersNotes: "Ghi chú của người khác"
    },
    zh: {
      title: "个人日历备注",
      selectDate: "选择日期查看或添加备注",
      addNote: "添加备注",
      editNote: "编辑备注",
      deleteNote: "删除备注",
      content: "内容",
      contentPlaceholder: "输入备注内容...",
      save: "保存",
      cancel: "取消",
      delete: "删除",
      deleteConfirm: "您确定要删除此备注吗？",
      successAdd: "添加备注成功",
      successUpdate: "更新备注成功",
      successDelete: "删除备注成功",
      errorLoad: "无法加载备注",
      errorSave: "无法保存备注",
      errorDelete: "无法删除备注",
      noNote: "没有备注",
      date: "日期",
      notesList: "备注列表",
      clickToEdit: "点击查看/编辑",
      today: "今天",
      notesCount: (count) => `${count} 个备注`,
      publicVisible: "对所有人可见",
      othersNotes: "其他人的备注"
    }
  };
  const t = i18n[lang];

  // Load notes khi component mount
  useEffect(() => {
    loadNotesForCurrentMonth();
    // Load month counts cho năm hiện tại của calendarValue
    loadMonthCountsForYear(calendarValue.year());
    // Load tất cả notes từ hôm nay trở đi cho danh sách bên trái
    loadAllFutureNotes();
  }, []);

  // Load tất cả notes từ ngày hiện tại trở đi (cho danh sách bên trái)
  const loadAllFutureNotes = async () => {
    try {
      const mine = await personalNoteService.getFutureNotes();
      setAllNotes(mine || []);

      const startDate = dayjs().format("YYYY-MM-DD");
      const endDate = dayjs().add(3, "month").endOf("month").format("YYYY-MM-DD");
      const pubs = await personalNoteService.getPublicNotesByRange(startDate, endDate);
      setPublicFutureNotes(Array.isArray(pubs) ? pubs.filter(n => !nguoiDung || n.user?.userID !== nguoiDung.userID) : []);
    } catch (error) {
      console.error("Error loading all future notes:", error);
      setAllNotes([]);
      setPublicFutureNotes([]);
    }
  };

  // Set locale cho dayjs dựa trên ngôn ngữ
  useEffect(() => {
    if (lang === 'vi') {
      dayjs.locale('vi');
    } else if (lang === 'zh') {
      dayjs.locale('zh-cn');
    } else {
      dayjs.locale('en');
    }
  }, [lang]);

  // Bỏ highlight ngày hiện tại và ô được chọn bằng CSS, không dùng DOM hack

  const loadNotesForCurrentMonth = async () => {
    setLoading(true);
    try {
      // Lấy notes trong khoảng 3 tháng (1 tháng trước, tháng hiện tại, 1 tháng sau)
      const startDate = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
      const endDate = dayjs().add(1, "month").endOf("month").format("YYYY-MM-DD");
      const [mine, pub] = await Promise.all([
        personalNoteService.getNotesByDateRange(startDate, endDate),
        personalNoteService.getPublicNotesByRange(startDate, endDate)
      ]);
      setNotes(mine || []);
      setPublicNotes(pub || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.errorLoad,
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  };

  const onPanelChange = (value, mode) => {
    // Nếu đang chuyển mode từ year sang month, không reload notes ngay
    // vì onSelect đã xử lý việc load notes rồi
    if (isChangingMode && mode === 'month' && calendarMode === 'year') {
      setCalendarValue(value);
      setCalendarMode(mode);
      const year = value.year();
      setCurrentYear(year);
      return;
    }
    
    setCalendarMode(mode);
    setCalendarValue(value);
    const year = value.year();
    setCurrentYear(year);
    
    if (mode === 'year') {
      // Load số lượng ghi chú theo tháng cho năm đó
      loadMonthCountsForYear(year);
    } else {
      // Reload notes khi chuyển tháng (chỉ khi không phải đang chuyển mode)
      if (!isChangingMode) {
        loadNotesForMonth(value);
      }
    }
  };

  const loadMonthCountsForYear = async (year) => {
    try {
      const data = await personalNoteService.getMonthCountsForYear(year);
      setMonthCounts(data || {});
    } catch (error) {
      console.error("Error loading month counts:", error);
      setMonthCounts({});
    }
  };

  const onSelect = (value, selectInfo) => {
    // Nếu đang chuyển mode (chọn năm/tháng từ dropdown), không mở modal
    if (isChangingMode) {
      // Không reset isChangingMode ở đây vì nó sẽ được reset sau khi load xong
      return;
    }
    
    // Kiểm tra xem có phải đang thay đổi năm/tháng không (so sánh với calendarValue hiện tại)
    const currentYear = calendarValue.year();
    const currentMonth = calendarValue.month();
    const selectedYear = value.year();
    const selectedMonth = value.month();
    
    // Nếu năm hoặc tháng khác với calendarValue hiện tại, có thể là do dropdown change
    if (currentYear !== selectedYear || currentMonth !== selectedMonth) {
      return;
    }
    
    // Nếu đang ở Year view, khi click vào tháng thì chuyển sang Month view, không mở modal
    if (calendarMode === 'year') {
      setIsChangingMode(true);
      
      // Chuyển sang month view với tháng được chọn
      const monthValue = value.startOf('month'); // Đảm bảo là ngày đầu tháng
      
      // Gọi onTypeChange để Calendar component chuyển sang Month view TRƯỚC
      // Sử dụng setTimeout để đảm bảo state được update đúng thứ tự
      if (typeChangeHandlerRef.current) {
        typeChangeHandlerRef.current('month');
      } else {
        console.warn('typeChangeHandlerRef.current is null, headerRender may not have been called yet');
        // Nếu ref chưa được set, thử lại sau một chút
        setTimeout(() => {
          if (typeChangeHandlerRef.current) {
            typeChangeHandlerRef.current('month');
          }
        }, 100);
      }
      
      // Set state sau khi gọi onTypeChange
      setCalendarValue(monthValue);
      setSelectedDate(monthValue);
      setCalendarMode('month');
      
      // Load notes cho tháng đó
      loadNotesForMonth(monthValue);
      
      // Reset flag sau một chút để tránh race condition
      setTimeout(() => {
        setIsChangingMode(false);
      }, 300);
      
      return;
    }
    
    // Nếu đang ở Month view, mở modal để thêm/sửa ghi chú
    setSelectedDate(value);
    const dateStr = value.format("YYYY-MM-DD");
    const existingNote = notes.find(n => n.noteDate === dateStr);
    
    if (existingNote) {
      setEditingNote(existingNote);
      form.setFieldsValue({
        content: existingNote.content,
        publicVisible: Boolean(existingNote.publicVisible)
      });
    } else {
      setEditingNote(null);
      form.resetFields();
      form.setFieldsValue({ publicVisible: false });
    }
    setIsModalVisible(true);
  };

  const loadNotesForMonth = async (date) => {
    setLoading(true);
    try {
      // Lấy notes trong khoảng 3 tháng (1 tháng trước, tháng hiện tại, 1 tháng sau)
      const startDate = date.subtract(1, "month").startOf("month").format("YYYY-MM-DD");
      const endDate = date.add(1, "month").endOf("month").format("YYYY-MM-DD");
      const [mine, pub] = await Promise.all([
        personalNoteService.getNotesByDateRange(startDate, endDate),
        personalNoteService.getPublicNotesByRange(startDate, endDate)
      ]);
      setNotes(mine || []);
      setPublicNotes(pub || []);
    } catch (error) {
      console.error("Error loading notes:", error);
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.errorLoad,
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  };

  const dateCellRender = (value) => {
    const dateStr = value.format("YYYY-MM-DD");
    const mine = notes.find(n => n.noteDate === dateStr);
    const others = (publicNotes || []).filter(n => n.noteDate === dateStr && (!nguoiDung || n.user?.userID !== nguoiDung.userID));
    const lines = [];
    if (mine && mine.content) {
      const parts = String(mine.content).split('\n').map(l => l.trim()).filter(Boolean);
      parts.forEach(p => lines.push(p));
    }
    others.forEach(n => {
      const parts = String(n.content || "").split('\n').map(l => l.trim()).filter(Boolean);
      parts.forEach(p => lines.push(p));
    });
    const uniqueLines = [];
    const seen = new Set();
    for (const line of lines) {
      const txt = line.startsWith('-') ? line.substring(1).trim() : line.trim();
      const key = txt.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLines.push(txt);
      }
      if (uniqueLines.length >= 3) break;
    }
    const displayLines = uniqueLines;
    if (displayLines.length === 0) return null;
    return (
      <div className="calendar-note-preview">
        {displayLines.map((line, idx) => {
          const text = line;
          return (
            <div key={idx} className="calendar-note-line">
              <span className="calendar-note-bullet" style={{ color: '#1890ff' }}>•</span>
              <span className="calendar-note-text">{text}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const monthCellRender = (value) => {
    const month = value.month() + 1; // dayjs month is 0-based, need 1-12
    const count = monthCounts[month] || 0;
    
    // Luôn kiểm tra nếu có count, không cần check calendarMode vì monthCellRender chỉ được gọi trong Year view
    if (count > 0) {
      return (
        <div className="calendar-month-note-count">
          <div style={{ 
            marginTop: '4px', 
            color: '#1890ff', 
            fontSize: '12px',
            fontWeight: 500
          }}>
            {t.notesCount(count)}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom header render để có dropdown năm với phạm vi rộng (1900-2100)
  const headerRender = ({ value, type, onChange, onTypeChange }) => {
    // Lưu reference đến onTypeChange để có thể gọi từ onSelect
    if (onTypeChange) {
      typeChangeHandlerRef.current = onTypeChange;
    }
    
    const currentYear = value.year();
    const currentMonth = value.month();
    
    // Tạo danh sách năm từ 1900 đến 2100
    const years = [];
    for (let year = 1900; year <= 2100; year++) {
      years.push(year);
    }
    
    const months = [];
    for (let month = 0; month < 12; month++) {
      months.push(month);
    }

    const monthNames = {
      vi: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
           'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
      zh: ['一月', '二月', '三月', '四月', '五月', '六月', 
           '七月', '八月', '九月', '十月', '十一月', '十二月']
    };
    
    const monthLabels = monthNames[lang] || monthNames.vi;

    const handleYearChange = (year) => {
      setIsChangingMode(true);
      const newValue = value.year(year);
      onChange(newValue);
      setCurrentYear(year);
      setCalendarValue(newValue);
      setSelectedDate(newValue);
      // Luôn load month counts nếu đang ở Year view hoặc khi chuyển sang Year view
      if (type === 'year' || calendarMode === 'year') {
        loadMonthCountsForYear(year).finally(() => {
          // Giữ isChangingMode lâu hơn để tránh modal mở
          setTimeout(() => setIsChangingMode(false), 500);
        });
      } else {
        loadNotesForMonth(newValue).finally(() => {
          // Giữ isChangingMode lâu hơn để tránh modal mở
          setTimeout(() => setIsChangingMode(false), 500);
        });
      }
    };

    const handleMonthChange = (month) => {
      setIsChangingMode(true);
      const newValue = value.month(month);
      onChange(newValue);
      setCalendarValue(newValue);
      setSelectedDate(newValue);
      loadNotesForMonth(newValue).finally(() => {
        // Giữ isChangingMode lâu hơn để tránh modal mở
        setTimeout(() => setIsChangingMode(false), 500);
      });
    };

    return (
      <div style={{ padding: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
        <Select
          value={currentYear}
          onChange={handleYearChange}
          style={{ width: 100 }}
          showSearch
          filterOption={(input, option) =>
            String(option?.value || '').includes(input)
          }
          dropdownStyle={{ maxHeight: 400, overflowY: 'auto' }}
          placeholder="Year"
        >
          {years.map(year => (
            <Select.Option key={year} value={year}>
              {year}
            </Select.Option>
          ))}
        </Select>
        
        {type === 'month' && (
          <Select
            value={currentMonth}
            onChange={handleMonthChange}
            style={{ width: 120 }}
            dropdownStyle={{ maxHeight: 400, overflowY: 'auto' }}
            placeholder="Month"
          >
            {months.map(month => (
              <Select.Option key={month} value={month}>
                {monthLabels[month]}
              </Select.Option>
            ))}
          </Select>
        )}
        
        <Space>
          <Button
            type={type === 'month' ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              onTypeChange('month');
              setCalendarMode('month');
            }}
          >
            Month
          </Button>
          <Button
            type={type === 'year' ? 'primary' : 'default'}
            size="small"
            onClick={() => {
              const year = value.year();
              onTypeChange('year');
              setCalendarMode('year');
              setCurrentYear(year);
              // Load month counts khi chuyển sang Year view với năm hiện tại
              loadMonthCountsForYear(year);
            }}
          >
            Year
          </Button>
        </Space>
      </div>
    );
  };

  const handleSave = async () => {
    try {
      const values = await form.getFieldsValue();
      const dateStr = selectedDate.format("YYYY-MM-DD");
      const content = values.content || "";
      const publicVisible = Boolean(values.publicVisible);
      
      if (editingNote) {
        await personalNoteService.saveOrUpdateNote(dateStr, content, publicVisible);
        notification.success({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: t.successUpdate,
          placement: 'bottomRight'
        });
      } else {
        await personalNoteService.saveOrUpdateNote(dateStr, content, publicVisible);
        notification.success({
          message: lang === 'vi' ? 'Hệ thống' : '系统',
          description: t.successAdd,
          placement: 'bottomRight'
        });
      }
      
      setIsModalVisible(false);
      form.resetFields();
      setEditingNote(null);
      await loadNotesForCurrentMonth();
      // Reload all future notes cho danh sách bên trái
      await loadAllFutureNotes();
      // Reload month counts if in year view
      if (calendarMode === 'year') {
        await loadMonthCountsForYear(currentYear);
      }
    } catch (error) {
      if (error.errorFields) {
        // Validation error
        return;
      }
      console.error("Error saving note:", error);
      // Hiển thị message lỗi chi tiết hơn nếu có
      const errorMessage = error.response?.data?.message || error.message || t.errorSave;
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: errorMessage,
        placement: 'bottomRight'
      });
    }
  };

  const handleDelete = async () => {
    try {
      if (editingNote && editingNote.id) {
        await personalNoteService.deleteNote(editingNote.id);
      } else {
        const dateStr = selectedDate.format("YYYY-MM-DD");
        await personalNoteService.deleteNoteByDate(dateStr);
      }
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.successDelete,
        placement: 'bottomRight'
      });
      setIsModalVisible(false);
      form.resetFields();
      setEditingNote(null);
      await loadNotesForCurrentMonth();
      // Reload all future notes cho danh sách bên trái
      await loadAllFutureNotes();
      // Reload month counts if in year view
      if (calendarMode === 'year') {
        await loadMonthCountsForYear(currentYear);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      notification.error({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.errorDelete,
        placement: 'bottomRight'
      });
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingNote(null);
  };

  const handleNoteClick = (note) => {
    const noteDate = dayjs(note.noteDate);
    setSelectedDate(noteDate);
    setEditingNote(note);
    form.setFieldsValue({
      content: note.content,
      publicVisible: Boolean(note.publicVisible)
    });
    setIsModalVisible(true);
  };

  // Danh sách trái: gộp ghi chú của mình + ghi chú công khai của người khác
  const combinedNotes = [
    ...(allNotes || []).map((n) => ({ ...n, source: 'mine' })),
    ...(publicFutureNotes || []).map((n) => ({ ...n, source: 'public' }))
  ].sort((a, b) => dayjs(a.noteDate).valueOf() - dayjs(b.noteDate).valueOf());

  const openModalForDate = (dateObj) => {
    const d = dayjs(dateObj);
    const dateStr = d.format("YYYY-MM-DD");
    const existingNote = notes.find(n => n.noteDate === dateStr);
    setSelectedDate(d);
    if (existingNote) {
      setEditingNote(existingNote);
      form.setFieldsValue({
        content: existingNote.content,
        publicVisible: Boolean(existingNote.publicVisible)
      });
    } else {
      setEditingNote(null);
      form.resetFields();
      form.setFieldsValue({ publicVisible: false });
    }
    setIsModalVisible(true);
  };

  return (
    <div className="calendar-page">
      <Layout style={{ background: "transparent", minHeight: "calc(100vh - 200px)" }}>
        <Sider 
          width={350} 
          style={{ 
            background: "#fff",
            marginRight: "16px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}
        >
          <Card 
            title={
              <Space>
                <FileTextOutlined />
                <span>{t.notesList}</span>
              </Space>
            }
            style={{ height: "100%", borderRadius: "8px" }}
            bodyStyle={{ padding: "16px", height: "calc(100% - 57px)", overflow: "auto" }}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin />
              </div>
            ) : combinedNotes.length === 0 ? (
              <Empty 
                description={t.noNote}
                style={{ marginTop: "40px" }}
              />
            ) : (
              <List
                dataSource={combinedNotes}
                renderItem={(note) => {
                  const noteDate = dayjs(note.noteDate);
                  const isToday = noteDate.isSame(dayjs(), "day");
                  const isPast = noteDate.isBefore(dayjs(), "day");
                  
                  return (
                    <List.Item
                      className={`note-list-item ${isPast ? "note-past" : ""}`}
                      onClick={() => {
                        if (note.source === 'mine') {
                          handleNoteClick(note);
                        } else {
                          openModalForDate(note.noteDate);
                        }
                      }}
                      style={{
                        cursor: "pointer",
                        padding: "12px",
                        marginBottom: "8px",
                        borderRadius: "6px",
                        border: "1px solid #f0f0f0",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#1890ff";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(24,144,255,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#f0f0f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <List.Item.Meta
                        title={
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: "#333" }}>{noteDate.format("DD/MM/YYYY")}</Text>
                            {note.source === 'public' && (
                              <span style={{ fontSize: 12, color: '#999' }}>
                                {lang === 'vi' ? 'Công khai bởi' : '由'} {note.user?.fullName || ''}
                              </span>
                            )}
                          </div>
                        }
                        description={
                          (() => {
                            const content = note.content || '';
                            // Split theo \n để lấy các dòng
                            let lines = content.includes('\n') 
                              ? content.split('\n').filter(line => line.trim())
                              : [content.trim()];
                            
                            // Giới hạn hiển thị tối đa 3 dòng
                            const maxLines = 3;
                            const displayLines = lines.slice(0, maxLines);
                            const hasMore = lines.length > maxLines;
                            
                            return (
                              <div style={{ 
                                marginBottom: 0,
                                color: "#666",
                                fontSize: "13px",
                                lineHeight: "1.6"
                              }}>
                                {displayLines.map((line, index) => {
                                  // Lấy text sau dấu - nếu có, không thì lấy nguyên dòng
                                  const trimmedLine = line.trim();
                                  const displayText = trimmedLine.startsWith('-') 
                                    ? trimmedLine.substring(1).trim() 
                                    : trimmedLine;
                                  
                                  return (
                                    <div key={index} style={{ 
                                      marginBottom: index < displayLines.length - 1 ? '4px' : 0,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <span style={{ color: '#1890ff', marginRight: '4px' }}>-</span>
                                      {displayText}
                                    </div>
                                  );
                                })}
                                {hasMore && (
                                  <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                                    ...
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Sider>

        <Content>
          <Card 
            title={t.title}
            style={{ 
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          >
            <ConfigProvider locale={lang === 'vi' ? locale : lang === 'zh' ? zhCN : undefined}>
              <Calendar
                value={calendarValue}
                onPanelChange={onPanelChange}
                onSelect={onSelect}
                cellRender={calendarMode === 'year' ? monthCellRender : dateCellRender}
                monthCellRender={monthCellRender}
                headerRender={headerRender}
                style={{ width: "100%" }}
              />
            </ConfigProvider>
          </Card>
        </Content>
      </Layout>

      <Modal
        title={editingNote ? t.editNote : t.addNote}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={750}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            label={t.date}
          >
            <Input 
              value={selectedDate.format("DD/MM/YYYY")} 
              disabled 
            />
          </Form.Item>
          
          <Form.Item
            label={t.content}
            name="content"
          >
            <TextArea
              placeholder={t.contentPlaceholder}
              autoSize={{ minRows: 4, maxRows: 12 }}
            />
          </Form.Item>

          <Form.Item name="publicVisible" valuePropName="checked">
            <Checkbox>{t.publicVisible}</Checkbox>
          </Form.Item>

          {(() => {
            const dateStr = selectedDate.format("YYYY-MM-DD");
            const others = (publicNotes || []).filter(n => n.noteDate === dateStr && (!nguoiDung || n.user?.userID !== nguoiDung.userID));
            if (others.length === 0) return null;
            return (
              <div style={{ marginTop: 8 }}>
                <Text strong>{t.othersNotes}</Text>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {others.map((n, idx) => (
                    <div key={n.id || idx} style={{ color: '#666', fontSize: 13 }}>
                      <div style={{ marginBottom: 4, color: '#999' }}>{n.user?.fullName || ''}</div>
                      <TextArea
                        value={String(n.content || '')}
                        readOnly
                        autoSize={{ minRows: 4, maxRows: 16 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <Form.Item>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={handleCancel}>
                {t.cancel}
              </Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                {t.save}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

