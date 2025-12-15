
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, Upload, Moon, Sun, AlertCircle, CheckCircle2, FileText, Calendar, Clock, LayoutTemplate, PlusCircle, PenTool, BarChart2, List, LogOut, Cloud, CloudOff, User, Share2, Copy, Trash2, CheckCheck, GraduationCap, Settings } from 'lucide-react';
import { SchoolConfig, Grade, ComingGrade, Settings as AppSettings, ExtractedGrade } from './types';
import { TEMPLATES, TEXTS, ACCENT_COLORS } from './constants';
import { calculateSemesterStats, calculateOverallStats } from './utils/calculation';
import { generateICS } from './utils/ical';
import SubjectCard from './components/SubjectCard';
import SubjectDetail from './components/SubjectDetail';
import ConfigBuilder from './components/ConfigBuilder';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import AuthModal from './components/AuthModal';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [config, setConfig] = useState<SchoolConfig | null>(null);
  const [activeSemesterId, setActiveSemesterId] = useState<number>(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'stats' | 'settings'>('overview');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // Auth & Sync State
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  
  // Calendar State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert hex to space-separated RGB for Tailwind
  const applyAccentColor = (hex: string) => {
    // Basic Hex to RGB conversion
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      document.documentElement.style.setProperty('--color-primary', `${r} ${g} ${b}`);
    } else {
       // Fallback to default blue
       document.documentElement.style.setProperty('--color-primary', `59 130 246`);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | undefined) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 1. Initial Load (Local Storage + Auth Check)
  useEffect(() => {
    // Load local config first
    const saved = localStorage.getItem('gradeTrackerConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        applyTheme(parsed.settings?.theme);
        // Load active semester from settings or default to 1
        if (parsed.settings?.activeSemesterId) {
            setActiveSemesterId(parsed.settings.activeSemesterId);
        }
        // Load accent color
        applyAccentColor(parsed.settings?.accentColor || ACCENT_COLORS[0].hex);
      } catch (e) {
        console.error("Failed to load local data", e);
      }
    } else {
       // Apply default color if nothing loaded
       applyAccentColor(ACCENT_COLORS[0].hex);
    }

    // Check Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Config from DB when User Logs In
  useEffect(() => {
    const fetchCloudConfig = async () => {
      if (!session) return;
      
      // Try to get config from DB
      const { data, error } = await supabase
        .from('user_configs')
        .select('config_data')
        .eq('user_id', session.user.id)
        .single();

      if (data && data.config_data) {
        // User has data in cloud, use it
        setConfig(data.config_data);
        applyTheme(data.config_data.settings?.theme);
        localStorage.setItem('gradeTrackerConfig', JSON.stringify(data.config_data));
        
        // Restore active semester preference
        if (data.config_data.settings?.activeSemesterId) {
            setActiveSemesterId(data.config_data.settings.activeSemesterId);
        }

        // Apply accent color
        applyAccentColor(data.config_data.settings?.accentColor || ACCENT_COLORS[0].hex);

        // If calendar exists, construct URL
        if (data.config_data.settings?.calendarFileId) {
            updateCalendarUrl(data.config_data.settings.calendarFileId);
        }
      } else if (!data && config) {
        // User just logged in but has no cloud data, upload current local data
        saveToSupabase(config);
      }
    };

    fetchCloudConfig();
  }, [session]); // Runs when session changes

  // 3. Save to DB and LocalStorage on Config Change
  useEffect(() => {
    if (config) {
      // Local Save
      localStorage.setItem('gradeTrackerConfig', JSON.stringify(config));
      
      // Cloud Save (Debounced)
      if (session) {
        setSyncStatus('syncing');
        const timeout = setTimeout(() => {
          saveToSupabase(config);
        }, 2000); // 2 second debounce

        return () => clearTimeout(timeout);
      }
    }
  }, [config, session]);

  const saveToSupabase = async (currentConfig: SchoolConfig) => {
    if (!session) return;
    try {
      const { error } = await supabase.from('user_configs').upsert({
        id: currentConfig.id, // Use config ID as primary key part
        user_id: session.user.id,
        config_data: currentConfig,
        updated_at: new Date()
      });
      
      if (error) throw error;
      
      // Sync Calendar if enabled
      if (currentConfig.settings.calendarFileId) {
         await uploadICS(currentConfig, currentConfig.settings.calendarFileId);
      }

      setSyncStatus('saved');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (err) {
      console.error("Sync error:", err);
      setSyncStatus('error');
    }
  };

  const uploadICS = async (currentConfig: SchoolConfig, fileId: string) => {
      // Collect all upcoming exams
      const events: { title: string; date: string; subject: string; id: string }[] = [];
      currentConfig.subjects.forEach(sub => {
          sub.commingGrades.forEach(g => events.push({ ...g, title: g.name, subject: sub.name }));
          sub.subCategories.forEach(cat => {
              cat.commingGrades.forEach(g => events.push({ ...g, title: g.name, subject: `${sub.name} (${cat.name})` }));
          });
      });

      const icsString = generateICS(events, currentConfig.name);
      const blob = new Blob([icsString], { type: 'text/calendar' });

      await supabase.storage
        .from('calendars')
        .upload(`${fileId}.ics`, blob, {
            contentType: 'text/calendar',
            upsert: true
        });
  };

  const updateCalendarUrl = (fileId: string) => {
      const { data } = supabase.storage.from('calendars').getPublicUrl(`${fileId}.ics`);
      setCalendarUrl(data.publicUrl);
  };

  const handleEnableCalendar = async () => {
     if (!config || !session) return;
     
     // Generate new ID if not exists
     const fileId = config.settings.calendarFileId || crypto.randomUUID();
     
     // Update config
     const newConfig = {
         ...config,
         settings: { ...config.settings, calendarFileId: fileId }
     };
     setConfig(newConfig);
     updateCalendarUrl(fileId);
     
     // Initial upload
     await uploadICS(newConfig, fileId);
     // Trigger save to persist ID in DB
     saveToSupabase(newConfig);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text) as SchoolConfig;
        
        if (!json.id) json.id = crypto.randomUUID();
        if (!json.subjects) throw new Error("Invalid format");
        
        setConfig(json);
        applyTheme(json.settings?.theme || 'light');
        applyAccentColor(json.settings?.accentColor || ACCENT_COLORS[0].hex);
        setActiveSemesterId(json.settings?.activeSemesterId || json.semesters[0]?.id || 1);
        setSelectedSubjectId(null);
      } catch (err) {
        console.error("Fehler beim Laden der Datei", err);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadTemplate = (template: SchoolConfig) => {
    const newConfig: SchoolConfig = JSON.parse(JSON.stringify(template));
    newConfig.id = crypto.randomUUID();
    
    setConfig(newConfig);
    applyTheme(newConfig.settings?.theme || 'light');
    applyAccentColor(newConfig.settings?.accentColor || ACCENT_COLORS[0].hex);
    setActiveSemesterId(newConfig.semesters[0]?.id || 1);
  };

  const handleImportConfig = (newConfig: SchoolConfig) => {
    setConfig(newConfig);
    applyTheme(newConfig.settings?.theme || 'light');
    applyAccentColor(newConfig.settings?.accentColor || ACCENT_COLORS[0].hex);
    setActiveSemesterId(newConfig.settings?.activeSemesterId || 1);
    setViewMode('overview');
  };

  // Bulk add grades from AI import
  const handleBulkAddGrades = (grades: ExtractedGrade[]) => {
      setConfig(prev => {
          if (!prev) return null;
          
          let updatedSubjects = [...prev.subjects];
          
          grades.forEach(g => {
              const subIndex = updatedSubjects.findIndex(s => s.id === g.subjectId);
              if (subIndex === -1) return; // Subject not found

              const subject = updatedSubjects[subIndex];
              const newGrade: Grade = {
                  id: crypto.randomUUID(),
                  name: g.name || 'Test',
                  date: g.date,
                  value: g.value,
                  semesterId: g.semesterId
              };

              // Check if we need to add to a subcategory
              let addedToSub = false;
              if (g.subCategoryName) {
                  const subCatIndex = subject.subCategories.findIndex(sc => sc.name === g.subCategoryName);
                  if (subCatIndex !== -1) {
                      const newSubCategories = [...subject.subCategories];
                      newSubCategories[subCatIndex] = {
                          ...newSubCategories[subCatIndex],
                          grades: [...newSubCategories[subCatIndex].grades, newGrade]
                      };
                      updatedSubjects[subIndex] = { ...subject, subCategories: newSubCategories };
                      addedToSub = true;
                  }
              }

              // Default: Add to main subject if not added to subcategory
              if (!addedToSub) {
                  updatedSubjects[subIndex] = {
                      ...subject,
                      grades: [...subject.grades, newGrade]
                  };
              }
          });

          return { ...prev, subjects: updatedSubjects };
      });
  };

  const handleDownload = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradetracker-${config.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLeaveClick = () => {
    if (session) {
      // If logged in, button acts as Logout (keeps data on device until overwritten)
      supabase.auth.signOut();
      setConfig(null); // Clear view
      setActiveSemesterId(1);
    } else {
      // If guest, acts as Exit
      setIsExitModalOpen(true);
    }
  };

  const confirmLeave = () => {
    localStorage.removeItem('gradeTrackerConfig');
    setConfig(null);
    setSelectedSubjectId(null);
    setActiveSemesterId(1);
    setIsExitModalOpen(false);
  };
  
  const handleResetData = async () => {
     // 1. Delete from Cloud if logged in
     if (session) {
         try {
             const { error } = await supabase
                .from('user_configs')
                .delete()
                .eq('user_id', session.user.id);
             
             if (error) {
                 console.error("Failed to delete cloud data", error);
                 alert("Fehler beim Löschen der Cloud-Daten. Bitte versuche es später.");
                 return;
             }
         } catch (err) {
             console.error("Error deleting data", err);
         }
     }
     
     // 2. Clear Local Storage
     localStorage.removeItem('gradeTrackerConfig');
     
     // 3. Reset State
     setConfig(null);
     setSelectedSubjectId(null);
     setActiveSemesterId(1);
     setViewMode('overview');
     setIsResetModalOpen(false);
  };

  const toggleTheme = () => {
    setConfig(prev => {
      if (!prev) return null;
      const newTheme: 'light' | 'dark' = prev.settings.theme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      return { ...prev, settings: { ...prev.settings, theme: newTheme } };
    });
  };
  
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setConfig(prev => {
        if (!prev) return null;
        applyTheme(newSettings.theme);
        applyAccentColor(newSettings.accentColor || ACCENT_COLORS[0].hex);
        // If active semester changed, update local state
        if (newSettings.activeSemesterId && newSettings.activeSemesterId !== activeSemesterId) {
            setActiveSemesterId(newSettings.activeSemesterId);
        }
        return { ...prev, settings: newSettings };
    });
  };

  // --- Handlers using Functional Updates for Safety ---

  const handleAddGrade = (subjectId: string, grade: Grade, subCategoryIndex?: number) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subjects: prev.subjects.map(s => {
          if (s.id !== subjectId) return s;
          
          if (subCategoryIndex !== undefined) {
             const newSubCats = [...s.subCategories];
             if (newSubCats[subCategoryIndex]) {
                 newSubCats[subCategoryIndex] = {
                     ...newSubCats[subCategoryIndex],
                     grades: [...newSubCats[subCategoryIndex].grades, grade]
                 };
             }
             return { ...s, subCategories: newSubCats };
          }
          
          return { ...s, grades: [...s.grades, grade] };
        })
      };
    });
  };

  const handleDeleteGrade = (subjectId: string, gradeId: string, subCategoryIndex?: number) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subjects: prev.subjects.map(s => {
          if (s.id !== subjectId) return s;

          if (subCategoryIndex !== undefined) {
             const newSubCats = [...s.subCategories];
             if (newSubCats[subCategoryIndex]) {
                 newSubCats[subCategoryIndex] = {
                     ...newSubCats[subCategoryIndex],
                     grades: newSubCats[subCategoryIndex].grades.filter(g => g.id !== gradeId)
                 };
             }
             return { ...s, subCategories: newSubCats };
          }

          return { ...s, grades: s.grades.filter(g => g.id !== gradeId) };
        })
      };
    });
  };

  const onAddComing = (subjectId: string, item: ComingGrade, subCategoryIndex?: number) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subjects: prev.subjects.map(s => {
          if (s.id !== subjectId) return s;
          
          if (subCategoryIndex !== undefined) {
             const newSubCats = [...s.subCategories];
             if (newSubCats[subCategoryIndex]) {
                 newSubCats[subCategoryIndex] = {
                     ...newSubCats[subCategoryIndex],
                     commingGrades: [...(newSubCats[subCategoryIndex].commingGrades || []), item]
                 };
             }
             return { ...s, subCategories: newSubCats };
          }

          return { ...s, commingGrades: [...(s.commingGrades || []), item] };
        })
      };
    });
  };

  const onDeleteComing = (subjectId: string, itemId: string, subCategoryIndex?: number) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subjects: prev.subjects.map(s => {
          if (s.id !== subjectId) return s;
          
          if (subCategoryIndex !== undefined) {
             const newSubCats = [...s.subCategories];
             if (newSubCats[subCategoryIndex]) {
                 newSubCats[subCategoryIndex] = {
                     ...newSubCats[subCategoryIndex],
                     commingGrades: (newSubCats[subCategoryIndex].commingGrades || []).filter(c => c.id !== itemId)
                 };
             }
             return { ...s, subCategories: newSubCats };
          }

          return { ...s, commingGrades: (s.commingGrades || []).filter(c => c.id !== itemId) };
        })
      };
    });
  };

  const handleUpdateFinalExam = (subjectId: string, grade: number | undefined) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        subjects: prev.subjects.map(s => {
          if (s.id !== subjectId) return s;
          return {
             ...s,
             finalExamGrades: {
                 ...s.finalExamGrades,
                 [activeSemesterId]: grade !== undefined ? grade : 0 // Should be handled better in type but ok for now
             }
          };
        })
      };
    });
  };

  // --- UI Renders ---

  if (showBuilder) {
    return (
      <ConfigBuilder 
        onCancel={() => setShowBuilder(false)}
        onComplete={(newConfig) => {
          setConfig(newConfig);
          applyTheme('light');
          setActiveSemesterId(1);
          setShowBuilder(false);
        }}
      />
    );
  }

  if (!config) {
    const t = TEXTS['de']; // Default to DE for initial view
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in transition-colors duration-200">
        <div className="w-full max-w-4xl text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
            {t.appTitle}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-12 max-w-lg mx-auto leading-relaxed">
            {t.noData}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {/* Custom Builder */}
             <div 
                onClick={() => setShowBuilder(true)}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all group flex flex-col items-center justify-center gap-4 min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PenTool size={24} />
                </div>
                <div className="text-center">
                   <h3 className="font-bold text-gray-900 dark:text-white">Eigene Konfiguration</h3>
                   <p className="text-xs text-gray-400 mt-1">Schule manuell erstellen</p>
                </div>
             </div>

             {/* Templates */}
             {TEMPLATES.map(temp => (
                <div 
                  key={temp.id}
                  onClick={() => handleLoadTemplate(temp)}
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary/50 cursor-pointer hover:shadow-lg transition-all group text-left flex flex-col justify-between min-h-[160px]"
                >
                   <div>
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 mb-4 flex items-center justify-center">
                        <LayoutTemplate size={20} />
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-1">{temp.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{temp.semesters.length} Semester • {temp.subjects.length} Fächer</p>
                   </div>
                   <div className="text-primary text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Wählen <CheckCircle2 size={14} />
                   </div>
                </div>
             ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.or}</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <Upload size={18} />
              {t.uploadConfig}
            </button>
            
            {/* Login Button for guest users */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-sm text-primary hover:underline flex items-center gap-1 font-medium mt-4"
            >
              <Cloud size={14} /> Bereits ein Konto? Anmelden
            </button>
          </div>
        </div>
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          lang="de"
        />
      </div>
    );
  }

  const lang = config.settings.language;
  const t = TEXTS[lang];
  const activeSemester = config.semesters.find(s => s.id === activeSemesterId);
  const selectedSubject = selectedSubjectId ? config.subjects.find(s => s.id === selectedSubjectId) : null;
  const stats = calculateSemesterStats(config, activeSemesterId);
  const overallStats = calculateOverallStats(config);

  // Filter comming grades for dashboard
  const upcomingExams = config.subjects.flatMap(sub => {
    const subItems = sub.commingGrades?.filter(c => c.semesterId === activeSemesterId).map(c => ({ ...c, subjectName: sub.name, subjectId: sub.id })) || [];
    const catItems = sub.subCategories.flatMap(cat => 
        cat.commingGrades?.filter(c => c.semesterId === activeSemesterId).map(c => ({ ...c, subjectName: `${sub.name} (${cat.name})`, subjectId: sub.id })) || []
    );
    return [...subItems, ...catItems];
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getDaysLeft = (date: string) => {
      const diff = new Date(date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pb-safe">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 pb-3 pt-safe-header sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="bg-primary text-white p-2 rounded-xl flex-shrink-0">
               <span className="font-black text-sm">GT</span>
             </div>
             <h1 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                {config.name}
             </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* View Toggle */}
            <div className="hidden sm:flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('overview')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'overview' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                   <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('stats')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'stats' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                   <BarChart2 size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('settings')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'settings' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                   <Settings size={18} />
                </button>
            </div>

            {/* Sync Indicator / Auth */}
            <button 
               onClick={() => !session && setShowAuthModal(true)}
               className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                 session 
                   ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                   : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
               }`}
            >
               {syncStatus === 'syncing' ? (
                 <Cloud className="animate-pulse" size={16} />
               ) : session ? (
                 <Cloud size={16} />
               ) : (
                 <CloudOff size={16} />
               )}
               <span className="hidden sm:inline">{session ? (syncStatus === 'syncing' ? t.auth.syncing : t.auth.synced) : t.auth.login}</span>
            </button>
            
            <button 
              onClick={handleLeaveClick}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title={session ? t.auth.logout : t.exit}
            >
               <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 pb-28 sm:py-8">
        
        {/* Semester Tabs - Show only in overview mode */}
        {!selectedSubjectId && viewMode === 'overview' && (
           <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
             {config.semesters.map(sem => (
               <button
                 key={sem.id}
                 onClick={() => {
                     setActiveSemesterId(sem.id);
                 }}
                 className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                   activeSemesterId === sem.id
                     ? 'bg-primary text-white shadow-lg shadow-blue-500/30'
                     : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                 }`}
               >
                 {sem.name}
               </button>
             ))}
           </div>
        )}

        {viewMode === 'settings' ? (
            <SettingsView 
               config={config} 
               onUpdateSettings={handleUpdateSettings}
               session={session}
               onLogin={() => setShowAuthModal(true)}
               onLogout={() => { supabase.auth.signOut(); }}
               calendarUrl={calendarUrl}
               onEnableCalendar={handleEnableCalendar}
               onDownload={handleDownload}
               onResetData={() => setIsResetModalOpen(true)}
               onImportConfig={handleImportConfig}
               onAddGrades={handleBulkAddGrades}
            />
        ) : viewMode === 'stats' ? (
           <StatsView config={config} activeSemesterId={activeSemesterId} lang={lang} />
        ) : selectedSubject ? (
          <SubjectDetail 
            subject={selectedSubject} 
            semesterId={activeSemesterId} 
            lang={lang}
            onBack={() => setSelectedSubjectId(null)}
            onAddGrade={handleAddGrade}
            onDeleteGrade={handleDeleteGrade}
            onAddComing={onAddComing}
            onDeleteComing={onDeleteComing}
            onUpdateFinalExam={handleUpdateFinalExam}
          />
        ) : (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Semester Stats */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border-l-4 border-primary flex flex-col justify-between relative overflow-hidden">
                 <div className="flex justify-between items-start z-10">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{activeSemester?.name.toUpperCase()}</span>
                        <div className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mt-1">
                          {stats.average.toFixed(2)}
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${stats.passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {stats.passed ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
                        {stats.passed ? t.passed : t.failed}
                    </div>
                 </div>
                 
                 {/* Failure Reasons */}
                 {!stats.passed && stats.failureReasons.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 z-10">
                        {stats.failureReasons.map(r => (
                           <div key={r} className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1">
                              <span className="w-1 h-1 rounded-full bg-red-500"></span>
                              {t.failureReasons[r as keyof typeof t.failureReasons]
                                 .replace('{val}', 
                                    r === 'minAverage' ? config.passingCriteria.minAverageGrade.toString() : 
                                    r === 'maxInsufficient' ? config.passingCriteria.maxInsufficientGrades.toString() :
                                    config.passingCriteria.maxBelowFour.toString()
                                 )
                              }
                           </div>
                        ))}
                    </div>
                 )}
                 
                 {/* Decorative background number */}
                 <div className="absolute -right-4 -bottom-8 text-9xl font-black text-gray-50 dark:text-gray-700/20 select-none z-0">
                    {activeSemesterId}
                 </div>
              </div>

              {/* Overall Stats */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border-l-4 border-indigo-500 flex flex-col justify-between items-start relative overflow-hidden">
                 <div className="flex justify-between items-start w-full z-10">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.totalStats.toUpperCase()}</span>
                        <div className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mt-1">
                          {overallStats.average.toFixed(2)}
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${overallStats.passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                         {overallStats.passed ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
                         {overallStats.passed ? t.passed : t.failed}
                    </div>
                 </div>
                 <div className="absolute -right-4 -bottom-6 text-8xl font-black text-indigo-50 dark:text-indigo-900/10 select-none z-0">
                    <BarChart2 size={80} strokeWidth={1.5} />
                 </div>
              </div>
            </div>

            {/* Upcoming Exams Widget */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-800 p-5 rounded-3xl border border-amber-100 dark:border-gray-700 relative">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <Clock className="text-amber-500" size={20} /> {t.upcoming}
                  </h3>
                  {session && (
                      <button 
                        onClick={() => setShowCalendarModal(true)}
                        className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 hover:text-primary rounded-lg shadow-sm text-xs font-bold transition-colors"
                        title={t.calendar.title}
                      >
                         <Calendar size={16} />
                      </button>
                  )}
               </div>
               
               {upcomingExams.length > 0 ? (
                  <div className="space-y-3">
                     {upcomingExams.slice(0, 3).map(ex => {
                         const days = getDaysLeft(ex.date);
                         return (
                             <div 
                                key={ex.id} 
                                onClick={() => setSelectedSubjectId(ex.subjectId)}
                                className="bg-white dark:bg-gray-700/50 p-3 rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:scale-[1.02] transition-transform hover:shadow-md"
                             >
                                 <div>
                                     <div className="font-bold text-sm text-gray-900 dark:text-white">{ex.name}</div>
                                     <div className="text-xs text-gray-500 dark:text-gray-400">{ex.subjectName}</div>
                                 </div>
                                 <div className="text-right">
                                     <div className={`text-xs font-bold ${days <= 2 ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                         {days === 0 ? t.today : `${days} ${t.daysLeft}`}
                                     </div>
                                     <div className="text-[10px] text-gray-400">
                                         {new Date(ex.date).toLocaleDateString()}
                                     </div>
                                 </div>
                             </div>
                         )
                     })}
                     {upcomingExams.length > 3 && (
                         <div className="text-center text-xs font-bold text-gray-400 mt-2">
                             + {upcomingExams.length - 3} weitere
                         </div>
                     )}
                  </div>
               ) : (
                  <div className="text-center py-6 text-gray-400 text-sm">
                      {t.noUpcoming}
                  </div>
               )}
            </div>

            {/* Subject List */}
            <div className="space-y-3">
              {config.subjects.map((sub) => {
                 if (!sub.semesters.includes(activeSemesterId)) return null;
                 return (
                    <SubjectCard 
                      key={sub.id} 
                      subject={sub} 
                      semesterId={activeSemesterId}
                      onClick={() => setSelectedSubjectId(sub.id)}
                    />
                 )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Exit Confirmation Modal */}
      {isExitModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertCircle size={32} />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.exit}?</h3>
             <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t.confirmExit}</p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setIsExitModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                   {t.cancel}
                </button>
                <button 
                  onClick={confirmLeave}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                   {t.exit}
                </button>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Data Modal */}
      {isResetModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border-2 border-red-100 dark:border-red-900/30">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 size={32} />
             </div>
             <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.settingsView.resetTitle}</h3>
             <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t.settingsView.confirmReset}</p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                   {t.cancel}
                </button>
                <button 
                  onClick={handleResetData}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                >
                   {t.delete}
                </button>
             </div>
          </div>
        </div>,
        document.body
      )}

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        lang={lang}
      />
      
      {/* Calendar Modal */}
      {showCalendarModal && createPortal(
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <Calendar className="text-primary" /> {t.calendar.title}
                  </h3>
                  <button onClick={() => setShowCalendarModal(false)} className="text-gray-400 hover:text-gray-600">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  {t.calendar.desc}
               </p>

               {calendarUrl ? (
                  <div className="space-y-4">
                     <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-600 font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                        {calendarUrl.replace('https://', 'webcal://')}
                     </div>
                     <button 
                        onClick={() => {
                           navigator.clipboard.writeText(calendarUrl.replace('https://', 'webcal://'));
                           setCopyFeedback(true);
                           setTimeout(() => setCopyFeedback(false), 2000);
                        }}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                     >
                        {copyFeedback ? <CheckCheck size={18} /> : <Copy size={18} />}
                        {copyFeedback ? t.calendar.copied : t.calendar.copy}
                     </button>
                  </div>
               ) : (
                  <button 
                     onClick={handleEnableCalendar}
                     className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                  >
                     {t.calendar.enable}
                  </button>
               )}
               
               <div className="mt-4 text-[10px] text-center text-gray-400 uppercase font-bold tracking-wider">
                  {t.calendar.info}
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* Mobile Bottom Nav (Visible only on overview/stats/settings switch) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 p-2 pb-safe flex justify-around z-20">
         <button 
           onClick={() => setViewMode('overview')}
           className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${viewMode === 'overview' ? 'text-primary' : 'text-gray-400'}`}
         >
            <List size={24} strokeWidth={viewMode === 'overview' ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1">{t.overview}</span>
         </button>
         <button 
           onClick={() => setViewMode('stats')}
           className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${viewMode === 'stats' ? 'text-primary' : 'text-gray-400'}`}
         >
            <BarChart2 size={24} strokeWidth={viewMode === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1">{t.statistics}</span>
         </button>
         <button 
           onClick={() => setViewMode('settings')}
           className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${viewMode === 'settings' ? 'text-primary' : 'text-gray-400'}`}
         >
            <Settings size={24} strokeWidth={viewMode === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1">{t.settings}</span>
         </button>
      </div>
    </div>
  );
};

// Helper icon for Close (X) if not imported from lucide-react in that specific scope
const X = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

export default App;
