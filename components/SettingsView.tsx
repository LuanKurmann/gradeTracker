
import React, { useState, useRef } from 'react';
import { SchoolConfig, Settings, ExtractedGrade } from '../types';
import { TEXTS, ACCENT_COLORS } from '../constants';
import { Moon, Sun, Calendar, Cloud, CheckCheck, Copy, Check, Download, Trash2, AlertTriangle, Sparkles, Upload } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { analyzeGradeImage } from '../utils/ai';
import ImportConfirmationModal from './ImportConfirmationModal';

interface SettingsViewProps {
  config: SchoolConfig;
  onUpdateSettings: (settings: Settings) => void;
  session: Session | null;
  onLogin: () => void;
  onLogout: () => void;
  calendarUrl: string | null;
  onEnableCalendar: () => void;
  onDownload: () => void;
  onResetData: () => void;
  onImportConfig: (config: SchoolConfig) => void;
  onAddGrades: (grades: ExtractedGrade[]) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateSettings,
  session,
  onLogin,
  onLogout,
  calendarUrl,
  onEnableCalendar,
  onDownload,
  onResetData,
  onImportConfig,
  onAddGrades
}) => {
  const lang = config.settings.language;
  const t = TEXTS[lang];
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Staging area for AI extracted grades
  const [extractedGrades, setExtractedGrades] = useState<ExtractedGrade[] | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLanguageChange = (l: 'de' | 'en' | 'fr') => {
    onUpdateSettings({ ...config.settings, language: l });
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    onUpdateSettings({ ...config.settings, theme });
  };

  const handleActiveSemesterChange = (id: number) => {
    onUpdateSettings({ ...config.settings, activeSemesterId: id });
  };

  const handleAccentColorChange = (hex: string) => {
    onUpdateSettings({ ...config.settings, accentColor: hex });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setImportStatus('idle');

    try {
      // Analyze image against current config to extract specific grades
      const grades = await analyzeGradeImage(file, config);
      setExtractedGrades(grades);
      // We don't set 'success' immediately, we wait for user confirmation in modal
    } catch (error) {
      console.error(error);
      setImportStatus('error');
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = (selectedGrades: ExtractedGrade[]) => {
      onAddGrades(selectedGrades);
      setExtractedGrades(null);
      setImportStatus('success');
      setTimeout(() => setImportStatus('idle'), 3000);
  };

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white px-1">{t.settings}</h2>

      {/* AI Import Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-3xl p-6 shadow-sm border border-indigo-100 dark:border-indigo-900/30">
        <h3 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Sparkles size={16} /> {t.settingsView.importTitle}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{t.settingsView.importDesc}</p>
        
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
        />

        <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="w-full py-4 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-wait"
        >
            {isAnalyzing ? (
                <span className="animate-pulse">{t.settingsView.analyzing}</span>
            ) : (
                <><Upload size={20} /> {t.settingsView.uploadBtn}</>
            )}
        </button>

        {importStatus === 'success' && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-sm font-bold flex items-center gap-2 animate-fade-in">
                <CheckCheck size={18} /> {t.settingsView.importSuccess}
            </div>
        )}
        
        {importStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm font-bold flex items-center gap-2 animate-fade-in">
                <AlertTriangle size={18} /> {t.settingsView.importError}
            </div>
        )}
      </div>

      {/* Import Confirmation Modal */}
      {extractedGrades && (
          <ImportConfirmationModal 
             isOpen={!!extractedGrades}
             onClose={() => setExtractedGrades(null)}
             grades={extractedGrades}
             config={config}
             onConfirm={handleConfirmImport}
             lang={lang}
          />
      )}

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">{t.settingsView.appearance}</h3>
        
        {/* Language */}
        <div className="mb-8">
            <label className="block text-gray-900 dark:text-white font-bold mb-2">{t.language}</label>
            <p className="text-sm text-gray-500 mb-4">{t.settingsView.langDesc}</p>
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
               {['de', 'en', 'fr'].map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLanguageChange(l as any)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${config.settings.language === l ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {l.toUpperCase()}
                  </button>
               ))}
            </div>
        </div>

        {/* Theme */}
        <div className="mb-8">
            <label className="block text-gray-900 dark:text-white font-bold mb-2">{t.settingsView.appearance}</label>
            <p className="text-sm text-gray-500 mb-4">{t.settingsView.themeDesc}</p>
            <div className="flex gap-4">
               <button
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${config.settings.theme === 'light' ? 'border-primary bg-blue-50 dark:bg-gray-700 text-primary' : 'border-gray-200 dark:border-gray-600 text-gray-500'}`}
               >
                  <Sun size={24} />
                  <span className="font-bold text-sm">Light</span>
               </button>
               <button
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${config.settings.theme === 'dark' ? 'border-primary bg-gray-700 text-primary' : 'border-gray-200 dark:border-gray-600 text-gray-500'}`}
               >
                  <Moon size={24} />
                  <span className="font-bold text-sm">Dark</span>
               </button>
            </div>
        </div>

        {/* Accent Color */}
        <div>
            <label className="block text-gray-900 dark:text-white font-bold mb-2">{t.settingsView.accentColor}</label>
            <p className="text-sm text-gray-500 mb-4">{t.settingsView.accentColorDesc}</p>
            <div className="flex flex-wrap gap-3">
               {ACCENT_COLORS.map(color => (
                  <button
                     key={color.hex}
                     onClick={() => handleAccentColorChange(color.hex)}
                     className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 border-2 border-white dark:border-gray-800 shadow-sm"
                     style={{ backgroundColor: color.hex }}
                     title={color.name}
                  >
                     {config.settings.accentColor === color.hex && <Check size={20} className="text-white drop-shadow-md" />}
                     {!config.settings.accentColor && color.hex === '#3b82f6' && <Check size={20} className="text-white drop-shadow-md" />} 
                  </button>
               ))}
            </div>
        </div>
      </div>

      {/* Default Semester */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">{t.settingsView.general}</h3>
        <div>
            <label className="block text-gray-900 dark:text-white font-bold mb-2">{t.settingsView.defaultSemester}</label>
            <p className="text-sm text-gray-500 mb-4">{t.settingsView.defaultSemesterDesc}</p>
            <div className="grid grid-cols-2 gap-2">
                {config.semesters.map(sem => (
                   <button
                     key={sem.id}
                     onClick={() => handleActiveSemesterChange(sem.id)}
                     className={`py-3 px-4 rounded-xl text-sm font-bold text-left transition-all border ${
                        config.settings.activeSemesterId === sem.id 
                           ? 'border-primary bg-primary text-white shadow-lg shadow-blue-500/20' 
                           : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                     }`}
                   >
                      {sem.name}
                   </button>
                ))}
            </div>
        </div>
      </div>

      {/* Account & Sync */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">{t.settingsView.account}</h3>
         
         <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl mb-6">
            <div className="flex items-center gap-4">
               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${session ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Cloud size={24} />
               </div>
               <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white">
                     {session ? 'Cloud Sync Aktiv' : 'Offline Modus'}
                  </div>
                  <div className="text-xs text-gray-500">
                     {session ? session.user.email : 'Melde dich an, um Daten zu sichern'}
                  </div>
               </div>
               <button
                  onClick={session ? onLogout : onLogin}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                     session 
                        ? 'bg-red-50 text-red-500 hover:bg-red-100' 
                        : 'bg-primary text-white hover:bg-blue-600'
                  }`}
               >
                  {session ? t.auth.logout : t.auth.login}
               </button>
            </div>
         </div>

         {/* Calendar */}
         <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
            <label className="block text-gray-900 dark:text-white font-bold mb-2 flex items-center gap-2">
               <Calendar size={18} className="text-primary"/> {t.calendar.title}
            </label>
            <p className="text-sm text-gray-500 mb-4">{t.calendar.desc}</p>
            
            {calendarUrl ? (
               <div className="flex gap-2">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-600 font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                     {calendarUrl.replace('https://', 'webcal://')}
                  </div>
                  <button
                     onClick={() => {
                        navigator.clipboard.writeText(calendarUrl.replace('https://', 'webcal://'));
                        setCopyFeedback(true);
                        setTimeout(() => setCopyFeedback(false), 2000);
                     }}
                     className="px-4 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                     {copyFeedback ? <CheckCheck size={20} /> : <Copy size={20} />}
                  </button>
               </div>
            ) : (
               <button
                  onClick={onEnableCalendar}
                  disabled={!session}
                  className="w-full py-3 bg-white dark:bg-gray-700 border-2 border-primary text-primary dark:text-blue-400 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {session ? t.calendar.enable : t.calendar.info}
               </button>
            )}
         </div>
      </div>

       {/* Data & Export */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">{t.settingsView.data}</h3>
         <div className="space-y-4">
            <div>
                <label className="block text-gray-900 dark:text-white font-bold mb-2">{t.downloadConfig}</label>
                <p className="text-sm text-gray-500 mb-4">{t.settingsView.exportDesc}</p>
                <button
                onClick={onDownload}
                className="w-full py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                <Download size={20} /> {t.settingsView.exportBtn}
                </button>
            </div>
            
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-red-600 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle size={18} /> {t.settingsView.resetTitle}
                </label>
                <p className="text-sm text-gray-500 mb-4">{t.settingsView.resetDesc}</p>
                <button
                onClick={onResetData}
                className="w-full py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                >
                <Trash2 size={20} /> {t.settingsView.resetBtn}
                </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SettingsView;
