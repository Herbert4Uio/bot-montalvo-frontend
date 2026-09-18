import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Si no tiene el rol, mandarlo a su dashboard respectivo o mostrar error
    if (user.role === 'TENANT_ADMIN') {
      return <Navigate to={`/tenant/${user.tenantId}/dashboard`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
