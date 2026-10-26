// StrictMode may mount twice; Google requires one initialize call per page/client.
const clients = new WeakMap();

export function bindGoogleSignIn(client, clientId, onCredential) {
  let state = clients.get(client);
  if (!state || state.clientId !== clientId) {
    state = { clientId, onCredential: null };
    clients.set(client, state);
    client.initialize({ client_id: clientId, ux_mode: 'popup', auto_select: false,
      callback: response => state.onCredential?.(response) });
  }
  state.onCredential = onCredential;
  return () => { if (state.onCredential === onCredential) state.onCredential = null; };
}
