'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProgressAnalysis } from '@/app/actions';
import { childProgressUpdates } from '@/lib/data';
import type { AnalyzeChildProgressUpdatesOutput } from '@/ai/flows/analyze-child-progress-updates';
import { Lightbulb, ListChecks, Loader2, Wand2 } from 'lucide-react';

export function ProgressAnalysis() {
  const [analysis, setAnalysis] = useState<AnalyzeChildProgressUpdatesOutput | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAnalysis = () => {
    startTransition(async () => {
      const result = await getProgressAnalysis({
        progressUpdates: childProgressUpdates,
      });
      if ('error' in result && result.error) {
        setAnalysis({
            summary: "Analysis Failed",
            insights: ["An error occurred while analyzing the progress data. The AI model may be unavailable. Please try again later."]
        });
      } else {
        setAnalysis(result);
      }
    });
  };

  useEffect(() => {
    handleAnalysis();
  }, [])


  return (
    <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary"/>
            <CardTitle className="font-headline">AI-Powered Progress Insights</CardTitle>
        </div>
        <CardDescription>
          Automatically analyze trends and challenges from the latest child progress updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {analysis ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold flex items-center mb-2"><ListChecks className="mr-2 h-5 w-5"/>Summary</h3>
              <p className="text-sm text-muted-foreground bg-background/50 p-4 rounded-md">
                {analysis.summary}
              </p>
            </div>
            <div>
              <h3 className="font-semibold flex items-center mb-2"><Lightbulb className="mr-2 h-5 w-5"/>Insights & Recommendations</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {analysis.insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-3 text-muted-foreground">
            {isPending ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Analyzing data with AI...</p>
                <p className="text-xs">This may take a moment.</p>
              </>
            ) : (
               <p>Click the button to generate AI insights.</p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalysis} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          {isPending ? 'Re-analyzing...' : 'Re-analyze Data'}
        </Button>
      </CardFooter>
    </Card>
  );
}
