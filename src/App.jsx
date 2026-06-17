import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientList from './pages/ClientList';
import ClientProfile from './pages/ClientProfile';
import AddClient from './pages/AddClient';
import CallRecorder from './pages/CallRecorder';
import Settings from './pages/Settings';
import { useClients } from './hooks/useClients';
import { getUser } from './data/store';
import './index.css';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [recordForClientId, setRecordForClientId] = useState(null);
  const [keys, setKeys] = useState(() => {
    const u = getUser() || {};
    return {
      apiKey: u.apiKey || '', openaiKey: u.openaiKey || '', recallKey: u.recallKey || '',
      botServerUrl: u.botServerUrl || '', botServerToken: u.botServerToken || '',
    };
  });

  const { clients, addClient, updateClient, removeClient } = useClients();

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

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Layout page={page} onNav={handleNav}>
      {page === 'dashboard' && (
        <Dashboard
          clients={clients}
          onNav={handleNav}
          onSelectClient={handleSelectClient}
        />
      )}
      {page === 'clients' && (
        <ClientList
          clients={clients}
          onSelect={handleSelectClient}
          onAdd={() => setPage('add')}
          onToggleStar={handleToggleStar}
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
