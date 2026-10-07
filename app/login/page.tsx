'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.session) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Credenziali non valide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1A1A1E] text-white mb-4">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-[#1A1A1E]">ARKITECNA MAILER</h2>
        <p className="mt-1 text-xs text-[#666666]">Accesso riservato amministrazione interna</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFFFFF] py-8 px-6 border border-[#D8D2C8] rounded-lg sm:px-10 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-medium text-[#1A1A1E]">Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="email"
                  required
                  placeholder="admin@arkitecna.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#1A1A1E]">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D8D2C8] rounded text-sm text-[#1A1A1E] bg-white focus:outline-none focus:ring-1 focus:ring-[#1A1A1E]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded text-sm font-medium text-white bg-[#1A1A1E] hover:bg-[#333333] transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accedi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
