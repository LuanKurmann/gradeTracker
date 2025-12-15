import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Subject } from '../types';
import { calculateSubjectAverage } from '../utils/calculation';

interface SubjectCardProps {
  subject: Subject;
  semesterId: number;
  onClick: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ 
  subject, 
  semesterId, 
  onClick
}) => {
  const average = calculateSubjectAverage(subject, semesterId);
  const avgColor = average ? (average >= 4 ? 'text-green-600 dark:text-green-400' : 'text-danger') : 'text-gray-400';

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all duration-200"
    >
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{subject.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
           {subject.subCategories.length > 0 ? 'Teilbereiche verfügbar' : 'Direkte Noten'}
        </p>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        <div className={`text-xl sm:text-2xl font-bold ${avgColor}`}>
          {average !== null ? average.toFixed(2) : '-.--'}
        </div>
        <ChevronRight size={20} className="text-gray-400"/>
      </div>
    </div>
  );
};

export default SubjectCard;