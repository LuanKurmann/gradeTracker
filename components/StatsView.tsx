import React from 'react';
import { SchoolConfig, Grade } from '../types';
import { calculateSemesterStats, calculateSubjectAverage } from '../utils/calculation';
import { TEXTS } from '../constants';
import { TrendingUp, TrendingDown, Award, Book, Hash } from 'lucide-react';

interface StatsViewProps {
  config: SchoolConfig;
  activeSemesterId: number;
  lang: 'de' | 'en' | 'fr';
}

const StatsView: React.FC<StatsViewProps> = ({ config, activeSemesterId, lang }) => {
  const t = TEXTS[lang];

  // --- Data Preparation ---

  // 1. Semester Trend Data
  // Filter out semesters with 0 average (no grades yet) to prevent the chart from dipping to 0
  const trendData = config.semesters.map(sem => {
    const stats = calculateSemesterStats(config, sem.id);
    return {
      name: sem.name,
      shortName: `${sem.id}.`,
      id: sem.id,
      value: stats.average || 0
    };
  }).filter(d => d.value > 0);

  // 2. Subject Comparison (Active Semester)
  const subjectData = config.subjects
    .filter(s => s.semesters.includes(activeSemesterId))
    .map(s => ({
      name: s.name,
      average: calculateSubjectAverage(s, activeSemesterId)
    }))
    .filter(s => s.average !== null)
    .sort((a, b) => (b.average as number) - (a.average as number));

  // 3. Grade Distribution (Global)
  let allGrades: number[] = [];
  config.subjects.forEach(s => {
    s.grades.forEach(g => allGrades.push(g.value));
    s.subCategories.forEach(sub => sub.grades.forEach(g => allGrades.push(g.value)));
  });

  const distribution = {
    insufficient: allGrades.filter(v => v < 4).length,
    passing: allGrades.filter(v => v >= 4 && v < 5).length,
    good: allGrades.filter(v => v >= 5 && v < 5.5).length,
    excellent: allGrades.filter(v => v >= 5.5).length
  };

  const totalGrades = allGrades.length;
  const maxDistVal = Math.max(distribution.insufficient, distribution.passing, distribution.good, distribution.excellent);

  // 4. KPIs
  const bestSubject = subjectData.length > 0 ? subjectData[0] : null;
  const worstSubject = subjectData.length > 0 ? subjectData[subjectData.length - 1] : null;

  if (totalGrades === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 animate-fade-in">
        <TrendingUp size={48} className="mb-4 opacity-50" />
        <p>{t.stats.noData}</p>
      </div>
    );
  }

  // --- Chart Constants ---
  const CHART_HEIGHT = 200;
  const CHART_WIDTH = 500; // Internal SVG coordinate system
  const PADDING_LEFT = 40;
  const PADDING_BOTTOM = 30;
  const PADDING_TOP = 20;
  const PADDING_RIGHT = 20;

  const DRAW_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const DRAW_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Y-Axis: Scale 1 to 6
  const getY = (val: number) => {
    // Map 1..6 to DRAW_HEIGHT..0
    // val 1 -> y = DRAW_HEIGHT
    // val 6 -> y = 0
    // Formula: y = (1 - (val - 1) / 5) * DRAW_HEIGHT
    return PADDING_TOP + (1 - (val - 1) / 5) * DRAW_HEIGHT;
  };

  const getX = (index: number, total: number) => {
    if (total <= 1) return PADDING_LEFT + DRAW_WIDTH / 2;
    return PADDING_LEFT + (index / (total - 1)) * DRAW_WIDTH;
  };

  // Generate Line Path
  const linePath = trendData.length > 1 
    ? trendData.map((d, i) => `${getX(i, trendData.length)},${getY(d.value)}`).join(" L ")
    : "";

  // Generate Area Path (for gradient)
  const areaPath = trendData.length > 1
    ? `${getX(0, trendData.length)},${getY(1)} L ` + 
      trendData.map((d, i) => `${getX(i, trendData.length)},${getY(d.value)}`).join(" L ") + 
      ` L ${getX(trendData.length - 1, trendData.length)},${getY(1)} Z`
    : "";

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
         <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
               <Award size={14} /> {t.stats.bestSubject}
            </div>
            <div className="font-bold text-gray-900 dark:text-white truncate">{bestSubject?.name || '-'}</div>
            <div className="text-2xl font-black text-green-500">{bestSubject?.average?.toFixed(2) || '-'}</div>
         </div>

         <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
               <TrendingDown size={14} /> {t.stats.worstSubject}
            </div>
            <div className="font-bold text-gray-900 dark:text-white truncate">{worstSubject?.name || '-'}</div>
            <div className="text-2xl font-black text-amber-500">{worstSubject?.average?.toFixed(2) || '-'}</div>
         </div>

         <div className="col-span-2 md:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
               <Hash size={14} /> {t.stats.totalGrades}
            </div>
            <div className="text-3xl font-black text-primary mt-2">{totalGrades}</div>
         </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
         <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> {t.stats.trend}
         </h3>
         <div className="w-full aspect-[2/1] sm:aspect-[2.5/1]">
            {trendData.length > 0 ? (
            <svg className="w-full h-full" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
               <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="0.3" />
                     <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
                  </linearGradient>
               </defs>
               
               {/* Y-Axis Grid & Labels */}
               {[2, 3, 4, 5, 6].map(grade => {
                   const y = getY(grade);
                   return (
                       <g key={grade}>
                           <line 
                              x1={PADDING_LEFT} 
                              y1={y} 
                              x2={CHART_WIDTH - PADDING_RIGHT} 
                              y2={y} 
                              stroke="currentColor" 
                              className={grade === 4 ? "text-red-300 dark:text-red-900/50" : "text-gray-100 dark:text-gray-700"} 
                              strokeWidth={grade === 4 ? "2" : "1"} 
                              strokeDasharray={grade === 4 ? "4,4" : "0"}
                           />
                           <text 
                              x={PADDING_LEFT - 8} 
                              y={y + 4} 
                              textAnchor="end" 
                              className={`text-[10px] sm:text-xs font-medium ${grade === 4 ? 'fill-red-400' : 'fill-gray-400'}`}
                           >
                              {grade}.0
                           </text>
                       </g>
                   )
               })}

               {/* X-Axis Labels */}
               {trendData.map((d, i) => {
                   const x = getX(i, trendData.length);
                   return (
                       <text 
                          key={i} 
                          x={x} 
                          y={CHART_HEIGHT - 10} 
                          textAnchor="middle" 
                          className="text-[10px] sm:text-xs font-bold fill-gray-500 dark:fill-gray-400"
                       >
                          {d.shortName}
                       </text>
                   )
               })}

               {/* Area Fill */}
               {trendData.length > 1 && (
                   <path d={`M ${linePath ? linePath.split(" L ")[0] : ""} L ` + areaPath} fill="url(#trendGradient)" />
               )}

               {/* Line */}
               {trendData.length > 1 && (
                   <path 
                      d={`M ${linePath}`} 
                      fill="none" 
                      stroke="currentColor" 
                      className="text-primary" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                   />
               )}

               {/* Dots & Values */}
               {trendData.map((d, i) => {
                  const x = getX(i, trendData.length);
                  const y = getY(d.value);
                  return (
                      <g key={i} className="group">
                          <circle cx={x} cy={y} r="5" className="fill-white dark:fill-gray-800 stroke-primary" strokeWidth="2.5" />
                          {/* Tooltip-like value always visible */}
                          <rect x={x - 16} y={y - 25} width="32" height="18" rx="4" className="fill-gray-900 dark:fill-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          <text 
                             x={x} 
                             y={y - 10} 
                             textAnchor="middle" 
                             className="text-[10px] font-bold fill-gray-600 dark:fill-gray-300 group-hover:fill-white dark:group-hover:fill-gray-900 transition-colors pointer-events-none"
                          >
                             {d.value.toFixed(2)}
                          </text>
                      </g>
                  )
               })}
            </svg>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Noch nicht genügend Daten für einen Trend.
                </div>
            )}
         </div>
      </div>

      {/* Subject Comparison Bar Chart */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
         <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Book size={18} className="text-primary" /> {t.stats.subjectComparison}
         </h3>
         <div className="space-y-3">
            {subjectData.map(subj => (
               <div key={subj.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                     <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{subj.name}</span>
                     <span className="font-bold text-gray-900 dark:text-white">{subj.average?.toFixed(2)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                     <div 
                        className={`h-full rounded-full ${
                            (subj.average || 0) >= 5 ? 'bg-green-500' : 
                            (subj.average || 0) >= 4 ? 'bg-primary' : 'bg-red-500'
                        }`}
                        style={{ width: `${((subj.average || 0) / 6) * 100}%` }}
                     />
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Distribution Chart */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
         <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Hash size={18} className="text-primary" /> {t.stats.distribution}
         </h3>
         <div className="flex items-end justify-around h-40 gap-2">
            {[
                { label: '< 4', count: distribution.insufficient, color: 'bg-red-500' },
                { label: '4 - 4.9', count: distribution.passing, color: 'bg-blue-500' },
                { label: '5 - 5.4', count: distribution.good, color: 'bg-emerald-400' },
                { label: '≥ 5.5', count: distribution.excellent, color: 'bg-emerald-600' },
            ].map((bucket, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {bucket.count}
                    </div>
                    <div 
                        className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 ${bucket.color} opacity-80 hover:opacity-100`}
                        style={{ height: totalGrades > 0 ? `${(bucket.count / maxDistVal) * 80}%` : '0%' }}
                    ></div>
                    <div className="text-[10px] text-gray-400 mt-2 font-medium text-center leading-tight">{bucket.label}</div>
                </div>
            ))}
         </div>
      </div>

    </div>
  );
};

export default StatsView;