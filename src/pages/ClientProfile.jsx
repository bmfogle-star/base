import { useState, useRef } from 'react';
import { ArrowLeft, Edit2, Star, Phone, Mail, Building, Calendar, Heart, Users, Mic, Trash2, Plus, Tag, Save, X, Paperclip, FileText, Download, Camera, Image as ImageIcon } from 'lucide-react';

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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <Icon size={15} className="text-gray-500" />
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function TagChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-green-50 text-green-800 text-xs px-2 py-1 rounded-full">
      {label}
      {onRemove && <button onClick={onRemove}><X size={11} /></button>}
    </span>
  );
}

export default function ClientProfile({ client, onBack, onUpdate, onDelete, onRecord }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(client);
  const [newTag, setNewTag] = useState('');
  const [newHobby, setNewHobby] = useState('');
  const [newFamilyMember, setNewFamilyMember] = useState({ name: '', relation: '' });
  const [newEvent, setNewEvent] = useState({ title: '', date: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  function field(label, value, field, type = 'text', icon) {
    return (
      <div className="mb-3">
        <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
        {editing ? (
          <input
            type={type}
            value={draft[field] || ''}
            onChange={e => setDraft(p => ({ ...p, [field]: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        ) : (
          <p className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">Not set</span>}</p>
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

  return (
    <div className="pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 -ml-1">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <span className="font-medium text-gray-600 text-sm">Back to Clients</span>
        <div className="flex-1" />
        {!editing && (
          <>
            <button
              onClick={() => onUpdate({ ...client, starred: !client.starred })}
              className={client.starred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}
            >
              <Star size={20} fill={client.starred ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => { setDraft(client); setEditing(true); }}
              className="flex items-center gap-1.5 bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Edit2 size={14} />
              Edit
            </button>
          </>
        )}
        {editing && (
          <>
            <button onClick={() => setEditing(false)} className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-100">
              Cancel
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
              <Save size={14} />
              Save
            </button>
          </>
        )}
      </div>

      {/* Avatar + name */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-3 flex items-center gap-4">
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
              className="text-xl font-bold text-gray-900 w-full border-b border-gray-300 focus:outline-none focus:border-green-600 pb-1"
            />
          ) : (
            <h2 className="text-xl font-bold text-gray-900">{c.name || 'Unnamed Client'}</h2>
          )}
          <p className="text-sm text-gray-500 mt-1">{c.company || ''} {c.position ? `· ${c.position}` : ''}</p>
          {c.attachments?.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {c.attachments.filter(a => a.type?.startsWith('image/')).slice(0, 3).map(a => (
                  <img key={a.id} src={a.dataUrl} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                ))}
              </div>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Paperclip size={12} />{c.attachments.length} {c.attachments.length === 1 ? 'file' : 'files'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag size={14} className="text-gray-400" />
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
                className="text-xs border border-gray-200 rounded-full px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              <button onClick={addTag} className="text-green-700"><Plus size={14} /></button>
            </div>
          )}
          {!c.tags?.length && !editing && <span className="text-xs text-gray-400 italic">No tags</span>}
        </div>
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
          <label className="text-xs text-gray-500 font-medium block mb-2">Hobbies & Interests</label>
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
                  className="text-xs border border-gray-200 rounded-full px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
                <button onClick={addHobby} className="text-purple-600"><Plus size={14} /></button>
              </div>
            )}
            {!c.hobbies?.length && !editing && <span className="text-xs text-gray-400 italic">None noted yet</span>}
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
          {editing ? (
            <textarea
              value={draft.notes || ''}
              onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))}
              rows={3}
              placeholder="Any personal notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
            />
          ) : (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.notes || <span className="text-gray-400 italic">No notes yet</span>}</p>
          )}
        </div>

        {/* Attachments */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="text-xs text-gray-500 font-medium block mb-2">Files & Photos</label>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-green-600 hover:text-green-700 transition-colors"
            >
              <Camera size={18} /> Take Photo
            </button>
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-green-600 hover:text-green-700 transition-colors"
            >
              <ImageIcon size={18} /> Photo Library
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 py-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-green-600 hover:text-green-700 transition-colors"
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

          {attachError && <p className="text-xs text-red-600 mb-2">{attachError}</p>}

          {!c.attachments?.length ? (
            <p className="text-xs text-gray-400 italic">No files or photos yet. Tap “Add” to attach.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {c.attachments.map((att) => {
                const isImage = att.type?.startsWith('image/');
                return (
                  <div key={att.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                    <a href={att.dataUrl} target="_blank" rel="noopener noreferrer" download={att.name} className="block">
                      {isImage ? (
                        <img src={att.dataUrl} alt={att.name} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center bg-gray-50 px-1">
                          <FileText size={20} className="text-gray-400" />
                          <span className="text-[10px] text-gray-500 truncate w-full text-center mt-1">{att.name}</span>
                        </div>
                      )}
                    </a>
                    <div className="flex items-center justify-between px-1.5 py-1 bg-white border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">{formatSize(att.size)}</span>
                      <div className="flex items-center gap-1">
                        <a href={att.dataUrl} download={att.name} className="text-gray-400 hover:text-green-700"><Download size={12} /></a>
                        <button onClick={() => removeAttachment(att.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
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
          <p className="text-sm text-gray-400 italic">No family info noted yet</p>
        )}
        {c.family?.map((member, i) => (
          <div key={member.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{member.name}</p>
              <p className="text-xs text-gray-500">{member.relation}</p>
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
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <input
              type="text"
              placeholder="Relation"
              value={newFamilyMember.relation}
              onChange={e => setNewFamilyMember(p => ({ ...p, relation: e.target.value }))}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <button onClick={addFamily} className="bg-green-700 text-white px-3 py-2 rounded-lg">
              <Plus size={14} />
            </button>
          </div>
        )}
      </Section>

      {/* Events */}
      <Section title="Upcoming Events" icon={Calendar}>
        {c.upcomingEvents?.length === 0 && !editing && (
          <p className="text-sm text-gray-400 italic">No events noted yet</p>
        )}
        {c.upcomingEvents?.map((event, i) => (
          <div key={event.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-800">{event.title}</p>
              {event.date && <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString()}</p>}
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
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <input
              type="date"
              value={newEvent.date}
              onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <button onClick={addEvent} className="bg-green-700 text-white px-3 py-2 rounded-lg">
              <Plus size={14} />
            </button>
          </div>
        )}
      </Section>

      {/* Call history */}
      <Section title="Call History" icon={Mic}>
        <button
          onClick={() => onRecord(client.id)}
          className="w-full flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg py-2.5 text-sm font-medium mb-3 hover:bg-green-100 transition-colors"
        >
          <Mic size={15} />
          Record New Call
        </button>
        {client.callHistory?.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-2">No calls recorded yet</p>
        )}
        {client.callHistory?.map((call, i) => (
          <div key={call.id || i} className="border border-gray-100 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-700">{new Date(call.date).toLocaleDateString()}</p>
              <span className="text-xs text-gray-400">{call.duration || ''}</span>
            </div>
            {call.summary && <p className="text-sm text-gray-700 mb-2">{call.summary}</p>}
            {call.extracted && (
              <div className="bg-gray-50 rounded-lg p-2.5 mt-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">AI Extracted Info:</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">{call.extracted}</p>
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
              className="w-full flex items-center justify-center gap-2 text-red-500 border border-red-200 rounded-xl py-3 text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              Delete Client
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-red-700 mb-3">Are you sure you want to delete {client.name}?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-100">
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
