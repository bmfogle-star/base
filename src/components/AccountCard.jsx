import { useState } from 'react';
import { User, LogOut, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasBackend } from '../lib/api';
import Emoji from './Emoji';

// Shown in Settings. Lets the user create / log into a Spark account when a
// backend is configured. With an account, AI works with no personal API key.
export default function AccountCard({ onManageOrg }) {
  const { account, loading, login, register, logout } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!hasBackend()) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={15} className="text-gray-500 dark:text-neutral-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Spark Account</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-neutral-400">
          Accounts let you use Spark's AI without your own API key. Add your Spark
          backend URL below to enable sign-in. (Until then, Spark uses the keys you enter.)
        </p>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (mode === 'register') await register(email, password);
      else await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <User size={15} className="text-gray-500 dark:text-neutral-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Spark Account</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-400"><Loader size={15} className="animate-spin" /> Checking…</div>
      ) : account ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-800 dark:text-neutral-100">{account.email}</span>
          </div>
          <div className="bg-green-50 dark:bg-green-950/40 rounded-lg p-3 mb-3">
            <p className="text-xs text-green-800 dark:text-green-300">
              Plan: <span className="font-semibold capitalize">{account.plan}</span>
            </p>
            {account.usage && account.limits && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
                AI calls this month: {account.usage.aiCalls} / {account.limits.aiCallsPerMonth}
              </p>
            )}
            <p className="text-xs text-green-600 dark:text-green-400 mt-1"><Emoji e="✅" size="0.85em" className="mr-1" />AI works without your own key</p>
          </div>
          {account.org_id && onManageOrg && (
            <button onClick={onManageOrg} className="w-full mb-3 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800">
              Manage Team & Admin →
            </button>
          )}
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-neutral-300 hover:text-gray-900">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-green-800 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300'}`}>
              Log in
            </button>
            <button type="button" onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'register' ? 'bg-green-800 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300'}`}>
              Sign up
            </button>
          </div>
          <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-600" />
          <input type="password" required placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-600" />
          {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full bg-green-800 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-900 disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>
      )}
    </div>
  );
}
