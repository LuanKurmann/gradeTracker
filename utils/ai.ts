
import { GoogleGenAI } from "@google/genai";
import { SchoolConfig, ExtractedGrade } from "../types";

/**
 * Converts a File object to a Base64 string usable by the Gemini API.
 */
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes an image using Gemini to extract grades and map them to existing subjects.
 */
export const analyzeGradeImage = async (file: File, config: SchoolConfig): Promise<ExtractedGrade[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = await fileToGenerativePart(file);

    // Prepare context about existing subjects for the AI
    const subjectContext = config.subjects.map(s => ({
      id: s.id,
      name: s.name,
      subCategories: s.subCategories.map(sc => sc.name)
    }));

    const semesterContext = config.semesters.map(s => ({
      id: s.id,
      name: s.name
    }));

    const activeSemesterId = config.settings.activeSemesterId || 1;
    const dateToday = new Date().toISOString().split('T')[0];

    const prompt = `
    Analyze this image of school grades.
    I have an existing configuration with the following subjects:
    ${JSON.stringify(subjectContext, null, 2)}
    
    And the following semesters:
    ${JSON.stringify(semesterContext, null, 2)}
    (Current Active Semester ID: ${activeSemesterId})

    Your task is to extract grades from the image and map them to the existing subjects provided above.
    
    Rules:
    1. Identify the subject name in the image and fuzzy match it to one of the provided subjects in the list. Use the 'id' from the list.
    2. If a subject has subcategories (e.g. "Naturwissenschaften" has "Physik" and "Chemie"), try to identify if the grade belongs to a specific subcategory. Return the 'subCategoryName' exactly as in the list.
    3. Extract the grade value (number).
    4. Extract the date if visible. If not, use "${dateToday}".
    5. Determine the semester. If the image explicitly says "Semester 1", match it to the semester list. If unknown, use the Current Active Semester ID (${activeSemesterId}).
    6. Ignore grades for subjects that are NOT in the provided list.
    7. Generate a random UUID for the 'id' of the grade.
    8. Return a JSON Array of objects.

    Target JSON Structure:
    [
      {
        "id": "uuid...",
        "subjectId": "matching_subject_id_from_list",
        "subCategoryName": "name_of_subcategory_if_applicable_or_null",
        "value": 5.5,
        "name": "Test Title (or 'Test' if unknown)",
        "date": "YYYY-MM-DD",
        "semesterId": 1
      }
    ]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
            imagePart,
            { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const grades = JSON.parse(text) as ExtractedGrade[];
    return grades;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
};
