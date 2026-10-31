import { Navigate } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '@/lib/auth-context';
import type { UserRole } from '@/lib/types';

interface RoleRouteProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export function RoleRoute({ roles, children }: RoleRouteProps) {
  const { activeRole } = useAuth();
  if (!activeRole) return null;
  if (!roles.includes(activeRole)) return <Navigate to={ROLE_HOME[activeRole]} replace />;
  return <>{children}</>;
}
