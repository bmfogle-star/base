// Local storage keys
const CLIENTS_KEY = 'salestracker_clients';
const USER_KEY = 'salestracker_user';
const CALLS_KEY = 'salestracker_calls';

export function getClients() {
  try {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveClients(clients) {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function getClient(id) {
  return getClients().find(c => c.id === id) || null;
}

export function saveClient(client) {
  const clients = getClients();
  const idx = clients.findIndex(c => c.id === client.id);
  if (idx >= 0) {
    clients[idx] = client;
  } else {
    clients.push(client);
  }
  saveClients(clients);
  return client;
}

export function deleteClient(id) {
  const clients = getClients().filter(c => c.id !== id);
  saveClients(clients);
}

export function createClient(data) {
  const client = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: '',
    phone: '',
    email: '',
    company: '',
    position: '',
    birthday: '',
    hobbies: [],
    interests: [],
    notes: '',
    family: [],
    upcomingEvents: [],
    tags: [],
    attachments: [],
    customFields: {},
    callHistory: [],
    ...data,
  };
  return saveClient(client);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCalls() {
  try {
    return JSON.parse(localStorage.getItem(CALLS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCall(call) {
  const calls = getCalls();
  const idx = calls.findIndex(c => c.id === call.id);
  if (idx >= 0) {
    calls[idx] = call;
  } else {
    calls.push(call);
  }
  localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
  return call;
}
