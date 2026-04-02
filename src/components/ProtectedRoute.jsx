import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles, redirectPath }) {
  const role = localStorage.getItem('user_role');

  if (allowedRoles.includes(role)) {
    return <Outlet />;
  }

  return <Navigate to={redirectPath} replace />;
}
