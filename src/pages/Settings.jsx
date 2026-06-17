import { useState } from 'react';
import { Save, Key, CreditCard, Info, Eye, EyeOff } from 'lucide-react';
import { getUser, saveUser } from '../data/store';

export default function Settings({ onApiKeyChange }) {
  const user = getUser() || {};
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    apiKey: user.apiKey || '',
    plan: user.plan || 'free',
  });
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  function handleSave() {
    const updated = { ...user, ...form };
    saveUser(updated);
    if (onApiKeyChange) onApiKeyChange(form.apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="John Smith"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* AI Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Key size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">AI Call Analysis</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Enter your Claude API key to enable AI extraction of client details from call recordings.
        </p>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Claude API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
              placeholder="sk-ant-..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Your key is stored locally on your device only.</p>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Subscription</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setForm(p => ({ ...p, plan: 'free' }))}
            className={`border-2 rounded-xl p-3 cursor-pointer transition-colors ${form.plan === 'free' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <p className="font-bold text-gray-900 text-sm">Free</p>
            <p className="text-xs text-gray-500 mt-1">Up to 5 clients, basic features</p>
            <p className="text-lg font-bold text-gray-900 mt-2">$0</p>
          </div>
          <div
            onClick={() => setForm(p => ({ ...p, plan: 'pro' }))}
            className={`border-2 rounded-xl p-3 cursor-pointer transition-colors ${form.plan === 'pro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">Pro</p>
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Popular</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Unlimited clients, AI analysis</p>
            <p className="text-lg font-bold text-gray-900 mt-2">$4<span className="text-xs font-normal text-gray-500">/mo</span></p>
          </div>
        </div>
        {form.plan === 'pro' && (
          <button className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            Upgrade to Pro — $4/month
          </button>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex gap-3">
        <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          ClientIQ stores all your data locally on your device. Your client information never leaves your phone or browser unless you choose to sync it.
        </p>
      </div>

      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
          saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        <Save size={16} />
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
