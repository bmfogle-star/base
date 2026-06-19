import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { getCustomFields } from '../lib/api';

const DRAFT_KEY = 'spark_addclient_draft';
const EMPTY = { name: '', phone: '', email: '', company: '', position: '', notes: '', customFields: {} };

export default function AddClient({ onBack, onSave }) {
  const customFields = getCustomFields();
  const [form, setForm] = useState(() => {
    try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') || {}) }; }
    catch { return EMPTY; }
  });
  const [saving, setSaving] = useState(false);

  // Auto-save the in-progress form so nothing is lost if they leave.
  const draftTimer = useRef(null);
  useEffect(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(form)), 400);
    return () => clearTimeout(draftTimer.current);
  }, [form]);

  function set(field, value) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function setCustom(key, value) {
    setForm(p => ({ ...p, customFields: { ...p.customFields, [key]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    localStorage.removeItem(DRAFT_KEY); // draft consumed
    onSave(form);
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 -ml-1">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-xl text-gray-900">New Client</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Info</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Phone</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Company</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={form.company}
                onChange={e => set('company', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Position / Title</label>
              <input
                type="text"
                placeholder="CEO"
                value={form.position}
                onChange={e => set('position', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>
        </div>

        {customFields.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Details</h3>
            <div className="space-y-3">
              {customFields.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 font-medium block mb-1">{f.label}</label>
                  <input
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={form.customFields[f.key] || ''}
                    onChange={e => setCustom(f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Initial Notes</h3>
          <textarea
            placeholder="Any initial notes about this client..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!form.name.trim() || saving}
          className="w-full flex items-center justify-center gap-2 bg-green-800 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={16} />
          Create Client
        </button>
      </form>
    </div>
  );
}
