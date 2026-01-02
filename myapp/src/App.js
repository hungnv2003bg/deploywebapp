import React, { useEffect, useState } from "react";
import { Layout, Button } from "antd";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./redux/store";
import MenuLeft from "./components/MenuLeft";
import Footer from "./components/Footer";
import AuthButtons from "./component/login/AuthButtons";
import Login from "./component/login/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import SOPListPage from "./pages/SOPListPage";
import SOPDetailPage from "./pages/SOPDetailPage";
import ChecklistPage from "./pages/ChecklistPage";
import DashboardPage from "./pages/DashboardPage";
import ImprovementPage from "./pages/ImprovementPage";
import ChecklistDetailPage from "./pages/ChecklistDetailPage";
import ProfilePage from "./pages/ProfilePage";
import AccountPage from "./pages/AccountPage";
import GroupPage from "./pages/GroupPage";
import AttendancePage from "./pages/AttendancePage";
import SettingsPage from "./pages/SettingsPage";
import CalendarPage from "./pages/CalendarPage";
import SyslogPage from "./pages/SyslogPage";
import FirewallPage from "./pages/FirewallPage";
import LeasedLineFTTHPage from "./pages/LeasedLineFTTHPage";
import NetworkConnectionProblemPage from "./pages/NetworkConnectionProblemPage";
import userSlice from "./redux/userSlice";
import axios from "./plugins/axios";
import { clearAuthData, getAuthData } from "./utils/authUtils";
import { MenuRefreshProvider } from "./contexts/MenuRefreshContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import LimitSizeInitializer from "./components/LimitSizeInitializer";
import "./styles/App.css";
import ChristmasWelcome from "./components/ChristmasWelcome";
import { useLanguage } from "./contexts/LanguageContext";
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";

const { Sider, Content, Header } = Layout;

function AppContent() {
  const dispatch = useDispatch();
  const { token, nguoiDung, quyenList } = useSelector(state => state.user);
  const [sopCategories, setSopCategories] = useState([]);
  const location = useLocation();
  const [showChristmasWelcome, setShowChristmasWelcome] = useState(false);
  const [bannerEventName, setBannerEventName] = useState(null);
  const [bannerMessage, setBannerMessage] = useState(null);
  const { lang } = useLanguage();
  const isDev = process.env.NODE_ENV !== "production";
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [siderBroken, setSiderBroken] = useState(false);

  const hasPermissionAccess = () => {
    return quyenList && quyenList.some(role =>
      role === "ROLE_ADMIN" || role === "ROLE_MANAGER"
    );
  };

  useEffect(() => {
    const authData = getAuthData();

    if (authData) {
      dispatch(userSlice.actions.dangNhap(authData));
    } else {
      dispatch(userSlice.actions.dangXuat());
    }

    const fetchSOPCategories = async () => {
      try {
        const isAdmin = hasPermissionAccess();
        const response = await axios.get("/api/sops", {
          params: {
            page: 0,
            size: 1000,
            visibleOnly: !isAdmin
          }
        });
        const sopsData = Array.isArray(response.data)
          ? response.data
          : (response.data && Array.isArray(response.data.content) ? response.data.content : []);

        const categories = sopsData
          .filter(sop => sop.id)
          .map(sop => sop.id.toString());
        setSopCategories(categories);
      } catch (error) {
        console.warn('Failed to fetch SOP categories:', error);
        if (hasPermissionAccess()) {
          setSopCategories(['cài-win', 'cài-network', 'hướng-dẫn-tải-phần-mềm']);
        } else {
          setSopCategories([]);
        }
      }
    };

    if (authData) {
      fetchSOPCategories();
    }
  }, [dispatch]);

  useEffect(() => {
    const { pathname } = location;
    let pageTitle = "";
    if (pathname === "/" || pathname.startsWith("/dashboard")) {
      pageTitle = "Dashboard";
    } else if (pathname === "/sops") {
      pageTitle = "SOPs";
    } else if (pathname.startsWith("/sops/")) {
      pageTitle = "SOP Details";
    } else if (pathname.startsWith("/checklist")) {
      pageTitle = "Checklist";
    } else if (pathname.startsWith("/improvement")) {
      pageTitle = "Improvements";
    } else if (pathname.startsWith("/account")) {
      pageTitle = "Account";
    } else if (pathname.startsWith("/groups")) {
      pageTitle = "Groups";
    } else if (pathname.startsWith("/attendance")) {
      pageTitle = "Attendance";
    } else if (pathname.startsWith("/note")) {
      pageTitle = "Note";
    } else if (pathname.startsWith("/profile")) {
      pageTitle = "Profile";
    } else if (pathname.startsWith("/settings")) {
      pageTitle = "Settings";
    } else if (pathname.startsWith("/syslog")) {
      pageTitle = "Syslog";
    } else if (pathname.startsWith("/leasedline-ftth")) {
      pageTitle = "LeasedLine&FTTH";
    } else if (pathname.startsWith("/login")) {
      pageTitle = "Login";
    }
    document.title = pageTitle;
  }, [location]);

  useEffect(() => {
    if (token && nguoiDung && nguoiDung.userID !== -1) {
      const rawFlag = localStorage.getItem("loginCelebration");
      const flag = rawFlag === "1";
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      const lastShown = localStorage.getItem("xmasLastShownDate");
      const shouldShowDaily = lastShown !== todayKey;
      const lastTokenSession = sessionStorage.getItem("lastToken");
      const isLoginEvent = !!token && lastTokenSession !== token;
      try {
        sessionStorage.setItem("lastToken", token);
      } catch (e) { }
      const fetchActive = async () => {
        try {
          const resp = await axios.get("/api/banner-events/active");
          const data = Array.isArray(resp.data) ? resp.data : [];
          const active = data.length > 0;
          const name = active ? (data[0]?.nameEvent || null) : null;
          setBannerEventName(name);
          const msgVi = active ? (data[0]?.messageVi || null) : null;
          const msgZh = active ? (data[0]?.messageZh || null) : null;
          const msg = lang === "zh" ? (msgZh || null) : (msgVi || null);
          setBannerMessage(msg);
          if (active && (flag || isLoginEvent || shouldShowDaily)) {
            if (isDev) {
              console.log("[XMAS] opening banner");
            }
            setShowChristmasWelcome(true);
            try {
              if (!isLoginEvent && !flag) {
                localStorage.setItem("xmasLastShownDate", todayKey);
              }
            } catch (e) { }
          }
        } catch (error) {
          if (isDev) {
            console.warn("[XMAS] banner-events API error, fallback client check", error);
          }
          const isInWindow =
            now.getMonth() === 11 && now.getDate() >= 20 && now.getDate() <= 25;
          if (isInWindow && (flag || isLoginEvent || shouldShowDaily)) {
            setShowChristmasWelcome(true);
            try {
              if (!isLoginEvent && !flag) {
                localStorage.setItem("xmasLastShownDate", todayKey);
              }
            } catch (e) { }
          }
        } finally {
          try {
            localStorage.removeItem("loginCelebration");
          } catch (e) { }
        }
      };
      fetchActive();
    }
  }, [token, nguoiDung, lang]);

  if (!token || !nguoiDung || nguoiDung.userID === -1) {
    return <Login />;
  }

  return (
    <Layout style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <ChristmasWelcome open={showChristmasWelcome} onClose={() => setShowChristmasWelcome(false)} eventName={bannerEventName} messageText={bannerMessage} />
      <Header
        style={{
          background: "#fff",
          padding: "0 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          borderBottom: "1px solid #e8e8e8",
          position: "sticky",
          top: 0,
          zIndex: 1000
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {siderBroken && (
            <Button
              type="text"
              icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setSiderCollapsed(!siderCollapsed)}
              style={{ fontSize: 18 }}
            />
          )}
          <img
            src="/images.png"
            alt="Logo"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px"
            }}
          />
          <h2 className="app-header-title" style={{
            color: "#333",
            margin: 0,
            fontWeight: "600"
          }}>
            IT Management System
          </h2>
        </div>
        <AuthButtons />
      </Header>

      <Layout style={{ flex: 1 }}>
        <Sider
          width={220}
          collapsedWidth={0}
          collapsible
          breakpoint="md"
          collapsed={siderCollapsed}
          onCollapse={(c) => setSiderCollapsed(c)}
          onBreakpoint={(broken) => { setSiderBroken(broken); setSiderCollapsed(broken); }}
          trigger={null}
          style={{ background: "#fff" }}
        >
          <MenuLeft />
        </Sider>

        <Layout>
          <Content style={{ padding: "16px", flex: 1, minWidth: 0 }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sops" element={<SOPListPage />} />
              <Route
                path="/sops/:id"
                element={
                  <ProtectedRoute>
                    <SOPDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/checklist" element={<ChecklistPage />} />
              <Route path="/improvement" element={<ImprovementPage />} />
              <Route
                path="/account"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <GroupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/attendance"
                element={<AttendancePage />}
              />
              <Route
                path="/note"
                element={<CalendarPage />}
              />
              <Route
                path="/calendar"
                element={<Navigate to="/note" replace />}
              />
              <Route path="/checklist/:id/details" element={<ChecklistDetailPage />} />
              <Route path="/checklist-detail/:id" element={<ChecklistDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/syslog" element={<SyslogPage />} />
              <Route path="/firewall" element={<FirewallPage />} />
              <Route path="/leasedline-ftth" element={<LeasedLineFTTHPage />} />
              <Route path="/leasedline-ftth/:id/problems" element={<NetworkConnectionProblemPage />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>

      <Footer />
    </Layout>
  );
}

function App() {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <MenuRefreshProvider>
          <LimitSizeInitializer>
            <AppContent />
          </LimitSizeInitializer>
        </MenuRefreshProvider>
      </LanguageProvider>
    </Provider>
  );
}

export default App;

