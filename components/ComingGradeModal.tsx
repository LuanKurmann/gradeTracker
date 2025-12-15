import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Calendar } from 'lucide-react';
import { TEXTS } from '../constants';

interface ComingGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, date: string) => void;
  lang: 'de' | 'en' | 'fr';
}

const ComingGradeModal: React.FC<ComingGradeModalProps> = ({ isOpen, onClose, onSave, lang }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && date) {
      onSave(name, date);
      setName('');
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
    }
  };

  const t = TEXTS[lang];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.addUpcoming}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.description}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              autoFocus
              className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.date}</label>
            <div className="relative">
                <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                />
                <Calendar className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
            >
              <Save size={18} />
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ComingGradeModal;