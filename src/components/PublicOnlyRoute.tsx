import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { state } = useAuth();
  
  if (state.user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
} 