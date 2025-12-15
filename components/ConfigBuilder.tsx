import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Download, GraduationCap, BookOpen, Settings, Layers, X, ChevronDown, ChevronUp } from 'lucide-react';
import { SchoolConfig, Subject, Semester, SubCategory } from '../types';

interface ConfigBuilderProps {
  onCancel: () => void;
  onComplete: (config: SchoolConfig) => void;
}

interface BuilderSubCategory {
  id: string;
  name: string;
  weight: number;
}

interface BuilderSubject {
  id: string;
  name: string;
  hasFinalExam: boolean;
  subCategories: BuilderSubCategory[];
}

const ConfigBuilder: React.FC<ConfigBuilderProps> = ({ onCancel, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [semesterCount, setSemesterCount] = useState(2);
  const [passingCriteria, setPassingCriteria] = useState({
    minAverageGrade: 4,
    maxInsufficientGrades: 2,
    maxBelowFour: 2
  });
  
  // Subject State
  const [subjects, setSubjects] = useState<BuilderSubject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  // Editing State
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubWeight, setNewSubWeight] = useState<string>('50');

  // Generate the config object
  const generateConfig = (): SchoolConfig => {
    const semesters: Semester[] = Array.from({ length: semesterCount }, (_, i) => ({
      id: i + 1,
      name: `${i + 1}. Semester`
    }));

    const semesterIds = semesters.map(s => s.id);

    const formattedSubjects: Subject[] = subjects.map(s => {
      // Convert builder subcategories to actual SubCategory objects
      const subCategories: SubCategory[] = s.subCategories.map(sub => ({
        name: sub.name,
        weight: sub.weight,
        rounding: "0.5",
        semesters: semesterIds,
        grades: [],
        commingGrades: []
      }));

      return {
        id: crypto.randomUUID(),
        name: s.name || 'Fach',
        weight: 1,
        rounding: "0.5",
        hasFinalExam: s.hasFinalExam || false,
        finalExamWeight: s.hasFinalExam ? 50 : undefined,
        finalExamRounding: "0.5",
        semesters: semesterIds,
        grades: [],
        commingGrades: [],
        subCategories: subCategories
      };
    });

    return {
      id: crypto.randomUUID(),
      name: name || 'Meine Schule',
      semesters,
      subjects: formattedSubjects,
      passingCriteria,
      settings: {
        language: 'de',
        theme: 'light'
      }
    };
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    
    setSubjects([...subjects, { 
      id: crypto.randomUUID(), 
      name: newSubjectName, 
      hasFinalExam: false,
      subCategories: []
    }]);
    setNewSubjectName('');
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
    if (expandedSubjectId === id) setExpandedSubjectId(null);
  };

  const toggleFinalExam = (id: string) => {
    setSubjects(subjects.map(s => 
      s.id === id ? { ...s, hasFinalExam: !s.hasFinalExam } : s
    ));
  };

  const addSubCategory = (subjectId: string) => {
    if (!newSubName.trim()) return;
    const weight = parseFloat(newSubWeight) || 0;

    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          subCategories: [...s.subCategories, { id: crypto.randomUUID(), name: newSubName, weight }]
        };
      }
      return s;
    }));
    setNewSubName('');
    setNewSubWeight('50');
  };

  const removeSubCategory = (subjectId: string, subId: string) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          subCategories: s.subCategories.filter(sub => sub.id !== subId)
        };
      }
      return s;
    }));
  };

  const handleSave = () => {
    const config = generateConfig();
    onComplete(config);
  };

  const handleDownload = () => {
    const config = generateConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom-config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfiguration erstellen</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${step >= i ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <GraduationCap className="text-primary" /> Grunddaten
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">Name der Schule / Studium</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="z.B. BMS Zürich"
                    className="w-full p-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-500 mb-1">Anzahl Semester</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={semesterCount}
                      onChange={e => setSemesterCount(parseInt(e.target.value))}
                      className="flex-1 accent-primary h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <span className="font-bold text-xl w-8 text-center text-gray-900 dark:text-white">{semesterCount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
               <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Settings className="text-primary" /> Bestehensnormen
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min. Schnitt</label>
                   <input 
                      type="number" 
                      step="0.1" 
                      value={passingCriteria.minAverageGrade} 
                      onChange={e => setPassingCriteria({...passingCriteria, minAverageGrade: parseFloat(e.target.value)})} 
                      className="w-full p-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max. Ungenügend</label>
                   <input 
                      type="number" 
                      value={passingCriteria.maxInsufficientGrades} 
                      onChange={e => setPassingCriteria({...passingCriteria, maxInsufficientGrades: parseInt(e.target.value)})} 
                      className="w-full p-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                   />
                </div>
              </div>
            </div>
            
            <button onClick={() => setStep(2)} disabled={!name} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50">
              Weiter
            </button>
          </div>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <BookOpen className="text-primary" /> Fächer definieren
              </h2>
              
              <form onSubmit={handleAddSubject} className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    placeholder="Fachname (z.B. Mathematik)"
                    className="flex-1 p-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                />
                <button type="submit" disabled={!newSubjectName} className="p-3 bg-primary text-white rounded-xl hover:bg-blue-600 disabled:opacity-50">
                  <Plus size={24} />
                </button>
              </form>
              
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {subjects.length === 0 && <p className="text-center text-gray-400 py-4">Noch keine Fächer hinzugefügt.</p>}
                {subjects.map((sub) => (
                  <div key={sub.id} className="bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Subject Header */}
                    <div 
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setExpandedSubjectId(expandedSubjectId === sub.id ? null : sub.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${expandedSubjectId === sub.id ? 'bg-primary/10 text-primary' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                          {expandedSubjectId === sub.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{sub.name}</div>
                          <div className="flex gap-2 text-xs text-gray-500">
                             {sub.hasFinalExam && <span className="text-blue-500">Inkl. Abschlussprüfung</span>}
                             {sub.subCategories.length > 0 && <span>{sub.subCategories.length} Teilbereiche</span>}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeSubject(sub.id); }} 
                        className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {expandedSubjectId === sub.id && (
                      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
                        {/* Settings */}
                        <div className="mb-4">
                           <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={sub.hasFinalExam}
                                onChange={() => toggleFinalExam(sub.id)}
                                className="w-4 h-4 rounded text-primary focus:ring-primary bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                              />
                              <span>Abschlussprüfung (50%) aktivieren</span>
                           </label>
                        </div>

                        {/* Subcategories */}
                        <div>
                           <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                              <Layers size={12} /> Teilbereiche
                           </h4>
                           
                           {/* Add Subcategory Form */}
                           <div className="flex gap-2 mb-3">
                              <input 
                                type="text" 
                                placeholder="Name"
                                value={newSubName}
                                onChange={e => setNewSubName(e.target.value)}
                                className="flex-[2] px-3 py-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary"
                              />
                              <div className="relative flex-1">
                                <input 
                                  type="number" 
                                  placeholder="%"
                                  value={newSubWeight}
                                  onChange={e => setNewSubWeight(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-400">%</span>
                              </div>
                              <button 
                                onClick={() => addSubCategory(sub.id)}
                                disabled={!newSubName}
                                className="px-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                              >
                                <Plus size={16} />
                              </button>
                           </div>

                           {/* List */}
                           <div className="space-y-2">
                              {sub.subCategories.length === 0 && <p className="text-xs text-gray-400 italic">Keine Teilbereiche definiert (Standard).</p>}
                              {sub.subCategories.map(cat => (
                                 <div key={cat.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{cat.name}</span>
                                    <div className="flex items-center gap-3">
                                       <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{cat.weight}%</span>
                                       <button onClick={() => removeSubCategory(sub.id, cat.id)} className="text-gray-400 hover:text-red-500">
                                          <X size={14} />
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
               <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold transition-colors">
                 Zurück
               </button>
               <button onClick={() => setStep(3)} disabled={subjects.length === 0} className="flex-1 py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50">
                 Weiter
               </button>
            </div>
          </div>
        )}

        {/* Step 3: Finish */}
        {step === 3 && (
           <div className="text-center space-y-6 pt-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Save size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fertig!</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Deine Vorlage "{name}" mit {semesterCount} Semestern und {subjects.length} Fächern ist bereit.
              </p>

              <div className="space-y-3 pt-4">
                <button onClick={handleSave} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30">
                   In App verwenden
                </button>
                <button onClick={handleDownload} className="w-full py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                   <Download size={20} /> Als Datei herunterladen
                </button>
                <button onClick={() => setStep(2)} className="text-gray-400 hover:text-gray-600 text-sm font-medium mt-4 block">
                  Zurück zur Bearbeitung
                </button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default ConfigBuilder;