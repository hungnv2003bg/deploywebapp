import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, message, Spin, notification, Modal } from "antd";
import { MailOutlined } from "@ant-design/icons";
import axios from "../plugins/axios";
import { useLanguage } from "../contexts/LanguageContext";

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

export default function SyslogMailSettings({ severity, visible, onCancel }) {
  const { lang } = useLanguage();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const labels = {
    vi: {
      title: "Cấu hình Mail cho Syslog",
      subtitle: (level) => `Cấu hình người nhận mail cho cấp độ: ${level}`,
      mailTo: "Mail To",
      mailCc: "Mail CC",
      mailBcc: "Mail BCC",
      mailToPlaceholder: "user1@example.com, user2@example.com",
      mailCcPlaceholder: "cc1@example.com, cc2@example.com",
      mailBccPlaceholder: "bcc1@example.com, bcc2@example.com",
      save: "Lưu cấu hình",
      cancel: "Hủy",
      saved: "Cài đặt đã được lưu thành công!",
      error: "Có lỗi xảy ra khi lưu cài đặt!",
      loading: "Đang tải...",
    },
    zh: {
      title: "Syslog 邮件配置",
      subtitle: (level) => `配置级别 ${level} 的邮件收件人`,
      mailTo: "收件人",
      mailCc: "抄送",
      mailBcc: "密送",
      mailToPlaceholder: "user1@example.com, user2@example.com",
      mailCcPlaceholder: "cc1@example.com, cc2@example.com",
      mailBccPlaceholder: "bcc1@example.com, bcc2@example.com",
      save: "保存配置",
      cancel: "取消",
      saved: "设置已保存成功！",
      error: "保存设置时出错！",
      loading: "加载中...",
    },
  };
  const t = labels[lang] || labels.vi;

  const loadMailRecipients = async () => {
    if (dataLoaded || !severity) return;
    try {
      const res = await axios.get(`/api/mail-recipients-syslog/${severity}`);
      const list = Array.isArray(res.data) ? res.data : [];
      const mailTo = list.filter(r => r && r.enabled && r.type === 'TO').map(r => r.email).join(', ');
      const mailCc = list.filter(r => r && r.enabled && r.type === 'CC').map(r => r.email).join(', ');
      const mailBcc = list.filter(r => r && r.enabled && r.type === 'BCC').map(r => r.email).join(', ');
      form.setFieldsValue({ mailTo, mailCc, mailBcc });
      setDataLoaded(true);
    } catch (e) {
      console.error('Error loading mail recipients:', e);
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    if (visible && severity) {
      setDataLoaded(false);
      loadMailRecipients();
    }
  }, [visible, severity]);

  const onFinish = async (values) => {
    if (!severity) return;
    setLoading(true);
    try {
      await axios.post(`/api/mail-recipients-syslog/${severity}/replace`, null, {
        params: {
          to: values.mailTo || '',
          cc: values.mailCc || '',
          bcc: values.mailBcc || ''
        }
      });
      notification.success({
        message: lang === 'vi' ? 'Hệ thống' : '系统',
        description: t.saved,
        placement: 'bottomRight'
      });
      onCancel();
    } catch (e) {
      console.error('Error saving mail recipients:', e);
      notification.error({
        message: lang === 'vi' ? 'Lỗi' : '错误',
        description: t.error,
        placement: 'bottomRight'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MailOutlined />
          <span>{t.title}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
        {severity && t.subtitle(severity)}
      </div>
      <Spin spinning={loading && !dataLoaded}>
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={onFinish}
          disabled={loading}
        >
          <Form.Item 
            name="mailTo" 
            label={t.mailTo}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t.mailToPlaceholder}
              disabled={loading}
            />
          </Form.Item>
          
          <Form.Item 
            name="mailCc" 
            label={t.mailCc}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t.mailCcPlaceholder}
              disabled={loading}
            />
          </Form.Item>
          
          <Form.Item 
            name="mailBcc" 
            label={t.mailBcc}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={t.mailBccPlaceholder}
              disabled={loading}
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={onCancel}
              style={{ marginRight: 8 }}
            >
              {t.cancel}
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              disabled={loading}
            >
              {t.save}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}

