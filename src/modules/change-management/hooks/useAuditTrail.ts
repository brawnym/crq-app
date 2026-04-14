import { useCallback, useEffect, useState } from 'react';
import type { AuditEntry } from '@modules/change-management/types';
import { getAuditTrail } from '../services/auditService';

export function useAuditTrail(crqId: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await getAuditTrail(crqId));
    } finally {
      setLoading(false);
    }
  }, [crqId]);

  useEffect(() => { load(); }, [load]);
  return { entries, loading, reload: load };
}
