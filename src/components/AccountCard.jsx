import { useState } from 'react';
import { User, LogOut, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { hasBackend } from '../lib/api';

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
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <User size={15} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Spark Account</h3>
        </div>
        <p className="text-xs text-gray-500">
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <User size={15} className="text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">Spark Account</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader size={15} className="animate-spin" /> Checking…</div>
      ) : account ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-medium text-gray-800">{account.email}</span>
          </div>
          <div className="bg-green-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-green-800">
              Plan: <span className="font-semibold capitalize">{account.plan}</span>
            </p>
            {account.usage && account.limits && (
              <p className="text-xs text-green-700 mt-0.5">
                AI calls this month: {account.usage.aiCalls} / {account.limits.aiCallsPerMonth}
              </p>
            )}
            <p className="text-xs text-green-600 mt-1">✓ AI works without your own key</p>
          </div>
          {account.org_id && onManageOrg && (
            <button onClick={onManageOrg} className="w-full mb-3 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800">
              Manage Team & Admin →
            </button>
          )}
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'login' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Log in
            </button>
            <button type="button" onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'register' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600'}`}>
              Sign up
            </button>
          </div>
          <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-600" />
          <input type="password" required placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-green-600" />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
            {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>
      )}
    </div>
  );
}
