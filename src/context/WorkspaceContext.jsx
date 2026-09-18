import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api.js';
import { createSeed } from '../utils/seed.js';

const KEY = 'fptu-xperience-demo-v1';
const WorkspaceContext = createContext(null);

function extractUsers(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function mapRemoteUser(user) {
  const roles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : ['CLUB_MEMBER'];
  return {
    id: String(user.id ?? user.userId ?? crypto.randomUUID()),
    username: user.username ?? user.studentCode ?? '',
    fullName: user.fullName ?? user.name ?? '',
    email: user.email ?? '',
    role: roles[0] ?? 'CLUB_MEMBER',
    status: user.isLocked || user.locked ? 'locked' : 'active',
    joinedAt: user.createdAt ?? new Date().toISOString(),
    clubIds: Array.isArray(user.clubIds) ? user.clubIds : [],
  };
}

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (
      value?.version === 1 &&
      [
        'accounts',
        'clubs',
        'types',
        'applications',
        'rubrics',
        'quests',
        'anomalies',
        'seasons',
        'ledger',
        'audit',
      ].every((key) => Array.isArray(value[key])) &&
      value.settings
    )
      return value;
  } catch {
    /* A corrupt or unavailable store must not crash the preview. */
  }
  return createSeed();
}
export function WorkspaceProvider({ children }) {
  const [state, setState] = useState(readState);
  const stateRef = useRef(state);
  useEffect(() => {
    let ignore = false;

    async function hydrateRemoteUsers() {
      try {
        const [usersResponse, rolesResponse] = await Promise.all([
          api.users.list({ page: 1, pageSize: 200 }),
          api.users.roles(),
        ]);

        const remoteUsers = extractUsers(usersResponse)
          .map(mapRemoteUser)
          .filter((user) => user.username || user.email || user.fullName);

        if (ignore || remoteUsers.length === 0) return;

        const next = structuredClone(stateRef.current);
        next.accounts = remoteUsers;
        if (Array.isArray(rolesResponse) && rolesResponse.length) {
          next.settings = {
            ...next.settings,
            roles: rolesResponse,
          };
        }

        stateRef.current = next;
        setState(next);

        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          // Ignore localStorage write failures in restricted environments.
        }
      } catch {
        // Keep the demo seed if the gateway is unavailable or the user is offline.
      }
    }

    hydrateRemoteUsers();
    return () => {
      ignore = true;
    };
  }, []);

  const [role, updateRole] = useState(() => {
    try {
      return sessionStorage.getItem('fptu-preview-role') === 'ADMIN'
        ? 'ADMIN'
        : 'STUDENT_AFFAIRS_ADMIN';
    } catch {
      return 'STUDENT_AFFAIRS_ADMIN';
    }
  });
  function setRole(next) {
    try {
      sessionStorage.setItem('fptu-preview-role', next);
    } catch {
      /* Preview still works in memory. */
    }
    updateRole(next);
  }
  const [season, setSeason] = useState('FALL2026');
  const [toast, setToast] = useState(null);
  const timer = useRef();
  function notify(message, type = 'success') {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 5000);
  }
  function commit(action, detail, area, mutate) {
    if (area === 'admin' && role !== 'ADMIN')
      throw new Error('Chỉ Admin được quản lý tài khoản và cấu hình hệ thống.');
    if (area === 'affairs' && role !== 'STUDENT_AFFAIRS_ADMIN')
      throw new Error('Hãy chuyển sang không gian Công tác sinh viên để thực hiện nghiệp vụ này.');
    const next = structuredClone(stateRef.current);
    mutate(next);
    next.audit.unshift({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: role === 'ADMIN' ? 'Nguyễn Hoàng Nam · Admin' : 'Nguyễn Hà Linh · CTSV',
      action,
      detail,
      area,
    });
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        'Không thể lưu dữ liệu trên trình duyệt. Hãy kiểm tra dung lượng lưu trữ rồi thử lại.',
      );
    }
    stateRef.current = next;
    setState(next);
  }
  return (
    <WorkspaceContext.Provider
      value={{
        state,
        commit,
        role,
        setRole,
        season,
        setSeason,
        notify,
        toast,
        dismissToast: () => setToast(null),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
export const useWorkspace = () => useContext(WorkspaceContext);
