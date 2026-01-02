import React, { useEffect, useState } from "react";
import { Layout, Menu, Form, InputNumber, Card, message, notification, Button, Spin, Checkbox } from "antd";
import { SettingOutlined, MailOutlined, HddOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";
import { limitSizeService } from "../services/limitSizeService";
import MailChecklistDetailSettings from "../components/MailChecklistDetailSettings";
import MailChecklistDetailManagement from "../components/MailChecklistDetailManagement";
import MailSignupSettings from "../components/MailSignupSettings";
import MailSignupManagement from "../components/MailSignupManagement";
import MailRecipientManagement from "../components/MailRecipientManagement";
import MailImprovementDoneSettings from "../components/MailImprovementDoneSettings";
import syslogSettingsService from "../services/syslogSettingsService";

const syslogSeverities = [
  "Emergency",
  "Alert",
  "Critical",
  "Error",
  "Warning",
  "Notice",
  "Info",
  "Debug",
];

function SyslogConfigSection() {
  const { lang } = useLanguage();
  const [checkedList, setCheckedList] = useState(syslogSeverities);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await syslogSettingsService.getVisibleSeverities();
        if (Array.isArray(data) && data.length > 0) {
          setCheckedList(data);
        }
      } catch (error) {
        console.error("Error loading syslog visibility config:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!checkedList || checkedList.length === 0) {
      message.error(lang === "vi" ? "Chọn ít nhất 1 cấp độ để hiển thị" : "至少选择一个级别");
      return;
    }
    setLoading(true);
    try {
      await syslogSettingsService.updateVisibleSeverities(checkedList);
      notification.success({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: lang === "vi" ? "Đã lưu cấu hình Syslog" : "已保存 Syslog 配置",
        placement: "bottomRight",
      });
    } catch (error) {
      console.error("Error saving syslog visibility config:", error);
      notification.error({
        message: lang === "vi" ? "Hệ thống" : "系统",
        description: lang === "vi" ? "Không thể lưu cấu hình" : "无法保存配置",
        placement: "bottomRight",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={lang === "vi" ? "Cấu hình Syslog (ẩn/hiện cấp độ)" : "Syslog 配置"}
      bordered
    >
      <div style={{ marginBottom: 12, color: "#666" }}>
        {lang === "vi"
          ? "Chỉ những cấp độ được bật mới xuất hiện ở trang Syslog để giảm tải dữ liệu."
          : "仅启用的级别会在 Syslog 页面显示，用于减少数据加载。"}
      </div>
      <Checkbox.Group
        options={syslogSeverities}
        value={checkedList}
        onChange={(vals) => setCheckedList(vals)}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}
      />
      <div style={{ marginTop: 16 }}>
        <Button type="primary" onClick={handleSave} loading={loading} disabled={loading}>
          {lang === "vi" ? "Lưu" : "保存"}
        </Button>
      </div>
    </Card>
  );
}

const { Sider, Content } = Layout;

function FileLimitSection() {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(null);
  const [limitId, setLimitId] = useState(null);

  const labels = {
    vi: {
      title: "Giới hạn kích thước file upload (MB)",
      placeholder: "Nhập giới hạn kích thước file (MB)",
      saved: "Cài đặt đã được lưu thành công!",
      required: "Vui lòng nhập giới hạn kích thước file!",
      range: "Giới hạn phải từ 1 đến 1000 MB!",
      loading: "Đang tải...",
      error: "Có lỗi xảy ra khi tải cài đặt!",
      refresh: "Làm mới",
    },
    zh: {
      title: "文件上传大小限制 (MB)",
      placeholder: "输入文件大小限制 (MB)",
      saved: "设置已保存成功！",
      required: "请输入文件大小限制！",
      range: "限制必须在1到1000 MB之间！",
      loading: "加载中...",
      error: "加载设置时出错！",
      refresh: "刷新",
    },
  };
  const t = labels[lang];

  const loadCurrentLimit = async () => {
    setLoading(true);
    try {
      const response = await limitSizeService.getFileUploadLimit();
      setCurrentLimit(response.maxSizeMb);
      form.setFieldsValue({ maxFileSize: response.maxSizeMb });
      
      const allLimits = await limitSizeService.getActiveLimitSizes();
      const fileUploadLimit = allLimits.find(limit => limit.settingName === 'FILE_UPLOAD_LIMIT');
      if (fileUploadLimit) {
        setLimitId(fileUploadLimit.id);
      }
    } catch (error) {
      console.error('Error loading file upload limit:', error);
      const fallbackLimit = parseInt(localStorage.getItem("maxFileSizeMB") || "10");
      setCurrentLimit(fallbackLimit);
      form.setFieldsValue({ maxFileSize: fallbackLimit });
      message.warning(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentLimit();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (limitId) {
        await limitSizeService.updateLimitSize(limitId, {
          settingName: 'FILE_UPLOAD_LIMIT',
          maxSizeMb: values.maxFileSize,
          description: 'Giới hạn kích thước file upload',
          isActive: true,
          updatedBy: 1 
        });
      } else {
        await limitSizeService.createLimitSize({
          settingName: 'FILE_UPLOAD_LIMIT',
          maxSizeMb: values.maxFileSize,
          description: 'Giới hạn kích thước file upload',
          isActive: true,
          createdBy: 1
        });
      }
      
      localStorage.setItem("maxFileSizeMB", values.maxFileSize.toString());
      setCurrentLimit(values.maxFileSize);
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.saved,
        placement: 'bottomRight'
      });
    } catch (error) {
      console.error('Error saving file upload limit:', error);
      notification.error({ message: lang === 'vi' ? 'Hệ thống' : '系统', description: error.response?.data?.error || 'Có lỗi xảy ra khi lưu cài đặt!', placement: 'bottomRight' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t.title}</span>
          {}
        </div>
      } 
      bordered
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="maxFileSize"
            rules={[
              { required: true, message: t.required },
              { type: "number", min: 1, max: 1000, message: t.range },
            ]}
          >
            <InputNumber 
              style={{ width: 240 }} 
              min={1} 
              max={1000} 
              addonAfter="MB" 
              placeholder={t.placeholder}
              disabled={loading}
            />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              disabled={loading}
            >
              {lang === 'vi' ? 'Lưu' : '保存'}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
}

export default function SettingsPage() {
  const { lang } = useLanguage();

  const labels = {
    vi: {
      menuTitle: "Cài đặt hệ thống",
      fileLimit: "Giới hạn kích thước file upload (MB)",
      mail: "Cài đặt thông báo mail sops",
      mailManage: "Quản lý danh sách mail SOPs",
      mailChecklistDetail: "Thông báo hoàn thành checklistdetail",
      mailChecklistDetailManage: "Quản lý danh sách mail checklistdetail",
      mailSignup: "Thông báo nhận mail đăng ký",
      mailSignupManage: "Quản lý danh sách mail đăng ký",
      syslogConfig: "Cấu hình Syslog",
      building: "Tính năng đang được phát triển.",
    },
    zh: {
      menuTitle: "系统设置",
      fileLimit: "文件上传大小限制 (MB)",
      mail: "SOPS 邮件通知设置",
      mailManage: "管理SOPs邮件列表",
      mailChecklistDetail: "事件管理详情完成邮件通知设置",
      mailChecklistDetailManage: "管理清单详情邮件列表",
      mailSignup: "注册邮件通知设置",
      mailSignupManage: "管理注册邮件列表",
      syslogConfig: "Syslog 配置",
      building: "该功能正在开发中。",
    },
  };
  const t = labels[lang];

  const [selectedKey, setSelectedKey] = React.useState("file");

  const menuItems = [
    { key: "file", icon: <HddOutlined />, label: t.fileLimit },
    { key: "mail", icon: <MailOutlined />, label: t.mail },
    { key: "mailManage", icon: <UserOutlined />, label: t.mailManage },
    { key: "mailChecklistDetail", icon: <MailOutlined />, label: t.mailChecklistDetail },
    { key: "mailChecklistDetailManage", icon: <UserOutlined />, label: t.mailChecklistDetailManage },
    { key: "mailSignup", icon: <MailOutlined />, label: t.mailSignup },
    { key: "mailSignupManage", icon: <UserOutlined />, label: t.mailSignupManage },
    { key: "mailImprovementDone", icon: <MailOutlined />, label: "Thông báo nhận mail cải thiện" },
    { key: "syslogConfig", icon: <SettingOutlined />, label: t.syslogConfig },
  ];

  const renderContent = () => {
    if (selectedKey === "file") return <FileLimitSection />;
    if (selectedKey === "mailManage") {
      return <MailRecipientManagement />;
    }
    if (selectedKey === "mailChecklistDetail") {
      return <MailChecklistDetailSettings />;
    }
    if (selectedKey === "mailChecklistDetailManage") {
      return <MailChecklistDetailManagement />;
    }
    if (selectedKey === "mailSignup") {
      return <MailSignupSettings />;
    }
    if (selectedKey === "mailSignupManage") {
      return <MailSignupManagement />;
    }
    if (selectedKey === "mailImprovementDone") {
      return <MailImprovementDoneSettings />;
    }
    if (selectedKey === "syslogConfig") {
      return <SyslogConfigSection />;
    }
    return (
      <Card title={t.mail} bordered>
        <div>{t.building}</div>
      </Card>
    );
  };

  return (
    <Layout style={{ background: "transparent" }}>
      <Sider width={280} style={{ background: "#fff", padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <SettingOutlined /> {t.menuTitle}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(info) => setSelectedKey(info.key)}
          items={menuItems}
        />
      </Sider>
      <Content style={{ padding: 16 }}>{renderContent()}</Content>
    </Layout>
  );
}


