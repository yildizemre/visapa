import { useState, useEffect } from 'react';
import { apiUrl } from '../lib/api';
import { useStoreChange } from './useStoreChange';

export interface WorkHours {
  work_start: number;
  work_end: number;
}

const DEFAULT_WORK_HOURS: WorkHours = { work_start: 10, work_end: 22 };

let _cache: WorkHours | null = null;

/** Cache'i temizle — Settings'den mesai kaydedildikten sonra çağır */
export function invalidateWorkHoursCache() {
  _cache = null;
}

export function useWorkHours(): WorkHours {
  const storeRefresh = useStoreChange();
  const [hours, setHours] = useState<WorkHours>(_cache ?? DEFAULT_WORK_HOURS);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/settings/work-hours'), {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: WorkHours | null) => {
        if (data) {
          _cache = data;
          setHours(data);
        }
      })
      .catch(() => {});
  }, [storeRefresh]);

  return hours;
}
