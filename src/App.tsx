import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperadminDashboard from './pages/superadmin/SuperadminDashboard';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantLayout from './layouts/TenantLayout';
import TenantChat from './pages/tenant/TenantChat';
import TenantSettings from './pages/tenant/TenantSettings';
import TenantCrmDashboard from './pages/tenant/TenantCrmDashboard';
import TenantContacts from './pages/tenant/TenantContacts';
import TenantPipeline from './pages/tenant/TenantPipeline';
import TenantTags from './pages/tenant/TenantTags';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<Login />} />
          
          {/* Redirigir la ruta raíz */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Rutas Protegidas de SuperAdmin */}
          <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index element={<SuperadminDashboard />} />
            </Route>
          </Route>

          {/* Rutas Protegidas de Tenant */}
          <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'TENANT_ADMIN']} />}>
            <Route path="/tenant/:tenantId" element={<TenantLayout />}>
              <Route path="dashboard" element={<TenantDashboard />} />
              <Route path="chat" element={<TenantChat />} />
              {/* CRM Routes */}
              <Route path="dashboard-crm" element={<TenantCrmDashboard />} />
              <Route path="contacts" element={<TenantContacts />} />
              <Route path="pipeline" element={<TenantPipeline />} />
              <Route path="tags" element={<TenantTags />} />
              <Route path="settings" element={<TenantSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
