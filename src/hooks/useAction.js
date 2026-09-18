import { useWorkspace } from '../context/WorkspaceContext.jsx';

export function useAction() {
  const { notify } = useWorkspace();
  return async (fn, success) => {
    try {
      await fn();
      if (success) notify(success);
      return true;
    } catch (error) {
      notify(error.message || 'Không thể thực hiện. Vui lòng thử lại.', 'error');
      return false;
    }
  };
}