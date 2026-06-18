import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/ClientList';
import ClientProfile from './pages/ClientProfile';
import AddClient from './pages/AddClient';
import ScanCard from './pages/ScanCard';
import ImportContacts from './pages/ImportContacts';
import CallRecorder from './pages/CallRecorder';
import Settings from './pages/Settings';
import { useClients } from './hooks/useClients';
import { getUser } from './data/store';
import './index.css';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [recordForClientId, setRecordForClientId] = useState(null);
  const [upgraded, setUpgraded] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState('');
  const [keys, setKeys] = useState(() => {
    const u = getUser() || {};
    return {
      apiKey: u.apiKey || '', openaiKey: u.openaiKey || '', recallKey: u.recallKey || '',
      botServerUrl: u.botServerUrl || '', botServerToken: u.botServerToken || '',
    };
  });

  const { clients, addClient, updateClient, removeClient } = useClients();

  // Detect return from Stripe checkout success and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === '1') {
      setUpgraded(true);
      params.delete('upgraded');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    const onLimit = (e) => setDeviceLimit(e.detail || 'Device limit reached.');
    window.addEventListener('spark:device-limit', onLimit);
    return () => window.removeEventListener('spark:device-limit', onLimit);
  }, []);

  function handleNav(newPage) {
    setPage(newPage);
    setSelectedClientId(null);
    setRecordForClientId(null);
  }

  function handleSelectClient(id) {
    setSelectedClientId(id);
    setPage('profile');
  }

  function handleSaveNewClient(data) {
    const client = addClient(data);
    setSelectedClientId(client.id);
    setPage('profile');
  }

  function handleUpdateClient(client) {
    updateClient(client);
  }

  function handleDeleteClient(id) {
    removeClient(id);
    setPage('clients');
    setSelectedClientId(null);
  }

  function handleToggleStar(id) {
    const client = clients.find(c => c.id === id);
    if (client) updateClient({ ...client, starred: !client.starred });
  }

  function handleRecord(clientId) {
    setRecordForClientId(clientId);
    setPage('recorder');
  }

  function handleSaveCall(updatedClient) {
    updateClient(updatedClient);
    setSelectedClientId(updatedClient.id);
    setPage('profile');
  }

  // Merge scanned/imported details into an existing client (fill empty fields only).
  function handleMergeIntoClient(clientId, data) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const merged = { ...client };
    for (const key of ['name', 'phone', 'email', 'company', 'position']) {
      if (!merged[key] && data[key]) merged[key] = data[key];
    }
    if (data.notes) merged.notes = [client.notes, data.notes].filter(Boolean).join('\n');
    updateClient(merged);
    setSelectedClientId(clientId);
    setPage('profile');
  }

  // Bulk-import contacts as new clients.
  function handleImportContacts(list) {
    let last = null;
    list.forEach(c => { last = addClient(c); });
    setPage('clients');
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Layout page={page} onNav={handleNav}>
      {upgraded && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-green-800">🎉 Subscription active — thanks! Your plan is now upgraded.</p>
          <button onClick={() => setUpgraded(false)} className="text-green-700 text-xs font-medium hover:underline">Dismiss</button>
        </div>
      )}
      {deviceLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-amber-800">{deviceLimit}</p>
            <button onClick={() => setPage('settings')} className="text-amber-900 text-xs font-bold underline">Upgrade</button>
          </div>
          <button onClick={() => setDeviceLimit('')} className="text-amber-700 text-xs font-medium hover:underline">Dismiss</button>
        </div>
      )}
      {page === 'dashboard' && (
        <Dashboard
          clients={clients}
          onNav={handleNav}
          onSelectClient={handleSelectClient}
          onAdd={() => setPage('add')}
        />
      )}
      {page === 'clients' && (
        <ClientList
          clients={clients}
          onSelect={handleSelectClient}
          onAdd={() => setPage('add')}
          onScan={() => setPage('scan')}
          onImport={() => setPage('import')}
          onToggleStar={handleToggleStar}
        />
      )}
      {page === 'scan' && (
        <ScanCard
          clients={clients}
          onSaveNew={handleSaveNewClient}
          onMerge={handleMergeIntoClient}
          onBack={() => setPage('clients')}
          apiKey={keys.apiKey}
        />
      )}
      {page === 'import' && (
        <ImportContacts
          onImport={handleImportContacts}
          onBack={() => setPage('clients')}
        />
      )}
      {page === 'profile' && selectedClient && (
        <ClientProfile
          client={selectedClient}
          onBack={() => setPage('clients')}
          onUpdate={handleUpdateClient}
          onDelete={handleDeleteClient}
          onRecord={handleRecord}
        />
      )}
      {page === 'add' && (
        <AddClient
          onBack={() => setPage('clients')}
          onSave={handleSaveNewClient}
        />
      )}
      {page === 'recorder' && (
        <CallRecorder
          clients={clients}
          preselectedClientId={recordForClientId}
          onSaveCall={handleSaveCall}
          onBack={() => setPage(recordForClientId ? 'profile' : 'dashboard')}
          apiKey={keys.apiKey}
          openaiKey={keys.openaiKey}
          recallKey={keys.recallKey}
          botServerUrl={keys.botServerUrl}
          botServerToken={keys.botServerToken}
        />
      )}
      {page === 'settings' && (
        <Settings onKeysChange={setKeys} />
      )}
    </Layout>
  );
}
