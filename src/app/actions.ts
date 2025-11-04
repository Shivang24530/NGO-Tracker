'use server';

import {
  analyzeChildProgressUpdates,
  AnalyzeChildProgressUpdatesInput,
} from '@/ai/flows/analyze-child-progress-updates';

export async function getProgressAnalysis(
  input: AnalyzeChildProgressUpdatesInput
) {
  try {
    // In a real application, you might add more robust error handling,
    // validation, or authorization checks here.
    const result = await analyzeChildProgressUpdates(input);
    return result;
  } catch (error) {
    console.error('Error getting progress analysis:', error);
    // Return a structured error to the client
    return {
      summary: 'Analysis Failed',
      insights: [
        'An error occurred while analyzing the progress data. Please try again later.',
      ],
      error: true,
    };
  }
}
