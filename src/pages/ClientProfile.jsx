import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Edit2, Star, Phone, Mail, Building, Calendar, Heart, Users, Mic, Trash2, Plus, Tag, Save, X, Paperclip, FileText, Download, Camera, Image as ImageIcon, Clock, Pin, ChevronUp, ChevronDown } from 'lucide-react';
// (Mail icon already imported above)
import { getCustomFields } from '../lib/api';
import { draftFollowupEmail } from '../lib/followup';
import { generateTalkingPoints } from '../lib/talkingPoints';
import { getUser } from '../data/store';

// Order calls: pinned always float to top, then by the chosen sort.
function orderCalls(calls, sort) {
  const arr = [...(calls || [])];
  if (sort !== 'manual') {
    arr.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sort === 'oldest' ? da - db : db - da;
    });
  }
  arr.sort((a, b) => (a.pinned ? 0 : 1) - (b.pinned ? 0 : 1)); // stable: pinned first
  return arr;
}

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
}

function getAvatarColor(name) {
  const colors = ['bg-amber-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[idx];
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
        <Icon size={15} className="text-gold" />
        <h3 className="text-gray-900 dark:text-neutral-100 text-base">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TagChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">
      {label}
      {onRemove && <button onClick={onRemove}><X size={11} /></button>}
    </span>
  );
}

export default function ClientProfile({ client, apiKey, onBack, onUpdate, onQuickLog, onDelete, onRecord }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(client);
  const [newTag, setNewTag] = useState('');
  const [newHobby, setNewHobby] = useState('');
  const [newFamilyMember, setNewFamilyMember] = useState({ name: '', relation: '' });
  const [newEvent, setNewEvent] = useState({ title: '', date: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingCallId, setEditingCallId] = useState(null);
  const [callDateDraft, setCallDateDraft] = useState('');
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [callSort, setCallSort] = useState('recent'); // 'recent' | 'oldest' | 'manual'
  const [attachError, setAttachError] = useState('');
  const cameraInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const MAX_FILE_BYTES = 8 * 1024 * 1024;       // 8 MB cap for non-image files
  const MAX_IMAGE_SOURCE_BYTES = 30 * 1024 * 1024; // accept big photos; we compress them

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Downscale + re-encode photos so phone images fit in local storage.
  function compressImage(file, maxDim = 1600, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
      img.src = url;
    });
  }

  function dataUrlBytes(dataUrl) {
    const i = dataUrl.indexOf(',');
    return Math.round((dataUrl.length - i - 1) * 0.75);
  }

  async function processFile(f) {
    const isImage = f.type?.startsWith('image/');
    if (isImage) {
      if (f.size > MAX_IMAGE_SOURCE_BYTES) throw new Error(`"${f.name}" is too large.`);
      const dataUrl = await compressImage(f);
      const name = f.name?.replace(/\.[^.]+$/, '.jpg') || `photo-${Date.now()}.jpg`;
      return { name, type: 'image/jpeg', size: dataUrlBytes(dataUrl), dataUrl };
    }
    if (f.size > MAX_FILE_BYTES) throw new Error(`"${f.name}" is too large. Max 8 MB per file.`);
    const dataUrl = await readFileAsDataUrl(f);
    return { name: f.name, type: f.type || 'application/octet-stream', size: f.size, dataUrl };
  }

  async function addAttachments(fileList) {
    setAttachError('');
    const files = Array.from(fileList || []);
    if (!files.length) return;
    try {
      const newAtts = await Promise.all(files.map(async (f) => {
        const meta = await processFile(f);
        return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: new Date().toISOString(), ...meta };
      }));
      const updated = { ...client, attachments: [...(client.attachments || []), ...newAtts] };
      try {
        onUpdate(updated);
      } catch (e) {
        // localStorage quota exceeded, etc.
        setAttachError('Not enough local storage to save that. Try removing some attachments.');
        return;
      }
      setDraft(d => ({ ...d, attachments: updated.attachments }));
    } catch (e) {
      setAttachError(e.message || 'Could not read that file. Please try another.');
    }
  }

  function removeAttachment(id) {
    const updated = { ...client, attachments: (client.attachments || []).filter(a => a.id !== id) };
    onUpdate(updated);
    setDraft(d => ({ ...d, attachments: updated.attachments }));
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  const c = editing ? draft : client;
  const orgCustomFields = getCustomFields();

  // Auto-save: while editing, persist the draft a beat after the user stops typing.
  const [autoSaved, setAutoSaved] = useState(true);
  const autosaveTimer = useRef(null);
  const skipFirstAutosave = useRef(true);

  useEffect(() => {
    if (!editing) { skipFirstAutosave.current = true; return; }
    if (skipFirstAutosave.current) { skipFirstAutosave.current = false; return; }
    setAutoSaved(false);
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onUpdate({ ...draft, updatedAt: new Date().toISOString() });
      setAutoSaved(true);
    }, 600);
    return () => clearTimeout(autosaveTimer.current);
  }, [draft, editing]);

  function field(label, value, field, type = 'text', icon) {
    return (
      <div className="mb-3">
        <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">{label}</label>
        {editing ? (
          <input
            type={type}
            value={draft[field] || ''}
            onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        ) : (
          <p className="text-sm text-gray-800 dark:text-neutral-100">{value || <span className="text-gray-400 dark:text-neutral-500 italic">Not set</span>}</p>
        )}
      </div>
    );
  }

  function handleSave() {
    onUpdate({ ...draft, updatedAt: new Date().toISOString() });
    setEditing(false);
  }

  function addTag() {
    if (newTag.trim()) {
      setDraft(p => ({ ...p, tags: [...(p.tags || []), newTag.trim()] }));
      setNewTag('');
    }
  }

  function addHobby() {
    if (newHobby.trim()) {
      setDraft(p => ({ ...p, hobbies: [...(p.hobbies || []), newHobby.trim()] }));
      setNewHobby('');
    }
  }

  function addFamily() {
    if (newFamilyMember.name.trim()) {
      setDraft(p => ({ ...p, family: [...(p.family || []), { ...newFamilyMember, id: Date.now().toString() }] }));
      setNewFamilyMember({ name: '', relation: '' });
    }
  }

  function addEvent() {
    if (newEvent.title.trim()) {
      setDraft(p => ({ ...p, upcomingEvents: [...(p.upcomingEvents || []), { ...newEvent, id: Date.now().toString() }] }));
      setNewEvent({ title: '', date: '' });
    }
  }

  // ── call date/time editing ──
  function formatCallDateTime(iso) {
    if (!iso) return 'No date';
    return new Date(iso).toLocaleString([], {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  // ISO → value for <input type="datetime-local"> (in the user's local time).
  function isoToLocalInput(iso) {
    const d = iso ? new Date(iso) : new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function startEditCallDate(call) {
    setEditingCallId(call.id);
    setCallDateDraft(isoToLocalInput(call.date));
  }

  function persistCalls(callHistory) {
    const updated = { ...client, callHistory };
    onUpdate(updated);
    setDraft(d => ({ ...d, callHistory }));
  }

  function saveCallDate(callId) {
    if (!callDateDraft) { setEditingCallId(null); return; }
    const iso = new Date(callDateDraft).toISOString();
    persistCalls((client.callHistory || []).map(c => c.id === callId ? { ...c, date: iso } : c));
    setEditingCallId(null);
  }

  function startEditTitle(call) {
    setEditingTitleId(call.id);
    setTitleDraft(call.title || '');
  }

  function saveCallTitle(callId) {
    persistCalls((client.callHistory || []).map(c => c.id === callId ? { ...c, title: titleDraft.trim() } : c));
    setEditingTitleId(null);
  }

  function togglePin(callId) {
    persistCalls((client.callHistory || []).map(c => c.id === callId ? { ...c, pinned: !c.pinned } : c));
  }

  // AI follow-up email from the most recent call.
  const [emailDraft, setEmailDraft] = useState(null); // { subject, body } | null
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState('');

  function latestCallWithTranscript() {
    return [...(client.callHistory || [])]
      .filter(c => c.transcript || c.extracted)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }

  async function generateFollowupEmail() {
    setEmailError(''); setEmailBusy(true); setEmailDraft(null);
    try {
      const call = latestCallWithTranscript();
      const source = call?.transcript || call?.extracted || '';
      if (!source) { setEmailError('No call with content to base an email on yet.'); setEmailBusy(false); return; }
      const text = await draftFollowupEmail(source, client.name, getUser()?.name || '', apiKey);
      const m = text.match(/^subject:\s*(.*)\n+([\s\S]*)$/i);
      setEmailDraft(m ? { subject: m[1].trim(), body: m[2].trim() } : { subject: `Following up`, body: text.trim() });
    } catch (e) {
      setEmailError(e.message);
    } finally {
      setEmailBusy(false);
    }
  }

  function mailtoLink() {
    if (!emailDraft) return '#';
    const to = client.email || '';
    return `mailto:${to}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
  }

  // AI talking points (pre-call cheat sheet).
  const [points, setPoints] = useState('');
  const [pointsBusy, setPointsBusy] = useState(false);
  const [pointsError, setPointsError] = useState('');
  async function generatePoints() {
    setPointsError(''); setPointsBusy(true); setPoints('');
    try {
      setPoints(await generateTalkingPoints(client, apiKey));
    } catch (e) {
      setPointsError(e.message);
    } finally {
      setPointsBusy(false);
    }
  }

  // Quick log — capture a fast note as a call entry (also schedules follow-ups).
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  function saveQuickLog() {
    if (!quickText.trim()) return;
    const call = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      title: 'Quick note',
      summary: quickText.trim(),
      extracted: quickText.trim(),
      transcript: '',
      source: 'quick log',
      duration: '',
    };
    onQuickLog?.({ ...client, callHistory: [...(client.callHistory || []), call] }, call);
    setQuickText(''); setQuickOpen(false);
  }

  function moveCall(callId, dir) {
    const list = orderCalls(client.callHistory, callSort);
    const idx = list.findIndex(c => c.id === callId);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    [list[idx], list[j]] = [list[j], list[idx]];
    persistCalls(list);
    setCallSort('manual');
  }

  return (
    <div className="pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 -ml-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-neutral-300" />
        </button>
        <span className="font-medium text-gray-600 dark:text-neutral-300 text-sm">Back to Clients</span>
        <div className="flex-1" />
        {!editing && (
          <>
            <button
              onClick={() => onUpdate({ ...client, starred: !client.starred })}
              className={client.starred ? 'text-gold' : 'text-gray-300 hover:text-gold'}
            >
              <Star size={20} fill={client.starred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => { setDraft(client); setEditing(true); }}
              className="flex items-center gap-1.5 bg-green-800 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Edit2 size={14} />
              Edit
            </button>
          </>
        )}
        {editing && (
          <>
            <span className="text-xs text-gray-400 dark:text-neutral-500 mr-1">{autoSaved ? '✓ Saved' : 'Auto-saving…'}</span>
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-green-800 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Save size={14} />
              Done
            </button>
          </>
        )}
      </div>

      {/* Avatar + name */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-6 mb-3 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full ${getAvatarColor(c.name)} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
          {getInitials(c.name)}
        </div>
        <div className="flex-1">
          {editing ? (
            <input
              type="text"
              value={draft.name || ''}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              placeholder="Full Name"
              className="text-xl text-gray-900 dark:text-neutral-100 w-full border-b border-gray-300 dark:border-neutral-700 focus:outline-none focus:border-green-600 pb-1"
            />
          ) : (
            <h2 className="text-xl text-gray-900 dark:text-neutral-100">{c.name || 'Unnamed Client'}</h2>
          )}
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{c.company || ''} {c.position ? `· ${c.position}` : ''}</p>
          {c.attachments?.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {c.attachments.filter(a => a.type?.startsWith('image/')).slice(0, 3).map(a => (
                  <img key={a.id} src={a.dataUrl} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500">
                <Paperclip size={12} />{c.attachments.length} {c.attachments.length === 1 ? 'file' : 'files'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag size={14} className="text-gray-400 dark:text-neutral-500" />
          {c.tags?.map((tag, i) => (
            <TagChip key={i} label={tag} onRemove={editing ? () => setDraft(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) })) : null} />
          ))}
          {editing && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Add tag..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                className="text-xs border border-gray-200 dark:border-neutral-700 rounded-full px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              <button onClick={addTag} className="text-green-700 dark:text-green-400"><Plus size={14} /></button>
            </div>
          )}
          {!c.tags?.length && !editing && <span className="text-xs text-gray-400 dark:text-neutral-500 italic">No tags</span>}
        </div>
      </div>

      {/* Prep for a call (AI cheat sheet) */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-3">
        {!points && !pointsBusy ? (
          <button onClick={generatePoints} className="w-full flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 rounded-lg py-2.5 text-sm font-medium hover:bg-green-100 transition-colors">
            <Heart size={15} /> Prep for a call (AI cheat sheet)
          </button>
        ) : pointsBusy ? (
          <p className="text-sm text-gray-500 dark:text-neutral-400 text-center py-2">Building your cheat sheet…</p>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Talking points</h3>
              <div className="flex gap-2">
                <button onClick={generatePoints} className="text-xs text-green-700 dark:text-green-400 hover:underline">Refresh</button>
                <button onClick={() => setPoints('')} className="text-xs text-gray-400 dark:text-neutral-500 hover:underline">Hide</button>
              </div>
            </div>
            <p className="text-sm text-gray-800 dark:text-neutral-100 whitespace-pre-wrap">{points}</p>
          </div>
        )}
        {pointsError && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{pointsError}</p>}
      </div>

      {/* Contact info */}
      <Section title="Contact Info" icon={Phone}>
        {field('Phone', c.phone, 'phone', 'tel')}
        {field('Email', c.email, 'email', 'email')}
        {field('Company', c.company, 'company')}
        {field('Position / Title', c.position, 'position')}
      </Section>

      {/* Personal info */}
      <Section title="Personal Details" icon={Heart}>
        {field('Birthday', c.birthday, 'birthday', 'date')}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-2">Hobbies & Interests</label>
          <div className="flex flex-wrap gap-1.5">
            {c.hobbies?.map((h, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full">
                {h}
                {editing && <button onClick={() => setDraft(p => ({ ...p, hobbies: p.hobbies.filter((_, j) => j !== i) }))}><X size={11} /></button>}
              </span>
            ))}
            {editing && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Add hobby..."
                  value={newHobby}
                  onChange={e => setNewHobby(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addHobby()}
                  className="text-xs border border-gray-200 dark:border-neutral-700 rounded-full px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
                <button onClick={addHobby} className="text-purple-600"><Plus size={14} /></button>
              </div>
            )}
            {!c.hobbies?.length && !editing && <span className="text-xs text-gray-400 dark:text-neutral-500 italic">None noted yet</span>}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">Notes</label>
          {editing ? (
            <textarea
              value={draft.notes || ''}
              onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Any personal notes..."
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-800 dark:text-neutral-100 whitespace-pre-wrap">{c.notes || <span className="text-gray-400 dark:text-neutral-500 italic">No notes yet</span>}</p>
          )}
        </div>

        {/* Org custom fields */}
        {orgCustomFields.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800 space-y-3">
            {orgCustomFields.map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">{f.label}</label>
                {editing ? (
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={draft.customFields?.[f.key] || ''}
                    onChange={e => setDraft(p => ({ ...p, customFields: { ...(p.customFields || {}), [f.key]: e.target.value } }))}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                ) : (
                  <p className="text-sm text-gray-800 dark:text-neutral-100">{c.customFields?.[f.key] || <span className="text-gray-400 dark:text-neutral-500 italic">Not set</span>}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Attachments */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
          <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-2">Files & Photos</label>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-600 dark:text-neutral-300 hover:border-green-600 hover:text-green-700 transition-colors"
            >
              <Camera size={18} /> Take Photo
            </button>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-600 dark:text-neutral-300 hover:border-green-600 hover:text-green-700 transition-colors"
            >
              <ImageIcon size={18} /> Photo Library
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 border border-gray-200 dark:border-neutral-700 rounded-lg text-xs font-medium text-gray-600 dark:text-neutral-300 hover:border-green-600 hover:text-green-700 transition-colors"
            >
              <Paperclip size={18} /> Attach File
            </button>
          </div>

          {/* Camera capture (opens the camera on phones) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => { addAttachments(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
          {/* Photo library (existing images) */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => { addAttachments(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
          {/* Any file type */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={e => { addAttachments(e.target.files); e.target.value = ''; }}
            className="hidden"
          />

          {attachError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{attachError}</p>}

          {!c.attachments?.length ? (
            <p className="text-xs text-gray-400 dark:text-neutral-500 italic">No files or photos yet. Tap “Add” to attach.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {c.attachments.map((att) => {
                const isImage = att.type?.startsWith('image/');
                return (
                  <div key={att.id} className="relative group border border-gray-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                    <a href={att.dataUrl} target="_blank" rel="noopener noreferrer" download={att.name} className="block">
                      {isImage ? (
                        <img src={att.dataUrl} alt={att.name} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-800 px-1">
                          <FileText size={20} className="text-gray-400 dark:text-neutral-500" />
                          <span className="text-[10px] text-gray-500 dark:text-neutral-400 truncate w-full text-center mt-1">{att.name}</span>
                        </div>
                      )}
                    </a>
                    <div className="flex items-center justify-between px-1.5 py-1 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800">
                      <span className="text-[10px] text-gray-400 dark:text-neutral-500">{formatSize(att.size)}</span>
                      <div className="flex items-center gap-1">
                        <a href={att.dataUrl} download={att.name} className="text-gray-400 dark:text-neutral-500 hover:text-green-700"><Download size={12} /></a>
                        <button onClick={() => removeAttachment(att.id)} className="text-gray-400 dark:text-neutral-500 hover:text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      {/* Family */}
      <Section title="Family Members" icon={Users}>
        {c.family?.length === 0 && !editing && (
          <p className="text-sm text-gray-400 dark:text-neutral-500 italic">No family info noted yet</p>
        )}
        {c.family?.map((member, i) => (
          <div key={member.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-800 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-neutral-100">{member.name}</p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">{member.relation}</p>
            </div>
            {editing && (
              <button onClick={() => setDraft(p => ({ ...p, family: p.family.filter((_, j) => j !== i) }))} className="text-red-400">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {editing && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={newFamilyMember.name}
              onChange={e => setNewFamilyMember(p => ({ ...p, name: e.target.value }))}
              className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <input
              type="text"
              placeholder="Relation"
              value={newFamilyMember.relation}
              onChange={e => setNewFamilyMember(p => ({ ...p, relation: e.target.value }))}
              className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <button onClick={addFamily} className="bg-green-800 text-white px-3 py-2 rounded-lg">
              <Plus size={14} />
            </button>
          </div>
        )}
      </Section>

      {/* Events */}
      <Section title="Upcoming Events" icon={Calendar}>
        {c.upcomingEvents?.length === 0 && !editing && (
          <p className="text-sm text-gray-400 dark:text-neutral-500 italic">No events noted yet</p>
        )}
        {c.upcomingEvents?.map((event, i) => (
          <div key={event.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-neutral-800 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-neutral-100">{event.title}</p>
              {event.date && <p className="text-xs text-gray-500 dark:text-neutral-400">{new Date(event.date).toLocaleDateString()}</p>}
            </div>
            {editing && (
              <button onClick={() => setDraft(p => ({ ...p, upcomingEvents: p.upcomingEvents.filter((_, j) => j !== i) }))} className="text-red-400">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {editing && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Event title"
              value={newEvent.title}
              onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
              className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
              className="border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <button onClick={addEvent} className="bg-green-800 text-white px-3 py-2 rounded-lg">
              <Plus size={14} />
            </button>
          </div>
        )}
      </Section>

      {/* Call history */}
      <Section title="Call History" icon={Mic}>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => onRecord(client.id)}
            className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-800 dark:text-green-300 rounded-lg py-2.5 text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <Mic size={15} />
            Record
          </button>
          <button
            onClick={() => setQuickOpen(o => !o)}
            className="flex items-center justify-center gap-2 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded-lg py-2.5 text-sm font-medium hover:border-green-600 hover:text-green-700 transition-colors"
          >
            <Plus size={15} />
            Quick log
          </button>
        </div>
        {quickOpen && (
          <div className="mb-3">
            <textarea
              autoFocus
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              rows={2}
              placeholder="What did you talk about? (e.g. 'Called Jane, she's interested in upgrading next month')"
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none mb-2"
            />
            <div className="flex gap-2">
              <button onClick={() => { setQuickOpen(false); setQuickText(''); }} className="flex-1 border border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-neutral-300 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={saveQuickLog} disabled={!quickText.trim()} className="flex-1 bg-green-800 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Save note</button>
            </div>
          </div>
        )}

        {/* AI follow-up email */}
        {latestCallWithTranscript() && (
          <button
            onClick={generateFollowupEmail}
            disabled={emailBusy}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded-lg py-2.5 text-sm font-medium mb-3 hover:border-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
          >
            <Mail size={15} />
            {emailBusy ? 'Drafting…' : 'Draft follow-up email (AI)'}
          </button>
        )}
        {emailError && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{emailError}</p>}
        {emailDraft && (
          <div className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 mb-3">
            <p className="text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">Subject</p>
            <p className="text-sm text-gray-900 dark:text-neutral-100 mb-2">{emailDraft.subject}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">Body</p>
            <p className="text-sm text-gray-800 dark:text-neutral-100 whitespace-pre-wrap mb-3">{emailDraft.body}</p>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(`${emailDraft.subject}\n\n${emailDraft.body}`)}
                className="flex-1 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 py-2 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-neutral-800">Copy</button>
              <a href={mailtoLink()} className="flex-1 text-center bg-green-800 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-900">Open in email</a>
              <button onClick={() => setEmailDraft(null)} className="px-3 text-gray-400 dark:text-neutral-500 text-xs">Close</button>
            </div>
          </div>
        )}

        {client.callHistory?.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-neutral-500 italic text-center py-2">No calls recorded yet</p>
        )}

        {/* Sort controls */}
        {client.callHistory?.length > 1 && (
          <div className="flex gap-1.5 mb-3">
            {[['recent', 'Most recent'], ['oldest', 'Oldest'], ['manual', 'Custom']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCallSort(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  callSort === key ? 'bg-green-800 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {orderCalls(client.callHistory, callSort).map((call, i, arr) => (
          <div key={call.id || i} className={`border rounded-lg p-3 mb-2 ${call.pinned ? 'border-green-300 bg-green-50/40' : 'border-gray-100 dark:border-neutral-800'}`}>
            {/* Title row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              {editingTitleId === call.id ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Call title…"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveCallTitle(call.id)}
                    className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                  <button onClick={() => saveCallTitle(call.id)} className="text-green-700 dark:text-green-400"><Save size={14} /></button>
                  <button onClick={() => setEditingTitleId(null)} className="text-gray-400 dark:text-neutral-500"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => startEditTitle(call)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-neutral-100 hover:text-green-700 group text-left">
                  {call.pinned && <Pin size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" fill="currentColor" />}
                  {call.title || <span className="text-gray-400 dark:text-neutral-500 font-normal italic">Add a title…</span>}
                  <Edit2 size={11} className="text-gray-300 group-hover:text-green-700 flex-shrink-0" />
                </button>
              )}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {callSort === 'manual' && (
                  <>
                    <button onClick={() => moveCall(call.id, -1)} disabled={i === 0} className="text-gray-400 dark:text-neutral-500 hover:text-green-700 disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button onClick={() => moveCall(call.id, 1)} disabled={i === arr.length - 1} className="text-gray-400 dark:text-neutral-500 hover:text-green-700 disabled:opacity-30"><ChevronDown size={15} /></button>
                  </>
                )}
                <button onClick={() => togglePin(call.id)} title={call.pinned ? 'Unpin' : 'Pin to top'} className={call.pinned ? 'text-green-600 dark:text-green-400' : 'text-gray-300 hover:text-green-600'}>
                  <Pin size={14} fill={call.pinned ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Date/time row */}
            <div className="flex items-center justify-between mb-1 gap-2">
              {editingCallId === call.id ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="datetime-local"
                    value={callDateDraft}
                    onChange={e => setCallDateDraft(e.target.value)}
                    className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                  />
                  <button onClick={() => saveCallDate(call.id)} className="text-green-700 dark:text-green-400"><Save size={14} /></button>
                  <button onClick={() => setEditingCallId(null)} className="text-gray-400 dark:text-neutral-500"><X size={14} /></button>
                </div>
              ) : (
                <button
                  onClick={() => startEditCallDate(call)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-neutral-400 hover:text-green-700 group"
                  title="Edit call date & time"
                >
                  <Clock size={12} className="text-gray-400 dark:text-neutral-500 group-hover:text-green-700" />
                  {formatCallDateTime(call.date)}
                  <Edit2 size={10} className="text-gray-300 group-hover:text-green-700" />
                </button>
              )}
              {call.duration && <span className="text-xs text-gray-400 dark:text-neutral-500 flex-shrink-0">{call.duration}</span>}
            </div>
            {call.source && <p className="text-[11px] text-gray-400 dark:text-neutral-500 mb-1">via {call.source}</p>}
            {call.summary && <p className="text-sm text-gray-700 dark:text-neutral-300 mb-2">{call.summary}</p>}
            {call.extracted && (
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-2.5 mt-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">AI Extracted Info:</p>
                <p className="text-xs text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">{call.extracted}</p>
              </div>
            )}
          </div>
        ))}
      </Section>

      {/* Delete */}
      {!editing && (
        <div className="mt-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 text-red-500 border border-red-200 dark:border-red-900 rounded-xl py-3 text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              Delete Client
            </button>
          ) : (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-3">Are you sure you want to delete {client.name}?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-gray-300 dark:border-neutral-700 rounded-lg py-2 text-sm text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800">
                  Cancel
                </button>
                <button onClick={() => onDelete(client.id)} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
