import { useState, useEffect, useCallback } from 'react';
import { getPlays, savePlay, deletePlay, createPlay } from '../data/playbook';
import { seedPlays } from '../data/samplePlays';

const SEED_FLAG = 'pb_seeded';

export function usePlays() {
  const [plays, setPlays] = useState(() => {
    let list = getPlays();
    // First run: drop in the sample plays once (and never again, even if the
    // user deletes them all).
    if (list.length === 0 && !localStorage.getItem(SEED_FLAG)) {
      list = seedPlays();
      localStorage.setItem('pb_plays', JSON.stringify(list));
      localStorage.setItem(SEED_FLAG, '1');
    }
    return list;
  });

  const refresh = useCallback(() => setPlays(getPlays()), []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'pb_plays') refresh(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const add = useCallback((data) => {
    const p = createPlay(data);
    refresh();
    return p;
  }, [refresh]);

  const update = useCallback((play) => {
    const p = savePlay(play);
    refresh();
    return p;
  }, [refresh]);

  const remove = useCallback((id) => {
    deletePlay(id);
    refresh();
  }, [refresh]);

  return { plays, add, update, remove, refresh };
}
