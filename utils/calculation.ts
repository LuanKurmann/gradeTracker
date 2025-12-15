import { SchoolConfig, Subject, SubCategory, SemesterStats, CalculatedSubject } from "../types";

/**
 * Rounds a number to the specified precision (e.g., "0.5", "0.1", "0.25").
 */
export const roundGrade = (value: number, precisionStr: string): number => {
  const precision = parseFloat(precisionStr);
  if (isNaN(precision) || precision <= 0) return value;
  const factor = 1 / precision;
  return Math.round(value * factor) / factor;
};

/**
 * Calculates the average of a specific entity (Subject or SubCategory) for a given semester.
 * Handles nested subcategories and final exams.
 */
export const calculateSubjectAverage = (
  subject: Subject,
  semesterId: number
): number | null => {
  // Check if subject is active in this semester
  if (!subject.semesters.includes(semesterId)) return null;

  // 1. Calculate Subcategories (if any)
  if (subject.subCategories && subject.subCategories.length > 0) {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const sub of subject.subCategories) {
      if (!sub.semesters.includes(semesterId)) continue;
      
      const subAvg = calculateSimpleAverage(sub.grades, semesterId);
      if (subAvg !== null) {
        // Round the subcategory average before using it for the parent
        const roundedSubAvg = roundGrade(subAvg, sub.rounding);
        totalWeightedScore += roundedSubAvg * sub.weight;
        totalWeight += sub.weight;
      }
    }

    if (totalWeight === 0) return null;
    
    // Normalize weights to 100% if needed, but usually weights sum to 100.
    const preExamAverage = totalWeightedScore / totalWeight;
    const roundedPreExamAvg = roundGrade(preExamAverage, subject.rounding);

    return applyFinalExam(subject, roundedPreExamAvg, semesterId);
  }

  // 2. Simple Subject (No subcategories)
  const simpleAvg = calculateSimpleAverage(subject.grades, semesterId);
  
  if (simpleAvg === null) {
    // Check if only final exam exists
    const finalExamGrade = subject.finalExamGrades?.[semesterId];
    if (subject.hasFinalExam && finalExamGrade !== undefined) {
       return roundGrade(finalExamGrade, subject.finalExamRounding || subject.rounding);
    }
    return null;
  }

  const roundedAvg = roundGrade(simpleAvg, subject.rounding);
  return applyFinalExam(subject, roundedAvg, semesterId);
};

const calculateSimpleAverage = (grades: { value: number, semesterId: number }[], semesterId: number): number | null => {
  if (!grades || grades.length === 0) return null;
  
  const semesterGrades = grades.filter(g => g.semesterId === semesterId);
  
  if (semesterGrades.length === 0) return null;

  const sum = semesterGrades.reduce((acc, g) => acc + g.value, 0);
  return sum / semesterGrades.length;
};

const applyFinalExam = (subject: Subject, currentAverage: number, semesterId: number): number => {
  const finalExamGrade = subject.finalExamGrades?.[semesterId];

  if (subject.hasFinalExam && finalExamGrade !== undefined && subject.finalExamWeight) {
    const examWeightDec = subject.finalExamWeight / 100;
    const semesterWeightDec = 1 - examWeightDec;
    
    // Calculate combined grade
    const finalVal = (currentAverage * semesterWeightDec) + (finalExamGrade * examWeightDec);
    
    // Round based on final exam rounding rule or subject rounding
    return roundGrade(finalVal, subject.finalExamRounding || subject.rounding);
  }
  return currentAverage;
};

/**
 * Calculates statistics for a whole semester.
 */
export const calculateSemesterStats = (config: SchoolConfig, semesterId: number): SemesterStats => {
  const activeSubjects: CalculatedSubject[] = [];
  let sumGrades = 0;
  let countGrades = 0;
  let insufficientCount = 0;

  config.subjects.forEach(subj => {
    if (subj.semesters.includes(semesterId)) {
      const avg = calculateSubjectAverage(subj, semesterId);
      
      const calculatedSubj: CalculatedSubject = {
        id: subj.id,
        name: subj.name,
        average: avg,
        displayAverage: avg ? avg.toFixed(2) : '-',
        isPassing: avg ? avg >= 4 : true, // Default to passing if no grades
      };

      activeSubjects.push(calculatedSubj);

      if (avg !== null) {
        sumGrades += avg;
        countGrades++;
        if (avg < 4) {
          insufficientCount++;
        }
      }
    }
  });

  const semesterAvg = countGrades > 0 ? sumGrades / countGrades : 0;
  const roundedSemesterAvg = roundGrade(semesterAvg, "0.1"); // Standard semester rounding usually 0.1 or 0.01

  // Check passing criteria
  const criteria = config.passingCriteria;
  const failureReasons: string[] = [];

  if (countGrades > 0) {
    if (roundedSemesterAvg < criteria.minAverageGrade) {
      failureReasons.push('minAverage');
    }
    if (insufficientCount > criteria.maxInsufficientGrades) {
      failureReasons.push('maxInsufficient');
    }
    // Assuming maxBelowFour is same check as insufficientCount for standard Swiss systems,
    // but if it's distinct (e.g. < 4.0 vs < 3.0), we track it here. 
    // For now assuming both mean < 4.0 based on typical usage.
    if (insufficientCount > criteria.maxBelowFour && criteria.maxBelowFour !== criteria.maxInsufficientGrades) {
      failureReasons.push('maxBelowFour');
    }
  }

  return {
    semesterId,
    average: roundedSemesterAvg,
    insufficientCount,
    passed: failureReasons.length === 0,
    failureReasons,
    subjects: activeSubjects
  };
};

export const calculateOverallStats = (config: SchoolConfig): { average: number, passed: boolean } => {
  // Aggregate all semester averages
  const semesterIds = config.semesters.map(s => s.id);
  let totalAvg = 0;
  let count = 0;
  let allPassed = true;

  semesterIds.forEach(id => {
    const stats = calculateSemesterStats(config, id);
    if (stats.average > 0) {
      totalAvg += stats.average;
      count++;
    }
    if (!stats.passed) allPassed = false;
  });

  const overallAvg = count > 0 ? totalAvg / count : 0;
  return {
    average: roundGrade(overallAvg, "0.1"),
    passed: allPassed
  };
};