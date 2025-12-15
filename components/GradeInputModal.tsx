import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import { TEXTS } from '../constants';

interface GradeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: number, name: string, date: string) => void;
  initialData?: { name: string; date: string } | null;
  lang: 'de' | 'en' | 'fr';
}

const GradeInputModal: React.FC<GradeInputModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  lang 
}) => {
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setDate(initialData.date);
      } else {
        setName('');
        setDate(new Date().toISOString().split('T')[0]);
      }
      setValue('');
      setError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Normalize input: replace comma with dot
    const normalizedValue = value.replace(',', '.');
    const numValue = parseFloat(normalizedValue);

    if (isNaN(numValue)) {
      if (lang === 'de') setError("Bitte geben Sie eine gültige Zahl ein.");
      else if (lang === 'fr') setError("Veuillez entrer un nombre valide.");
      else setError("Please enter a valid number.");
      return;
    }

    if (numValue < 1 || numValue > 6) {
      if (lang === 'de') setError("Die Note muss zwischen 1 und 6 liegen.");
      else if (lang === 'fr') setError("La note doit être comprise entre 1 et 6.");
      else setError("Grade must be between 1 and 6.");
      return;
    }

    onSave(numValue, name || 'Test', date);
  };

  const t = TEXTS[lang];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.addGrade}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.grades}</label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              placeholder={t.gradePlaceholder}
              autoFocus
              className={`w-full px-4 py-3 text-lg font-medium border rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none transition-all placeholder-gray-400 ${error ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary focus:border-transparent'}`}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.description}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.date}</label>
            <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                />
                <Calendar className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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

export default GradeInputModal;