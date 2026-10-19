import { useEffect, useState } from 'react';

export function useOperationQuery(loader, identity) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    setResult({ identity, loading: true });
    Promise.resolve()
      .then(loader)
      .then(
        (data) => {
          if (active) setResult({ identity, data });
        },
        (error) => {
          if (active) setResult({ identity, error });
        },
      );
    return () => {
      active = false;
    };
  }, [identity, attempt]);
  return {
    ...(result?.identity === identity ? result : { loading: true }),
    retry: () => setAttempt((value) => value + 1),
  };
}
