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
  runtime.stop?.();
  runtime.stop = null;
  const generation = ++runtime.generation;
  const isCurrent = () => runtime.generation === generation;
  let stopBrowserSession;
  const clubHubUrl = import.meta.env.VITE_CLUBHUB_APP_URL
    || (import.meta.env.DEV ? 'http://localhost:5173/v2' : 'https://fptux-clubhub-ui.pages.dev/v2');
  const signedOutUrl = new URL('/v2', clubHubUrl).href;
  try {
    const browserSession = createBrowserSession({ session, isCurrent });
    const authenticated = await browserSession.bootstrap();
    if (!isCurrent()) return;
    // ClubHub owns sign-in. Admin redirects only after Auth confirms there is no session.
    if (!authenticated) { window.location.replace(signedOutUrl); return; }
    stopBrowserSession = browserSession.watch();
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
  const stopRedirect = watchSessionRedirect(session, { destination: signedOutUrl });
  runtime.stop = () => { stopBrowserSession?.(); stopRedirect(); };
  renderApplication();
}
start();
