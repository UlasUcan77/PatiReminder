import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./lib/auth-context";
import { AuthPage } from "./pages/AuthPage";
import { FamilyPage } from "./pages/FamilyPage";
import { PetPage } from "./pages/PetPage";
import { TodayPage } from "./pages/TodayPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/giris" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/giris" element={<AuthPage mode="login" />} />
        <Route path="/kayit" element={<AuthPage mode="register" />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<TodayPage />} />
          <Route path="hayvan/:id" element={<PetPage />} />
          <Route path="aile" element={<FamilyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
