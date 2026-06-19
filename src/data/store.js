// Local storage keys
const CLIENTS_KEY = 'salestracker_clients';
const USER_KEY = 'salestracker_user';
const CALLS_KEY = 'salestracker_calls';
const EVENTS_KEY = 'salestracker_events';
const REMINDERS_KEY = 'salestracker_reminders';

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

// ── Calendar events ──
export function getEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function saveEvent(event) {
  const events = getEvents();
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  saveEvents(events);
  return event;
}

export function deleteEvent(id) {
  saveEvents(getEvents().filter(e => e.id !== id));
}

export function createEvent(data) {
  const now = new Date().toISOString();
  const event = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    title: '',
    start: now,        // ISO datetime
    end: '',
    location: '',
    notes: '',
    audience: 'me',    // 'me' | 'org' | { members: [userIds] }
    clientId: null,
    source: 'manual',  // 'manual' | 'call'
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  return saveEvent(event);
}

// ── Follow-up reminders ──
export function getReminders() {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveReminders(reminders) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function saveReminder(reminder) {
  const reminders = getReminders();
  const idx = reminders.findIndex(r => r.id === reminder.id);
  if (idx >= 0) reminders[idx] = reminder;
  else reminders.push(reminder);
  saveReminders(reminders);
  return reminder;
}

export function deleteReminder(id) {
  saveReminders(getReminders().filter(r => r.id !== id));
}

export function createReminder(data) {
  const now = new Date().toISOString();
  const reminder = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    clientId: null,
    clientName: '',
    label: 'Follow up',
    context: '',
    dueDate: now,
    status: 'pending',  // 'pending' | 'done'
    source: 'manual',   // 'manual' | 'call'
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    ...data,
  };
  return saveReminder(reminder);
}
