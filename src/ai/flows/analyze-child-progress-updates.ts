'use server';

/**
 * @fileOverview Analyzes child progress updates using an LLM to identify trends and challenges.
 *
 * - analyzeChildProgressUpdates - A function that handles the analysis of child progress updates.
 * - AnalyzeChildProgressUpdatesInput - The input type for the analyzeChildProgressUpdates function.
 * - AnalyzeChildProgressUpdatesOutput - The return type for the analyzeChildProgressUpdates function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeChildProgressUpdatesInputSchema = z.object({
  progressUpdates: z.array(
    z.object({
      child_id: z.string().describe('The ID of the child.'),
      visit_id: z.string().describe('The ID of the visit.'),
      is_studying: z.boolean().describe('Whether the child is currently studying.'),
      not_studying_reason: z.string().optional().describe('The reason the child is not studying, if applicable.'),
      is_working: z.boolean().describe('Whether the child is currently working.'),
      work_details: z.string().optional().describe('Details about the childs work, if applicable.'),
      studying_challenges: z.string().optional().describe('Challenges the child is facing with studying, if applicable.'),
    })
  ).describe('An array of child progress update records.'),
});
export type AnalyzeChildProgressUpdatesInput = z.infer<typeof AnalyzeChildProgressUpdatesInputSchema>;

const AnalyzeChildProgressUpdatesOutputSchema = z.object({
  summary: z.string().describe('A summary of the trends and challenges identified in the child progress updates.'),
  insights: z.array(z.string()).describe('Specific insights and recommendations based on the analysis.'),
});
export type AnalyzeChildProgressUpdatesOutput = z.infer<typeof AnalyzeChildProgressUpdatesOutputSchema>;

export async function analyzeChildProgressUpdates(input: AnalyzeChildProgressUpdatesInput): Promise<AnalyzeChildProgressUpdatesOutput> {
  return analyzeChildProgressUpdatesFlow(input);
}

const analyzeChildProgressUpdatesPrompt = ai.definePrompt({
  name: 'analyzeChildProgressUpdatesPrompt',
  input: {schema: AnalyzeChildProgressUpdatesInputSchema},
  output: {schema: AnalyzeChildProgressUpdatesOutputSchema},
  prompt: `You are an expert in child education and welfare. Analyze the following child progress updates to identify trends and challenges and provide insights for intervention programs.

Progress Updates:
{{#each progressUpdates}}
  - Child ID: {{child_id}}
    - Visit ID: {{visit_id}}
    - Is Studying: {{is_studying}}
    - Not Studying Reason: {{not_studying_reason}}
    - Is Working: {{is_working}}
    - Work Details: {{work_details}}
    - Studying Challenges: {{studying_challenges}}
{{/each}}

Provide a summary of the key trends and challenges observed across all children, and suggest potential interventions or recommendations to address these issues.

Ensure the summary and insights are clear, concise, and actionable.
`,
});

const analyzeChildProgressUpdatesFlow = ai.defineFlow(
  {
    name: 'analyzeChildProgressUpdatesFlow',
    inputSchema: AnalyzeChildProgressUpdatesInputSchema,
    outputSchema: AnalyzeChildProgressUpdatesOutputSchema,
  },
  async input => {
    const {output} = await analyzeChildProgressUpdatesPrompt(input);
    return output!;
  }
);
