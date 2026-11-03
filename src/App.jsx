import { Navigate, useLocation } from 'react-router-dom';
import LogoutPage from './pages/LogoutPage';
import { useAuth } from './context/AuthContext.jsx';
import { SessionLoading } from './components/ui/session-state/SessionState.jsx';
import { isAdminUser } from './utils/access.js';
import AppRoutes from './routes/index.jsx';

export default function App() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (location.pathname === '/logout') return <LogoutPage />;
  if (isLoading) return <SessionLoading />;
  if (user && !isAdminUser(user)) return <Navigate to="/logout?reason=forbidden" replace />;
  return <AppRoutes />;
}
