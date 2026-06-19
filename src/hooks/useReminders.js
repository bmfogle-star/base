import { useState, useEffect, useCallback } from 'react';
import { getReminders, saveReminder, deleteReminder, createReminder } from '../data/store';
import { syncReminders, pushReminder, pushDeleteReminder } from '../lib/sync';

export function useReminders() {
  const [reminders, setReminders] = useState([]);

  const refresh = useCallback(() => setReminders(getReminders()), []);

  useEffect(() => {
    refresh();
    syncReminders().then(() => refresh()).catch(() => {});
  }, [refresh]);

  const updateReminder = useCallback((reminder) => {
    const updated = { ...reminder, updatedAt: new Date().toISOString() };
    saveReminder(updated);
    pushReminder(updated);
    refresh();
    return updated;
  }, [refresh]);

  const removeReminder = useCallback((id) => {
    deleteReminder(id);
    pushDeleteReminder(id);
    refresh();
  }, [refresh]);

  const addReminders = useCallback((list) => {
    list.forEach(data => { const r = createReminder(data); pushReminder(r); });
    refresh();
  }, [refresh]);

  return { reminders, updateReminder, removeReminder, addReminders, refresh };
}
