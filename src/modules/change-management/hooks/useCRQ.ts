import { useCallback, useEffect, useState } from 'react';
import type { CRQ, CRQFilters } from '@modules/change-management/types';
import { listCRQs, getCRQ, createCRQ, updateCRQ, updateCRQStatus, archiveCRQ } from '../services/crqService';

export function useCRQList(filters: CRQFilters) {
  const [crqs, setCrqs] = useState<CRQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCrqs(await listCRQs(filters));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);
  return { crqs, loading, error, reload: load };
}

export function useCRQDetail(id: string) {
  const [crq, setCrq] = useState<CRQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCrq(await getCRQ(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  return { crq, loading, error, reload: load };
}

export function useCRQActions() {
  return { createCRQ, updateCRQ, updateCRQStatus, archiveCRQ };
}
