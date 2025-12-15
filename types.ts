
export interface Grade {
  id: string;
  value: number;
  date: string;
  name: string;
  semesterId: number;
}

export interface ComingGrade {
  id: string;
  name: string;
  date: string;
  semesterId: number;
}

export interface Semester {
  id: number;
  name: string;
}

export interface SubCategory {
  name: string;
  weight: number; // Percentage (e.g. 33)
  rounding: string; // "0.5", "0.1", etc.
  semesters: number[];
  grades: Grade[];
  commingGrades: ComingGrade[];
  hasFinalExam?: boolean;
  finalExamWeight?: number;
  finalExamRounding?: string;
  finalExamGrades?: { [semesterId: number]: number }; // Map semesterId to grade
}

export interface Subject {
  id: string;
  name: string;
  weight: number;
  rounding: string;
  hasFinalExam: boolean;
  finalExamWeight?: number;
  finalExamRounding?: string;
  semesters: number[];
  grades: Grade[];
  commingGrades: ComingGrade[];
  subCategories: SubCategory[];
  finalExamGrades?: { [semesterId: number]: number }; // Map semesterId to grade
}

export interface PassingCriteria {
  maxInsufficientGrades: number;
  maxBelowFour: number;
  minAverageGrade: number;
}

export interface Settings {
  language: 'de' | 'en' | 'fr';
  theme: 'light' | 'dark';
  calendarFileId?: string; // UUID for the public .ics file in Supabase Storage
  activeSemesterId?: number; // The semester to show by default
  accentColor?: string; // Hex code for the primary color
}

export interface SchoolConfig {
  id: string;
  name: string;
  semesters: Semester[];
  subjects: Subject[];
  passingCriteria: PassingCriteria;
  settings: Settings;
}

export interface CalculatedSubject {
  id: string;
  name: string;
  average: number | null;
  displayAverage: string;
  isPassing: boolean;
  subCategoryAverages?: { name: string; average: number | null }[];
}

export interface SemesterStats {
  semesterId: number;
  average: number;
  insufficientCount: number; // Number of grades < 4
  passed: boolean;
  failureReasons: string[]; // List of keys explaining why it failed
  subjects: CalculatedSubject[];
}

export interface ExtractedGrade {
  id: string; // temp id
  subjectId: string;
  subCategoryName?: string; // if it belongs to a subcategory
  value: number;
  name: string;
  date: string;
  semesterId: number;
}
