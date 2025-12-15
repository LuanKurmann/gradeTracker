import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { TEXTS } from '../constants';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'de' | 'en' | 'fr';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, lang }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = TEXTS[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Auto close usually fine, or show message to check email
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.auth.loginTitle}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 p-3 rounded-lg text-sm mb-6 flex gap-3">
             <div className="mt-0.5"><Lock size={16} /></div>
             <div>{t.auth.loginDesc}</div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.auth.email}</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="name@example.com"
                />
                <Mail className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.auth.password}</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-70"
            >
              {loading ? (
                <span>...</span>
              ) : isLogin ? (
                <><LogIn size={18} /> {t.auth.login}</>
              ) : (
                <><UserPlus size={18} /> {t.auth.signup}</>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isLogin ? t.auth.switchSignUp : t.auth.switchLogin}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;