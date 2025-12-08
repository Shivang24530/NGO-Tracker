'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error Boundary caught an error:', error, errorInfo);

        // TODO: Send to error monitoring service (e.g., Sentry)
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
                    <div className="max-w-md text-center space-y-4">
                        <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
                        <h1 className="text-2xl font-bold">Something went wrong</h1>
                        <p className="text-muted-foreground">
                            We're sorry, but something unexpected happened. Please try refreshing the page.
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                onClick={() => window.location.reload()}
                                variant="default"
                            >
                                Refresh Page
                            </Button>
                            <Button
                                onClick={() => window.history.back()}
                                variant="outline"
                            >
                                Go Back
                            </Button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="cursor-pointer text-sm font-medium">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto">
                                    {this.state.error.toString()}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
