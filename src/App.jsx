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
import AdminConsole from './pages/AdminConsole';
import Calendar from './pages/Calendar';
import Search from './pages/Search';
import { useClients } from './hooks/useClients';
import { useEvents } from './hooks/useEvents';
import { useReminders } from './hooks/useReminders';
import { getUser } from './data/store';
import { extractCallEvents } from './lib/callEvents';
import { getAccountInfo } from './lib/api';
import Emoji from './components/Emoji';

const FOLLOWUP_DAYS = [1, 3, 5, 7, 14];
import './index.css';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [recordForClientId, setRecordForClientId] = useState(null);
  const [upgraded, setUpgraded] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState('');
  const [calendarMsg, setCalendarMsg] = useState('');
  const [keys, setKeys] = useState(() => {
    const u = getUser() || {};
    return {
      apiKey: u.apiKey || '', openaiKey: u.openaiKey || '', recallKey: u.recallKey || '',
      botServerUrl: u.botServerUrl || '', botServerToken: u.botServerToken || '',
    };
  });

  const { clients, addClient, updateClient, removeClient } = useClients();
  const { events, addEvent, updateEvent, removeEvent, addEvents } = useEvents();
  const { reminders, updateReminder, removeReminder, addReminders } = useReminders();

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

  async function handleSaveCall(updatedClient, call) {
    updateClient(updatedClient);
    setSelectedClientId(updatedClient.id);
    setPage('profile');

    // Schedule follow-up reminders at 1/3/5/7/14 days after the call.
    const base = call?.date ? new Date(call.date) : new Date();
    addReminders(FOLLOWUP_DAYS.map(days => ({
      clientId: updatedClient.id,
      clientName: updatedClient.name || 'Client',
      label: `Follow up with ${updatedClient.name || 'client'}`,
      context: call?.title || (call?.extracted ? call.extracted.split('\n')[0] : '') || '',
      dueDate: new Date(base.getTime() + days * 86400000).toISOString(),
      source: 'call',
      createdBy: getAccountInfo().id || null,
    })));

    // Auto-add any meetings/events mentioned on the call to the calendar.
    const transcript = call?.transcript;
    if (transcript) {
      const found = await extractCallEvents(transcript, keys.apiKey);
      if (found.length) {
        addEvents(found.map(e => ({
          title: e.title,
          start: new Date(e.start).toISOString(),
          notes: e.notes || `From a call with ${updatedClient.name || 'a client'}`,
          source: 'call',
          clientId: updatedClient.id,
          createdBy: getAccountInfo().id || null,
        })));
        setCalendarMsg(`Added ${found.length} event${found.length > 1 ? 's' : ''} from the call to your calendar.`);
      }
    }
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

  // Bulk-import contacts as new clients, skipping ones that already exist
  // (matched by phone, email, or name) so re-importing is safe.
  function handleImportContacts(list) {
    const norm = (s) => (s || '').replace(/[^\dA-Za-z@.]/g, '').toLowerCase();
    const existingPhones = new Set(clients.map(c => norm(c.phone)).filter(Boolean));
    const existingEmails = new Set(clients.map(c => norm(c.email)).filter(Boolean));
    const existingNames = new Set(clients.map(c => norm(c.name)).filter(Boolean));
    list.forEach(c => {
      const p = norm(c.phone), e = norm(c.email), n = norm(c.name);
      const dup = (p && existingPhones.has(p)) || (e && existingEmails.has(e)) || (n && existingNames.has(n));
      if (dup) return;
      addClient(c);
      if (p) existingPhones.add(p);
      if (e) existingEmails.add(e);
      if (n) existingNames.add(n);
    });
    setPage('clients');
  }

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Layout page={page} onNav={handleNav}>
      {upgraded && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-green-800 dark:text-green-300"><Emoji e="🎉" className="mr-1.5" />Subscription active — thanks! Your plan is now upgraded.</p>
          <button onClick={() => setUpgraded(false)} className="text-green-700 dark:text-green-400 text-xs font-medium hover:underline">Dismiss</button>
        </div>
      )}
      {deviceLimit && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{deviceLimit}</p>
            <button onClick={() => setPage('settings')} className="text-amber-900 dark:text-amber-200 text-xs font-bold underline">Upgrade</button>
          </div>
          <button onClick={() => setDeviceLimit('')} className="text-amber-700 dark:text-amber-300 text-xs font-medium hover:underline">Dismiss</button>
        </div>
      )}
      {calendarMsg && (
        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-xl p-4 mb-4 flex items-center justify-between gap-3">
          <button onClick={() => { setCalendarMsg(''); setPage('calendar'); }} className="text-sm font-medium text-green-800 dark:text-green-300 text-left"><Emoji e="📅" className="mr-1.5" />{calendarMsg} <span className="underline">View</span></button>
          <button onClick={() => setCalendarMsg('')} className="text-green-700 dark:text-green-400 text-xs font-medium hover:underline">Dismiss</button>
        </div>
      )}
      {page === 'dashboard' && (
        <Dashboard
          clients={clients}
          reminders={reminders}
          events={events}
          onNav={handleNav}
          onSelectClient={handleSelectClient}
          onAdd={() => setPage('add')}
          onCompleteReminder={(r) => updateReminder({ ...r, status: 'done' })}
          onDismissReminder={(id) => removeReminder(id)}
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
      {page === 'calendar' && (
        <Calendar
          events={events}
          addEvent={addEvent}
          updateEvent={updateEvent}
          removeEvent={removeEvent}
        />
      )}
      {page === 'search' && (
        <Search
          clients={clients}
          events={events}
          onSelectClient={handleSelectClient}
          onBack={() => setPage('dashboard')}
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
          apiKey={keys.apiKey}
          onBack={() => setPage('clients')}
          onUpdate={handleUpdateClient}
          onQuickLog={handleSaveCall}
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
      {page === 'admin' && (
        <AdminConsole onBack={() => setPage('settings')} />
      )}
      {page === 'settings' && (
        <Settings onKeysChange={setKeys} onManageOrg={() => setPage('admin')} />
      )}
    </Layout>
  );
}
