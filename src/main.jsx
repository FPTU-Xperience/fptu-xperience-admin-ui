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
import { createStaffSso } from './services/staff-sso.js';
import { watchSessionRedirect } from './services/session-client.js';

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
      <AuthProvider>
        <WorkspaceProvider>
          <App />
        </WorkspaceProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
}

async function start() {
  const generation = ++runtime.generation;
  const isCurrent = () => runtime.generation === generation;
  let stopSso;
  const clubHubUrl = import.meta.env.VITE_CLUBHUB_APP_URL
    || (import.meta.env.DEV ? 'http://localhost:5173/v2' : 'https://fptux-clubhub-ui.pages.dev/v2');
  const signedOutUrl = new URL('/v2', clubHubUrl).href;
  if (import.meta.env.VITE_STAFF_SSO_ENABLED !== 'false') {
    try {
      const sso = createStaffSso({ session, isCurrent, peerUrl: clubHubUrl, signedOutUrl });
      if (await sso.bootstrap() || !isCurrent()) return;
      stopSso = sso.watch();
    } catch (error) { console.error('Không thể khởi tạo SSO:', error); }
  }
  if (!isCurrent()) return;
  const stopRedirect = watchSessionRedirect(session, { destination: signedOutUrl });
  runtime.stop = () => { stopSso?.(); stopRedirect(); };
  renderApplication();
}
start();
