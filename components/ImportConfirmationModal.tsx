
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertCircle } from 'lucide-react';
import { ExtractedGrade, SchoolConfig } from '../types';
import { TEXTS } from '../constants';

interface ImportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  grades: ExtractedGrade[];
  config: SchoolConfig;
  onConfirm: (selectedGrades: ExtractedGrade[]) => void;
  lang: 'de' | 'en' | 'fr';
}

const ImportConfirmationModal: React.FC<ImportConfirmationModalProps> = ({
  isOpen,
  onClose,
  grades,
  config,
  onConfirm,
  lang
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(grades.map(g => g.id)));
    }
  }, [isOpen, grades]);

  if (!isOpen) return null;

  const t = TEXTS[lang];

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    const selected = grades.filter(g => selectedIds.has(g.id));
    onConfirm(selected);
    onClose();
  };

  const getSubjectName = (subjectId: string, subCatName?: string) => {
    const subj = config.subjects.find(s => s.id === subjectId);
    if (!subj) return 'Unknown Subject';
    if (subCatName) return `${subj.name} (${subCatName})`;
    return subj.name;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.importModal.title}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t.importModal.desc}
          </p>

          {grades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <AlertCircle size={32} className="mb-2" />
              <p>{t.importModal.noGrades}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider px-3 pb-1">
                <div className="col-span-1"></div>
                <div className="col-span-5">{t.importModal.subject}</div>
                <div className="col-span-3 text-right">{t.importModal.grade}</div>
                <div className="col-span-3 text-right">{t.importModal.date}</div>
              </div>
              
              {grades.map(g => (
                <div 
                  key={g.id} 
                  className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedIds.has(g.id) 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50' 
                      : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 opacity-60'
                  }`}
                  onClick={() => handleToggle(g.id)}
                >
                  <div className="col-span-1 flex justify-center">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.has(g.id) ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-500'}`}>
                      {selectedIds.has(g.id) && <Check size={14} />}
                    </div>
                  </div>
                  <div className="col-span-5 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {getSubjectName(g.subjectId, g.subCategoryName)}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{g.name}</div>
                  </div>
                  <div className="col-span-3 text-right font-black text-lg text-gray-900 dark:text-white">
                    {g.value}
                  </div>
                  <div className="col-span-3 text-right text-xs text-gray-500 dark:text-gray-400">
                    {new Date(g.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none"
          >
            {t.importModal.confirm} ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ImportConfirmationModal;
