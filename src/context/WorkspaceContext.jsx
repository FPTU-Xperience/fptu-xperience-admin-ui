import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import api from '../services/api.js';
import { workspaceRoleFor } from '../utils/access.js';
import { mapSemesterOptions, selectAvailableSemester } from '../utils/semesters.js';
const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const role = workspaceRoleFor(user, pathname);
  const [state, setState] = useState({ seasons: [] });
  const [season, setSeason] = useState('');
  const [semesterStatus, setSemesterStatus] = useState('idle');
  const [semesterVersion, setSemesterVersion] = useState(0);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!user || role !== 'STUDENT_AFFAIRS_ADMIN') return;
    let active = true;
    setSemesterStatus('loading');
    Promise.allSettled([api.seasons.list(), api.seasons.getActive()]).then(([list, current]) => {
      if (!active) return;
      if (list.status !== 'fulfilled') {
        setSemesterStatus('error');
        setSeason('');
        setState((previous) => {
          const next = { ...previous, seasons: [] };
          return next;
        });
        return;
      }
      const options = mapSemesterOptions(list.value);
      setState((previous) => {
        const next = { ...previous, seasons: options };
        return next;
      });
      setSeason((selected) =>
        selectAvailableSemester(options, selected, current.value?.semesterCode),
      );
      setSemesterStatus(options.length ? 'ready' : 'empty');
    });
    return () => {
      active = false;
    };
  }, [user?.id, role, semesterVersion]);

  function notify(message, type = 'success') {
    clearTimeout(timer.current);
    setToast({ message, type });
    timer.current = setTimeout(() => setToast(null), 5000);
  }

  return (
    <WorkspaceContext.Provider
      value={{
        state,
        role,
        season,
        setSeason,
        semesterStatus,
        retrySemesters: () => setSemesterVersion((value) => value + 1),
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
