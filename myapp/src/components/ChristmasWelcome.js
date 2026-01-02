import React, { useEffect } from "react";
import { Modal, Button, Typography, Space, Avatar } from "antd";
import { GiftOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useLanguage } from "../contexts/LanguageContext";
import "../styles/christmas.css";

const { Title, Text } = Typography;

export default function ChristmasWelcome({ open, onClose, eventName, messageText }) {
  const { nguoiDung } = useSelector((state) => state.user);
  const { lang } = useLanguage();
  const isDev = process.env.NODE_ENV !== "production";

  const labels = {
    vi: {
      title: eventName || "Chúc mừng Giáng Sinh!",
      welcome: `Chào mừng, ${nguoiDung?.fullName || "Bạn"} 🎄`,
      message: messageText,
      continue: "Tiếp tục",
    },
    zh: {
      title: eventName || "圣诞快乐！",
      welcome: `欢迎，${nguoiDung?.fullName || "您"} 🎄`,
      message: messageText,
      continue: "继续",
    },
  };
  const t = labels[lang];

  const flakes = Array.from({ length: 30 }, (_, i) => {
    const left = `${Math.random() * 100}%`;
    const size = 6 + Math.random() * 6;
    const duration = 4 + Math.random() * 4;
    const delay = Math.random() * 2;
    const blur = Math.random() * 1.5;
    return { id: i, left, size, duration, delay, blur };
  });

  useEffect(() => {
    if (open) {
      if (isDev) {
        console.log("[XMAS] ChristmasWelcome open");
      }
    }
  }, [open]);

  return (
    <>
      {open &&
        flakes.map((f) => (
          <div
            key={f.id}
            className="christmas-snowflake"
            style={{
              left: f.left,
              width: f.size,
              height: f.size,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              filter: `blur(${f.blur}px)`,
            }}
          />
        ))}

      <Modal
        open={open}
        onCancel={onClose}
        zIndex={2000}
        footer={
          <Button type="primary" onClick={onClose} icon={<GiftOutlined />}>
            {t.continue}
          </Button>
        }
        centered
        maskClosable
        destroyOnHidden
        wrapClassName="christmas-modal"
      >
        <div className="christmas-container">
          <Space size="large" direction="vertical" style={{ width: "100%" }}>
            <div className="christmas-header">
              <Avatar
                size={64}
                style={{ backgroundColor: "#f5222d" }}
                icon={<GiftOutlined />}
              />
              <Title level={2} style={{ color: "#fff", margin: 0 }}>
                {t.title}
              </Title>
            </div>
            <Text style={{ color: "#fff", fontSize: 16 }}>{t.welcome}</Text>
            <Text style={{ color: "rgba(255,255,255,0.9)" }}>{t.message}</Text>
          </Space>
        </div>
      </Modal>
    </>
  );
}
