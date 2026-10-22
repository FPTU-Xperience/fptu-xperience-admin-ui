import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { createWorkflowState } from './mock-data.js';
import { canReviewMock, mockScope, workflowReducer } from './workflow-model.js';

const WorkflowContext = createContext(null);
export function WorkflowProvider({ children }) {
  const { user } = useAuth();
  return (
    <ActorWorkflowProvider key={String(user?.id || user?.email || 'guest')} user={user}>
      {children}
    </ActorWorkflowProvider>
  );
}
function ActorWorkflowProvider({ user, children }) {
  const { season } = useWorkspace();
  const [fallbackSemester, setFallbackSemester] = useState('FALL2026');
  const semester = season || fallbackSemester;
  const actorId = String(user?.id || user?.email || 'guest');
  const [state, dispatch] = useReducer(workflowReducer, actorId, createWorkflowState);
  const command = (type, fields = {}) =>
    dispatch({
      ...fields,
      type,
      semester,
      actor: { ...user, id: actorId },
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
    });
  const scope = mockScope(state, semester);
  useEffect(() => {
    const running = Object.entries(state.semesters).find(
      ([, scope]) => scope.rollover?.status === 'RUNNING',
    );
    if (!running || !canReviewMock(user)) return;
    const timer = setTimeout(
      () =>
        dispatch({
          type: 'STEP_ROLLOVER',
          semester: running[0],
          actor: { ...user, id: actorId },
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
        }),
      650,
    );
    return () => clearTimeout(timer);
  }, [state, user, actorId]);
  return (
    <WorkflowContext.Provider
      value={{
        state,
        scope,
        semester,
        setFallbackSemester,
        usesWorkspaceSemester: !!season,
        command,
        canWrite: canReviewMock(user),
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}
export const useWorkflow = () => useContext(WorkflowContext);
