import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { IncidentDetailPage } from "./pages/IncidentDetailPage";
import { NewIncidentPage } from "./pages/NewIncidentPage";
import { AuditPage } from "./pages/AuditPage";
import type { Role } from "./api";

function Guard({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-10 text-slate-400">Loading session…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Guard>
              <Layout />
            </Guard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/new" element={<NewIncidentPage />} />
          <Route path="incidents/:id" element={<IncidentDetailPage />} />
          <Route
            path="audit"
            element={
              <Guard roles={["ADMIN", "SECURITY_ANALYST"]}>
                <AuditPage />
              </Guard>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
