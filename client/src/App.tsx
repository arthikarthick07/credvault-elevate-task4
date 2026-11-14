import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { RequireAdmin } from './components/RequireAdmin';
import { SiteLayout } from './components/SiteLayout';
import { AdminApplicationDetail } from './pages/AdminApplicationDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { RequestCertificate } from './pages/RequestCertificate';
import { TrackApplication } from './pages/TrackApplication';
import { VerifyCertificate } from './pages/VerifyCertificate';

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="request" element={<RequestCertificate />} />
        <Route path="track" element={<TrackApplication />} />
        <Route path="verify" element={<VerifyCertificate />} />
      </Route>

      <Route path="admin/login" element={<AdminLogin />} />
      <Route element={<RequireAdmin />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="applications/:applicationId" element={<AdminApplicationDetail />} />
        </Route>
      </Route>

      <Route path="404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
