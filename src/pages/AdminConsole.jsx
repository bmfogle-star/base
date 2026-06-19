import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader, Copy, Check, Users, Settings as Cog, Plus, Trash2, Building2, Upload } from 'lucide-react';
import { getOrg, updateOrgSettings, updateOrgSeats, setMemberRole, fetchMe } from '../lib/api';
import { compressImageFile } from '../lib/image';

function monthlyPrice(seats) { return seats > 50 ? 1000 : 500; }

export default function AdminConsole({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [branding, setBranding] = useState({ companyName: '', accentColor: '#15803d', logo: '' });
  const logoInputRef = useRef(null);

  async function handleLogo(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const logo = await compressImageFile(file, 256, 0.85); // small logo
      setBranding(b => ({ ...b, logo }));
    } catch { /* ignore */ }
  }
  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({ label: '', type: 'text' });
  const [savedMsg, setSavedMsg] = useState('');

  const myRole = data?.members?.find?.(m => m.email === data?.me)?.role; // best-effort
  const canManage = true; // route is only reachable by org members; server enforces real perms

  async function load() {
    setLoading(true); setError('');
    try {
      const org = await getOrg();
      setData(org);
      setBranding({
        companyName: org.settings?.branding?.companyName || org.org?.name || '',
        accentColor: org.settings?.branding?.accentColor || '#15803d',
        logo: org.settings?.branding?.logo || '',
      });
      setCustomFields(org.settings?.customFields || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Auto-save branding + custom fields shortly after a change.
  const settingsTimer = useRef(null);
  const skipFirstSettings = useRef(true);
  useEffect(() => {
    if (loading || !data?.org) return;
    if (skipFirstSettings.current) { skipFirstSettings.current = false; return; }
    clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => { saveSettings(); }, 700);
    return () => clearTimeout(settingsTimer.current);
  }, [branding, customFields]);

  function copyCode() {
    navigator.clipboard?.writeText(data.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function saveSettings() {
    setSavedMsg('');
    try {
      await updateOrgSettings({ branding, customFields });
      await fetchMe().catch(() => {}); // refresh cached custom fields for the forms
      setSavedMsg('Saved');
      setTimeout(() => setSavedMsg(''), 1500);
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeSeats(seats) {
    try {
      const res = await updateOrgSeats(seats);
      setData(d => ({ ...d, org: { ...d.org, seats: res.seats } }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function changeRole(memberId, role) {
    try {
      await setMemberRole(memberId, role);
      setData(d => ({ ...d, members: d.members.map(m => m.id === memberId ? { ...m, role } : m) }));
    } catch (e) {
      setError(e.message);
    }
  }

  function addField() {
    if (!newField.label.trim()) return;
    const key = newField.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    setCustomFields(f => [...f, { key, label: newField.label.trim(), type: newField.type }]);
    setNewField({ label: '', type: 'text' });
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 -ml-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-neutral-300" />
        </button>
        <h1 className="text-xl text-gray-900 dark:text-neutral-100">Team & Admin</h1>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-8 text-center">
          <Loader size={32} className="text-green-700 dark:text-green-400 mx-auto animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-5 text-center">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>
          <button onClick={load} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
        </div>
      ) : !data?.org ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-6 text-center text-sm text-gray-500 dark:text-neutral-400">
          You’re not part of an organization yet.
        </div>
      ) : (
        <>
          {/* Overview */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={15} className="text-gold" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">{data.org.name}</h3>
            </div>
            <div className="bg-green-50 dark:bg-green-950/40 rounded-lg p-3 mb-3">
              <p className="text-xs text-green-700 dark:text-green-400 mb-1">Invite code — share with employees</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-widest text-green-900 dark:text-green-200">{data.joinCode}</span>
                <button onClick={copyCode} className="text-green-700 dark:text-green-400 hover:text-green-900">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-neutral-400">Seats used</p>
                <p className="text-lg font-bold text-gray-900 dark:text-neutral-100">{data.seatsUsed} / {data.org.seats}</p>
              </div>
              <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-neutral-400">Monthly</p>
                <p className="text-lg font-bold text-gray-900 dark:text-neutral-100">${monthlyPrice(data.org.seats).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <label className="text-xs text-gray-500 dark:text-neutral-400">Seats</label>
              <input
                type="number"
                min={data.seatsUsed}
                defaultValue={data.org.seats}
                onBlur={e => changeSeats(parseInt(e.target.value, 10))}
                className="w-20 border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <span className="text-xs text-gray-400 dark:text-neutral-500">$500/mo ≤50, $1,000/mo for 51+</span>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800">
              <Users size={15} className="text-gold" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Members ({data.members.length})</h3>
            </div>
            {data.members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-800 dark:text-neutral-100 truncate">{m.email}</span>
                {m.role === 'owner' ? (
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-2 py-1 rounded-full">Owner</span>
                ) : (
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                    className="text-xs border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-600">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
              </div>
            ))}
          </div>

          {/* Customization */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Cog size={15} className="text-gold" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Customization</h3>
            </div>
            <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">Company name (shown in-app)</label>
            <input type="text" value={branding.companyName} onChange={e => setBranding(b => ({ ...b, companyName: e.target.value }))}
              className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-green-600" />
            <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">Company logo</label>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-neutral-800 flex-shrink-0">
                {branding.logo
                  ? <img src={branding.logo} alt="logo" className="w-full h-full object-contain" />
                  : <Building2 size={18} className="text-gray-300" />}
              </div>
              <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1.5 text-sm text-green-700 dark:text-green-400 font-medium hover:text-green-800">
                <Upload size={14} /> {branding.logo ? 'Replace' : 'Upload'}
              </button>
              {branding.logo && (
                <button onClick={() => setBranding(b => ({ ...b, logo: '' }))} className="text-xs text-red-500 hover:underline">Remove</button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" onChange={e => { handleLogo(e.target.files); e.target.value = ''; }} className="hidden" />
            </div>

            <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">Primary color</label>
            <input type="color" value={branding.accentColor} onChange={e => setBranding(b => ({ ...b, accentColor: e.target.value }))}
              className="w-16 h-9 rounded border border-gray-200 dark:border-neutral-700 mb-4" />

            <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-2">Custom client fields</label>
            {customFields.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-800 dark:text-neutral-100">{f.label} <span className="text-xs text-gray-400 dark:text-neutral-500">({f.type})</span></span>
                <button onClick={() => setCustomFields(cf => cf.filter((_, j) => j !== i))} className="text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input type="text" placeholder="Field name (e.g. Region)" value={newField.label}
                onChange={e => setNewField(n => ({ ...n, label: e.target.value }))}
                className="flex-1 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600" />
              <select value={newField.type} onChange={e => setNewField(n => ({ ...n, type: e.target.value }))}
                className="border border-gray-200 dark:border-neutral-700 rounded-lg px-2 py-2 text-sm">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
              <button onClick={addField} className="bg-green-800 text-white px-3 rounded-lg"><Plus size={14} /></button>
            </div>
          </div>

          <button onClick={saveSettings}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-colors ${savedMsg ? 'bg-green-600 text-white' : 'bg-green-800 text-white hover:bg-green-900'}`}>
            {savedMsg ? '✓ Saved!' : 'Save customization'}
          </button>
        </>
      )}
    </div>
  );
}
