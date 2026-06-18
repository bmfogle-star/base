import { useState, useEffect, useRef } from 'react';
import { Save, Key, CreditCard, Info, Eye, EyeOff, Video, Mic, Server } from 'lucide-react';
import { getUser, saveUser } from '../data/store';
import AccountCard from '../components/AccountCard';
import { isLoggedIn, startCheckout, createOrg, joinOrg } from '../lib/api';

function ApiKeyField({ label, value, onChange, placeholder, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Settings({ onKeysChange, onManageOrg }) {
  const user = getUser() || {};
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    apiKey: user.apiKey || '',
    openaiKey: user.openaiKey || '',
    recallKey: user.recallKey || '',
    botServerUrl: user.botServerUrl || '',
    botServerToken: user.botServerToken || '',
    backendUrl: user.backendUrl || '',
    plan: user.plan || 'premium',
  });
  const [saved, setSaved] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Enterprise join/create
  const [entMode, setEntMode] = useState(null); // null | 'join' | 'create'
  const [joinCode, setJoinCode] = useState('');
  const [orgName, setOrgName] = useState('');
  const [entBusy, setEntBusy] = useState(false);
  const [entError, setEntError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  async function handleJoinEnterprise() {
    setEntError('');
    if (!isLoggedIn()) { setEntError('Sign in to your Spark account above first.'); return; }
    setEntBusy(true);
    try {
      await joinOrg(joinCode);
      window.location.reload(); // refresh account → enterprise, triggers sync
    } catch (e) {
      setEntError(e.message); setEntBusy(false);
    }
  }

  async function handleCreateEnterprise() {
    setEntError('');
    if (!isLoggedIn()) { setEntError('Sign in to your Spark account above first.'); return; }
    setEntBusy(true);
    try {
      const res = await createOrg(orgName);
      setCreatedCode(res.joinCode);
      setEntBusy(false);
    } catch (e) {
      setEntError(e.message); setEntBusy(false);
    }
  }

  async function subscribe(plan) {
    setCheckoutError('');
    if (!isLoggedIn()) {
      setCheckoutError('Create or sign into a Spark account above first.');
      return;
    }
    setCheckoutBusy(true);
    try {
      const url = await startCheckout(plan);
      window.location.href = url; // redirect to Stripe's hosted checkout
    } catch (e) {
      setCheckoutError(e.message.includes('not configured')
        ? 'Billing isn’t set up on the backend yet (add your Stripe keys).'
        : e.message);
      setCheckoutBusy(false);
    }
  }

  function persist() {
    const updated = { ...user, ...form };
    saveUser(updated);
    if (onKeysChange) onKeysChange({
      apiKey: form.apiKey, openaiKey: form.openaiKey, recallKey: form.recallKey,
      botServerUrl: form.botServerUrl, botServerToken: form.botServerToken,
    });
  }

  function handleSave() {
    persist();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Auto-save settings shortly after the user stops editing.
  const settingsTimer = useRef(null);
  const skipFirstSettings = useRef(true);
  useEffect(() => {
    if (skipFirstSettings.current) { skipFirstSettings.current = false; return; }
    clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(() => persist(), 600);
    return () => clearTimeout(settingsTimer.current);
  }, [form]);

  return (
    <div className="pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Profile</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Your Name</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Smith"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
          </div>
        </div>
      </div>

      {/* Account (shows when a backend is configured) */}
      <AccountCard onManageOrg={onManageOrg} />

      {/* Backend connection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Server size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Spark Backend (optional)</h3>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Connect your deployed Spark backend so you can sign in and use AI without
          entering your own keys. Leave blank to use the personal keys below.
        </p>
        <input
          type="url"
          value={form.backendUrl}
          onChange={e => set('backendUrl', e.target.value)}
          placeholder="https://your-spark-backend.fly.dev"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        <p className="text-xs text-gray-400 mt-1">After changing this, tap Save, then sign in above.</p>
      </div>

      {/* AI Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Personal API Keys (no account)</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">These keys power call transcription and AI extraction. All stored locally on your device.</p>

        {/* Setup guide */}
        <details className="mb-4 bg-green-50 border border-green-100 rounded-lg overflow-hidden">
          <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-xs font-semibold text-green-800 select-none">
            <Info size={14} className="text-green-700" />
            New here? How to set up your AI key (2 min)
          </summary>
          <div className="px-3 pb-3 pt-1 text-xs text-green-800 space-y-2">
            <p>Spark uses AI to read your call transcripts and pull out the personal details about each client. To turn that on, you just need one free-to-create key:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-green-700">
              <li>Go to <span className="font-semibold">console.anthropic.com</span> and sign up (or log in).</li>
              <li>On the left, click <span className="font-semibold">API Keys</span>.</li>
              <li>Click <span className="font-semibold">Create Key</span>, give it a name like “Spark”, and copy the key (it starts with <span className="font-mono">sk-ant-</span>).</li>
              <li>Paste it into the <span className="font-semibold">Claude API Key</span> box below and tap <span className="font-semibold">Save Settings</span>.</li>
              <li>Tip: under <span className="font-semibold">Billing → Limits</span>, set a low monthly cap (e.g. $5) so there are no surprises. Each call costs only a fraction of a cent.</li>
            </ol>
            <p className="pt-1">The other keys below are <span className="font-semibold">optional</span> — file transcription already works for free on your device, and the meeting-bot keys are only needed if you want a bot to auto-join Zoom/Meet calls.</p>
            <p className="text-green-600">🔒 Your key is stored only on this device and is never sent to Spark’s servers.</p>
          </div>
        </details>

        <ApiKeyField
          label="Claude API Key — AI info extraction"
          value={form.apiKey}
          onChange={v => set('apiKey', v)}
          placeholder="sk-ant-..."
          hint="Used to extract client details from transcripts. Get yours at console.anthropic.com"
        />

        <ApiKeyField
          label="OpenAI API Key — audio file transcription"
          value={form.openaiKey}
          onChange={v => set('openaiKey', v)}
          placeholder="sk-..."
          hint="Used by Whisper to transcribe uploaded call recordings. Get yours at platform.openai.com"
        />

        <div className="border-t border-gray-100 pt-3 mt-1">
          <p className="text-xs font-semibold text-gray-600 mb-2">Meeting bot (Zoom / Google Meet)</p>

          <label className="text-xs text-gray-500 font-medium block mb-1">Your bot server URL (self-hosted, free)</label>
          <input
            type="url"
            value={form.botServerUrl}
            onChange={e => set('botServerUrl', e.target.value)}
            placeholder="https://your-server.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 mb-2"
          />
          <ApiKeyField
            label="Bot server token"
            value={form.botServerToken}
            onChange={v => set('botServerToken', v)}
            placeholder="The BOT_API_TOKEN you set on your server"
            hint="Run the free bot server in /server (see its README) on a ~$5/mo VPS. Google Meet works best."
          />

          <details className="mt-1">
            <summary className="text-xs text-green-700 cursor-pointer">Prefer a managed option instead? (paid)</summary>
            <div className="mt-2">
              <ApiKeyField
                label="Recall.ai API Key"
                value={form.recallKey}
                onChange={v => set('recallKey', v)}
                placeholder="Token ..."
                hint="Managed bot service — no server to run, but charges per minute. From recall.ai"
              />
            </div>
          </details>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">How call recording works</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mic size={14} className="text-green-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Live mic</p>
              <p className="text-xs text-gray-500">Records your microphone in real time. Put the call on speaker to capture both sides.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 text-xs font-bold">MP3</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Upload recording</p>
              <p className="text-xs text-gray-500">Upload any audio or video file (iPhone Voice Memos, MP3, MP4, M4A, WAV). Whisper transcribes it, Claude extracts the details.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Video size={14} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Zoom / Meet / Teams bot</p>
              <p className="text-xs text-gray-500">Paste a meeting link and a bot joins automatically, records the whole call, and sends the transcript straight back to this client's profile.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Subscription</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => set('plan', 'premium')}
            className={`border-2 rounded-xl p-3 cursor-pointer transition-colors ${form.plan === 'premium' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Premium</p>
              <span className="text-xs bg-green-700 text-white px-2 py-0.5 rounded-full">Popular</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Up to 20 clients · 4 devices</p>
            <p className="text-lg font-bold text-gray-900 mt-2">$4.99<span className="text-xs font-normal text-gray-500">/mo</span></p>
          </div>
          <div onClick={() => set('plan', 'platinum')}
            className={`border-2 rounded-xl p-3 cursor-pointer transition-colors ${form.plan === 'platinum' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Platinum</p>
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Pro</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Unlimited clients · 8 devices</p>
            <p className="text-lg font-bold text-gray-900 mt-2">$11.99<span className="text-xs font-normal text-gray-500">/mo</span></p>
          </div>
        </div>
        {form.plan === 'premium' && (
          <button onClick={() => subscribe('premium')} disabled={checkoutBusy}
            className="mt-3 w-full bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-800 transition-colors disabled:opacity-50">
            {checkoutBusy ? 'Redirecting to checkout…' : 'Subscribe to Premium — $4.99/month'}
          </button>
        )}
        {form.plan === 'platinum' && (
          <button onClick={() => subscribe('platinum')} disabled={checkoutBusy}
            className="mt-3 w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">
            {checkoutBusy ? 'Redirecting to checkout…' : 'Subscribe to Platinum — $11.99/month'}
          </button>
        )}

        {/* Enterprise */}
        <div className="mt-3 border-2 border-gray-900 rounded-xl p-4 bg-gray-900 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="font-bold text-sm">Enterprise</p>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">For teams</span>
          </div>
          <p className="text-xs text-gray-300 mb-2">
            Buy once for your whole company — central admin, shared client data,
            custom fields, your branding, SSO, and unlimited devices. Like
            Salesforce, tuned for sales rapport.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white/10 rounded-lg p-2.5">
              <p className="text-lg font-bold">$500<span className="text-xs font-normal text-gray-300">/mo</span></p>
              <p className="text-xs text-gray-300">Up to 50 employees</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5">
              <p className="text-lg font-bold">$1,000<span className="text-xs font-normal text-gray-300">/mo</span></p>
              <p className="text-xs text-gray-300">51+ employees</p>
            </div>
          </div>
          <ul className="text-xs text-gray-300 space-y-0.5 mb-3">
            <li>• Unlimited clients, AI &amp; devices</li>
            <li>• Admin console, roles &amp; seats</li>
            <li>• Custom fields + company branding</li>
            <li>• SSO &amp; priority support</li>
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setEntMode(entMode === 'join' ? null : 'join'); setEntError(''); setCreatedCode(''); }}
              className="text-center bg-white/10 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20"
            >
              Join an Enterprise
            </button>
            <button
              onClick={() => { setEntMode(entMode === 'create' ? null : 'create'); setEntError(''); setCreatedCode(''); }}
              className="text-center bg-white text-gray-900 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
              Create an Enterprise
            </button>
          </div>

          {/* Join flow */}
          {entMode === 'join' && (
            <div className="mt-3 bg-white/10 rounded-xl p-3">
              <p className="text-xs text-gray-300 mb-2">Enter the join code your company gave you.</p>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7K2QP9"
                maxLength={6}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 tracking-widest uppercase focus:outline-none mb-2"
              />
              <button onClick={handleJoinEnterprise} disabled={entBusy || !joinCode.trim()}
                className="w-full bg-white text-gray-900 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
                {entBusy ? 'Joining…' : 'Join'}
              </button>
            </div>
          )}

          {/* Create flow */}
          {entMode === 'create' && (
            <div className="mt-3 bg-white/10 rounded-xl p-3">
              {createdCode ? (
                <div className="text-center">
                  <p className="text-xs text-gray-300 mb-1">Your enterprise is ready! Share this code with your team:</p>
                  <p className="text-2xl font-bold tracking-widest my-2">{createdCode}</p>
                  <p className="text-xs text-gray-300 mb-3">Employees enter it under “Join an Enterprise.”</p>
                  <button onClick={() => window.location.reload()} className="w-full bg-white text-gray-900 py-2.5 rounded-lg text-sm font-semibold">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-300 mb-2">Name your company to create its workspace. You’ll get a code to invite employees.</p>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Company name"
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none mb-2"
                  />
                  <button onClick={handleCreateEnterprise} disabled={entBusy || !orgName.trim()}
                    className="w-full bg-white text-gray-900 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">
                    {entBusy ? 'Creating…' : 'Create Enterprise'}
                  </button>
                </>
              )}
            </div>
          )}

          {entError && <p className="text-xs text-red-300 mt-2">{entError}</p>}

          <a
            href="mailto:sales@spark.app?subject=Spark%20Enterprise%20Inquiry"
            className="block text-center text-xs text-gray-400 hover:text-gray-200 mt-3"
          >
            Or contact sales →
          </a>
        </div>
        {checkoutError && <p className="text-xs text-red-600 mt-2">{checkoutError}</p>}
      </div>

      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4 flex gap-3">
        <Info size={16} className="text-green-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-800">All API keys are stored locally on your device only. They are never sent to Spark servers.</p>
      </div>

      <button onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-green-700 text-white hover:bg-green-800'}`}>
        <Save size={16} />
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
