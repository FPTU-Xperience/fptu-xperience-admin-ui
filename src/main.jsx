import SessionExpiryGuard from './components/auth/SessionExpiryGuard';
import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';
import { session } from './services/api.js';
import { createBrowserSession } from './services/browser-session.js';

const runtime = import.meta.hot?.data.authRuntime || { generation: 0, root: null, stop: null };
if (import.meta.hot) {
  import.meta.hot.data.authRuntime = runtime;
  import.meta.hot.dispose(() => { runtime.generation++; runtime.stop?.(); runtime.stop = null; });
  import.meta.hot.accept(() => window.location.reload());
}

function renderApplication() {
  runtime.root ||= ReactDOM.createRoot(document.getElementById('root'));
  runtime.root.render(
  <React.StrictMode>
    <HashRouter>
      <SessionExpiryGuard session={session} loginTo="/login">
      <AuthProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </AuthProvider>
      </SessionExpiryGuard>
    </HashRouter>
  </React.StrictMode>,
);
}

async function start() {
  runtime.stop?.();
  runtime.stop = null;
  const generation = ++runtime.generation;
  const isCurrent = () => runtime.generation === generation;
  try {
    const browserSession = createBrowserSession({ session, isCurrent });
    await browserSession.bootstrap();
    if (!isCurrent()) return;
    // Missing/expired cookies render Admin's own login without leaving this route.
  } catch {
    if (!isCurrent()) return;
    runtime.root ||= ReactDOM.createRoot(document.getElementById('root'));
    runtime.root.render(<main role="alert" style={{ padding: 40 }}>
      <p>Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.</p>
      <button type="button" onClick={start}>Thử lại</button>
    </main>);
    return;
  }
  if (!isCurrent()) return;
  runtime.stop = () => {};
  renderApplication();
}
start();
