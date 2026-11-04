import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readListQuery, updateListQuery } from '../utils/list-query.js';

export function useListQuery(defaults, prefix = '') {
  const [params, setParams] = useSearchParams();
  const pending = useRef(params);
  const rendered = useRef(params);
  if (rendered.current !== params) {
    rendered.current = params;
    pending.current = params;
  }
  const state = readListQuery(params, defaults, prefix);
  const update = (patch, options) => {
    const next = updateListQuery(pending.current, patch, defaults, prefix);
    pending.current = next;
    setParams(next, options);
  };
  const setters = Object.fromEntries(
    Object.keys(defaults).map((key) => [
      'set' + key[0].toUpperCase() + key.slice(1),
      (value, options) =>
        update(
          (current) => ({ [key]: typeof value === 'function' ? value(current[key]) : value }),
          options,
        ),
    ]),
  );
  return { ...state, ...setters, update, params };
}

export function usePageBound(page, totalPages, ready, setPage) {
  useEffect(() => {
    if (!ready || !Number.isFinite(totalPages)) return;
    const bound = Math.max(1, Math.floor(totalPages));
    if (page > bound) setPage(bound, { replace: true });
  }, [page, totalPages, ready]);
}
