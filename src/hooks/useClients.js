import { useState, useEffect, useCallback } from 'react';
import { getClients, saveClient, deleteClient, createClient } from '../data/store';
import { syncClients, pushClient, pushDelete } from '../lib/sync';

export function useClients() {
  const [clients, setClients] = useState([]);

  const refresh = useCallback(() => {
    setClients(getClients());
  }, []);

  useEffect(() => {
    refresh();
    // Pull any cloud changes (no-op unless signed in), then refresh the view.
    syncClients().then(() => refresh()).catch(() => {});
  }, [refresh]);

  const addClient = useCallback((data) => {
    const client = createClient(data);
    pushClient(client);
    refresh();
    return client;
  }, [refresh]);

  const updateClient = useCallback((client) => {
    const updated = { ...client, updatedAt: new Date().toISOString() };
    saveClient(updated);
    pushClient(updated);
    refresh();
    return updated;
  }, [refresh]);

  const removeClient = useCallback((id) => {
    deleteClient(id);
    pushDelete(id);
    refresh();
  }, [refresh]);

  return { clients, addClient, updateClient, removeClient, refresh };
}
