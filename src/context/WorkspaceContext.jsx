import { createContext, useContext, useRef, useState } from 'react';
import { createSeed } from '../utils/seed.js';

const KEY = 'fptu-xperience-demo-v1';
const WorkspaceContext = createContext(null);
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
