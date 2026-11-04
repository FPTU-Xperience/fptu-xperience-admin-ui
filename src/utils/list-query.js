export function readListQuery(search, defaults, prefix = '') {
  const params = new URLSearchParams(search);
  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const raw = params.get(prefix + key);
      if (typeof fallback === 'number') {
        const value = /^\d+$/.test(raw || '') ? Number(raw) : NaN;
        return [
          key,
          Number.isSafeInteger(value) && value >= 1 && value <= 100000 ? value : fallback,
        ];
      }
      if (typeof fallback === 'boolean') return [key, raw == null ? fallback : raw === '1'];
      return [key, raw ?? fallback];
    }),
  );
}

export function updateListQuery(search, patch, defaults, prefix = '') {
  const params = new URLSearchParams(search);
  const current = readListQuery(params, defaults, prefix);
  const changes = typeof patch === 'function' ? patch(current) : { ...patch };
  const changedFilter = Object.keys(changes).some(
    (key) => key !== 'page' && changes[key] !== current[key],
  );
  if (changedFilter && Object.hasOwn(defaults, 'page') && !Object.hasOwn(changes, 'page'))
    changes.page = 1;
  for (const [key, value] of Object.entries(changes)) {
    if (!Object.hasOwn(defaults, key)) continue;
    const normalized =
      typeof defaults[key] === 'number'
        ? Number.isSafeInteger(value) && value >= 1 && value <= 100000
          ? value
          : defaults[key]
        : value;
    if (normalized === defaults[key] || normalized == null) params.delete(prefix + key);
    else
      params.set(
        prefix + key,
        typeof normalized === 'boolean' ? (normalized ? '1' : '0') : String(normalized),
      );
  }
  return params;
}
