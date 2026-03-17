import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useIsTV } from './hooks/useIsTV';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import LivePage from './pages/LivePage';
import VodPage from './pages/VodPage';
import SeriesPage from './pages/SeriesPage';
import SettingsPage from './pages/SettingsPage';
import SplashScreen from './components/SplashScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);
  const isTV = useIsTV();

  // Add tv-mode class to root element for TV-specific CSS
  useEffect(() => {
    if (isTV) {
      document.documentElement.classList.add('tv-mode');
    } else {
      document.documentElement.classList.remove('tv-mode');
    }
  }, [isTV]);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/live" element={<LivePage />} />
            <Route path="/vod" element={<VodPage />} />
            <Route path="/series" element={<SeriesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/live" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
