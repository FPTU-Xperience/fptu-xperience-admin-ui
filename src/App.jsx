import { useAuth } from './context/AuthContext.jsx';
import { AccessDenied, SessionLoading } from './components/ui/session-state/SessionState.jsx';
import { isAdminUser } from './utils/access.js';
import AppRoutes from './routes/index.jsx';

export default function App() {
  const { user, isLoading, logout } = useAuth();
  if (isLoading) return <SessionLoading />;
  if (user && !isAdminUser(user)) return <AccessDenied onLogout={logout} />;
  return <AppRoutes />;
}
