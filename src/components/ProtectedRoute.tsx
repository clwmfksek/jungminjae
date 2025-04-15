import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { state } = useAuth();
  
  if (state.loading) {
    return <div>로딩 중...</div>;
  }

  if (!state.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
} 