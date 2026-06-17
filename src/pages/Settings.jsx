import { useState } from 'react';
import { Save, Key, CreditCard, Info, Eye, EyeOff, Video, Mic } from 'lucide-react';
import { getUser, saveUser } from '../data/store';

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
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function Settings({ onKeysChange }) {
  const user = getUser() || {};
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    apiKey: user.apiKey || '',
    openaiKey: user.openaiKey || '',
    recallKey: user.recallKey || '',
    plan: user.plan || 'free',
  });
  const [saved, setSaved] = useState(false);

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  function handleSave() {
    const updated = { ...user, ...form };
    saveUser(updated);
    if (onKeysChange) onKeysChange({ apiKey: form.apiKey, openaiKey: form.openaiKey, recallKey: form.recallKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

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
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* AI Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">AI & Integrations</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">These keys power call transcription and AI extraction. All stored locally on your device.</p>

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

        <ApiKeyField
          label="Recall.ai API Key — Zoom / Meet / Teams bot"
          value={form.recallKey}
          onChange={v => set('recallKey', v)}
          placeholder="Token ..."
          hint="Sends a bot to join and record your video meetings. Get yours at recall.ai"
        />
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">How call recording works</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mic size={14} className="text-blue-600" />
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
          <div onClick={() => set('plan', 'free')}
            className={`border-2 rounded-xl p-3 cursor-pointer transition-colors ${form.plan === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <p className="font-bold text-gray-900 text-sm">Free</p>
            <p className="text-xs text-gray-500 mt-1">Up to 5 clients</p>
            <p className="text-lg font-bold text-gray-900 mt-2">$0</p>
          </div>
          <div onClick={() => set('plan', 'pro')}
            className={`border-2 rounded-xl p-3 cursor-pointer transition-colors ${form.plan === 'pro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Pro</p>
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Popular</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Unlimited + AI + Bots</p>
            <p className="text-lg font-bold text-gray-900 mt-2">$4<span className="text-xs font-normal text-gray-500">/mo</span></p>
          </div>
        </div>
        {form.plan === 'pro' && (
          <button className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            Upgrade to Pro — $4/month
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">All API keys are stored locally on your device only. They are never sent to ClientIQ servers.</p>
      </div>

      <button onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        <Save size={16} />
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
