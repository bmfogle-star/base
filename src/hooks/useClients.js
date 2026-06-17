import { useState, useEffect, useCallback } from 'react';
import { getClients, saveClient, deleteClient, createClient } from '../data/store';

export function useClients() {
  const [clients, setClients] = useState([]);

  const refresh = useCallback(() => {
    setClients(getClients());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addClient = useCallback((data) => {
    const client = createClient(data);
    refresh();
    return client;
  }, [refresh]);

  const updateClient = useCallback((client) => {
    const updated = { ...client, updatedAt: new Date().toISOString() };
    saveClient(updated);
    refresh();
    return updated;
  }, [refresh]);

  const removeClient = useCallback((id) => {
    deleteClient(id);
    refresh();
  }, [refresh]);

  return { clients, addClient, updateClient, removeClient, refresh };
}
