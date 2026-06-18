import { useState, useEffect, useCallback } from 'react';
import { getEvents, saveEvent, deleteEvent, createEvent } from '../data/store';
import { syncEvents, pushEvent, pushDeleteEvent } from '../lib/sync';

export function useEvents() {
  const [events, setEvents] = useState([]);

  const refresh = useCallback(() => setEvents(getEvents()), []);

  useEffect(() => {
    refresh();
    syncEvents().then(() => refresh()).catch(() => {});
  }, [refresh]);

  const addEvent = useCallback((data) => {
    const event = createEvent(data);
    pushEvent(event);
    refresh();
    return event;
  }, [refresh]);

  const updateEvent = useCallback((event) => {
    const updated = { ...event, updatedAt: new Date().toISOString() };
    saveEvent(updated);
    pushEvent(updated);
    refresh();
    return updated;
  }, [refresh]);

  const removeEvent = useCallback((id) => {
    deleteEvent(id);
    pushDeleteEvent(id);
    refresh();
  }, [refresh]);

  // Add several at once (e.g. events detected in a call).
  const addEvents = useCallback((list) => {
    list.forEach(data => { const e = createEvent(data); pushEvent(e); });
    refresh();
  }, [refresh]);

  return { events, addEvent, updateEvent, removeEvent, addEvents, refresh };
}
