import React, { useState } from 'react';
import { Plus, Calendar, ArrowLeft, Trash2, GraduationCap, Calculator, CheckCheck } from 'lucide-react';
import { Subject, Grade, ComingGrade } from '../types';
import { TEXTS } from '../constants';
import { calculateSubjectAverage } from '../utils/calculation';
import GradeInputModal from './GradeInputModal';
import ComingGradeModal from './ComingGradeModal';

interface SubjectDetailProps {
  subject: Subject;
  semesterId: number;
  lang: 'de' | 'en' | 'fr';
  onBack: () => void;
  onAddGrade: (subjectId: string, grade: Grade, subCategoryIndex?: number) => void;
  onDeleteGrade: (subjectId: string, gradeId: string, subCategoryIndex?: number) => void;
  onAddComing: (subjectId: string, item: ComingGrade, subCategoryIndex?: number) => void;
  onDeleteComing: (subjectId: string, itemId: string, subCategoryIndex?: number) => void;
  onUpdateFinalExam: (subjectId: string, grade: number | undefined) => void;
}

interface ConvertingItem {
  id: string;
  name: string;
  date: string;
  subCatIndex?: number;
}

const SubjectDetail: React.FC<SubjectDetailProps> = ({ 
  subject, 
  semesterId, 
  lang, 
  onBack,
  onAddGrade, 
  onDeleteGrade,
  onAddComing,
  onDeleteComing,
  onUpdateFinalExam
}) => {
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isComingModalOpen, setIsComingModalOpen] = useState(false);
  const [activeSubCatIndex, setActiveSubCatIndex] = useState<number | undefined>(undefined);
  
  // State to track if we are converting an upcoming exam to a grade
  const [convertingItem, setConvertingItem] = useState<ConvertingItem | null>(null);

  const t = TEXTS[lang];
  const average = calculateSubjectAverage(subject, semesterId);
  
  // Dynamic color for average
  let avgColorClass = 'text-gray-400';
  let avgBgClass = 'bg-gray-100 dark:bg-gray-800';
  
  if (average !== null) {
      if (average >= 5) {
          avgColorClass = 'text-emerald-600 dark:text-emerald-400';
          avgBgClass = 'bg-emerald-50 dark:bg-emerald-900/20';
      } else if (average >= 4) {
          avgColorClass = 'text-blue-600 dark:text-blue-400';
          avgBgClass = 'bg-blue-50 dark:bg-blue-900/20';
      } else {
          avgColorClass = 'text-red-600 dark:text-red-400';
          avgBgClass = 'bg-red-50 dark:bg-red-900/20';
      }
  }

  const handleOpenGradeModal = (subCatIndex?: number) => {
    setActiveSubCatIndex(subCatIndex);
    setConvertingItem(null); // Ensure we are in "add" mode, not convert
    setIsGradeModalOpen(true);
  };

  const handleOpenComingModal = (subCatIndex?: number) => {
    setActiveSubCatIndex(subCatIndex);
    setIsComingModalOpen(true);
  };
  
  const handleConvertComing = (item: ComingGrade, subCatIndex?: number) => {
    setConvertingItem({
      id: item.id,
      name: item.name,
      date: item.date,
      subCatIndex // Explicitly store the subcat index attached to this item
    });
    setActiveSubCatIndex(subCatIndex);
    setIsGradeModalOpen(true);
  };

  const getSemesterGrades = (grades: Grade[]) => grades.filter(g => g.semesterId === semesterId);
  const getSemesterComing = (items: ComingGrade[]) => items.filter(g => g.semesterId === semesterId);

  // Modern Grade Bubble
  const renderGradeList = (grades: Grade[], subCatIndex?: number) => (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
      {getSemesterGrades(grades).map((g) => (
        <div 
            key={g.id} 
            className="group relative w-20 h-20 sm:w-24 sm:h-24 flex flex-col items-center justify-center bg-white dark:bg-gray-700 rounded-2xl shadow-sm border-2 border-gray-100 dark:border-gray-600 transition-transform hover:-translate-y-1 p-1"
        >
          <span className={`text-xl sm:text-2xl font-bold leading-none mb-1 ${g.value < 4 ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
              {g.value}
          </span>
          <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate w-full text-center px-1" title={g.name}>
              {g.name}
          </span>
          <span className="text-[8px] sm:text-[9px] text-gray-400 font-medium mt-0.5">
              {new Date(g.date).toLocaleDateString(lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-CH' : 'en-GB', { day: '2-digit', month: '2-digit' })}
          </span>
          
          {/* Delete Button Overlay */}
          <button 
            onClick={() => onDeleteGrade(subject.id, g.id, subCatIndex)}
            className="absolute -top-2 -right-2 hidden group-hover:flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full shadow-md z-10 hover:bg-red-600 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      
      {/* Add Button */}
      <button 
        onClick={() => handleOpenGradeModal(subCatIndex)}
        className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-primary hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
      >
        <Plus size={28} className="sm:w-8 sm:h-8" />
      </button>
    </div>
  );

  const renderComingList = (items: ComingGrade[], subCatIndex?: number) => {
    const filtered = getSemesterComing(items);
    return filtered.length > 0 && (
      <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
        <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Calendar size={14}/> {t.upcoming}
        </h4>
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="group relative flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 shadow-sm">
                <span className="text-gray-800 dark:text-gray-200 font-medium text-sm truncate flex-1 mr-2">{item.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded">
                        {new Date(item.date).toLocaleDateString(lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-CH' : 'en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                    <button 
                        onClick={() => handleConvertComing(item, subCatIndex)}
                        className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md transition-colors"
                        title={t.addGrade}
                    >
                        <CheckCheck size={16} />
                    </button>
                    <button 
                        onClick={() => onDeleteComing(subject.id, item.id, subCatIndex)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title={t.delete}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currentFinalExam = subject.finalExamGrades?.[semesterId];

  return (
    <div className="animate-fade-in pb-20">
      {/* Header Area */}
      <div className="flex items-start justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <button 
                onClick={onBack} 
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight truncate break-words whitespace-normal">{subject.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {subject.subCategories.length > 0 ? t.subCategories : 'Standard'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                        Sem {semesterId}
                    </span>
                </div>
            </div>
        </div>
        
        {/* Big Average Badge */}
        <div className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[4.5rem] sm:min-w-[5rem] h-auto px-3 py-2 sm:px-4 sm:py-3 rounded-2xl ${avgBgClass} border-2 border-transparent`}>
            <span className={`text-xl sm:text-2xl font-black ${avgColorClass} whitespace-nowrap`}>
                {average !== null ? average.toFixed(2) : '-'}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mt-1 whitespace-nowrap">{t.average}</span>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
          {/* Main Subject Grades (if no subcategories) */}
          {subject.subCategories.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <GraduationCap size={20} />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">{t.grades}</span>
              </div>
              
              {renderGradeList(subject.grades)}
              {renderComingList(subject.commingGrades)}
              
              {/* Add Upcoming Button */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                    onClick={() => handleOpenComingModal()}
                    className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary uppercase transition-colors"
                >
                    <Plus size={14} />
                    {t.addUpcoming}
                </button>
              </div>
            </div>
          ) : (
            /* Subcategories */
            <div className="space-y-4 sm:space-y-6">
              {subject.subCategories.map((sub, idx) => {
                 if (!sub.semesters.includes(semesterId)) return null;
                 return (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                            {idx + 1}
                        </div>
                        <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate mr-2">{sub.name}</span>
                      </div>
                      <span className="text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-3 py-1.5 rounded-full whitespace-nowrap">
                        {sub.weight}%
                      </span>
                    </div>
                    {renderGradeList(sub.grades, idx)}
                    {renderComingList(sub.commingGrades, idx)}
                    
                     {/* Add Upcoming Button for Subcategory */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={() => handleOpenComingModal(idx)}
                            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary uppercase transition-colors"
                        >
                            <Plus size={14} />
                            {t.addUpcoming}
                        </button>
                    </div>
                  </div>
                 )
              })}
            </div>
          )}

          {/* Final Exam Section */}
          {subject.hasFinalExam && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-indigo-100 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <label className="block text-lg font-bold text-gray-900 dark:text-white leading-none mb-1">
                            {t.finalExam} 
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{lang === 'de' ? 'Gewichtung' : lang === 'fr' ? 'Pondération' : 'Weight'}: {subject.finalExamWeight}%</p>
                    </div>
                </div>
                
                <input 
                  type="number"
                  min="1"
                  max="6"
                  step="0.1"
                  placeholder="-"
                  value={currentFinalExam || ''}
                  onChange={(e) => onUpdateFinalExam(subject.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full sm:w-24 h-14 sm:h-16 text-2xl text-center font-bold rounded-2xl border-2 border-indigo-100 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-gray-600 outline-none transition-all placeholder-gray-300"
                />
              </div>
            </div>
          )}
      </div>

      <GradeInputModal 
        isOpen={isGradeModalOpen} 
        onClose={() => {
            setIsGradeModalOpen(false);
            setConvertingItem(null);
        }}
        initialData={convertingItem ? { name: convertingItem.name, date: convertingItem.date } : null}
        onSave={(val, name, date) => {
          const newGrade: Grade = {
            id: crypto.randomUUID(),
            value: val,
            name,
            date,
            semesterId
          };
          
          // Use specific subCatIndex if converting, otherwise UI state
          const targetIndex = convertingItem?.subCatIndex !== undefined 
             ? convertingItem.subCatIndex 
             : activeSubCatIndex;

          onAddGrade(subject.id, newGrade, targetIndex);
          
          if (convertingItem) {
              onDeleteComing(subject.id, convertingItem.id, targetIndex);
              setConvertingItem(null);
          }
          setIsGradeModalOpen(false);
        }}
        lang={lang}
      />
      
      <ComingGradeModal
        isOpen={isComingModalOpen}
        onClose={() => setIsComingModalOpen(false)}
        onSave={(name, date) => {
           const newComing: ComingGrade = {
              id: crypto.randomUUID(),
              name,
              date,
              semesterId
           };
           onAddComing(subject.id, newComing, activeSubCatIndex);
        }}
        lang={lang}
      />
    </div>
  );
};

export default SubjectDetail;