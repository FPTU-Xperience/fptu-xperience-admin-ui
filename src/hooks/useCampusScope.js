import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { campusScope } from '../services/campus-scope.js';
export function useCampusScope(user) {
  const [result, setResult] = useState(null), [revision, setRevision] = useState(0);
  const identity = `${user?.id}:${user?.campusCode}:${user?.roles?.join(',')}`;
  useEffect(() => {
    let active = true;
    setResult(null);
    if (user?.id) api.get('/api/v1/student-affairs/campuses')
      .then((value) => { if (active) setResult({ identity, data: campusScope(value, user.id) }); })
      .catch((error) => { if (active) setResult({ identity, error: error.message }); });
    return () => { active = false; };
  }, [identity, revision]);
  return { ...(result?.identity === identity ? result : {}), retry: () => setRevision((value) => value + 1) };
}
