import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary
 * Catches React rendering errors and provides fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Error Boundary caught an error:", error, errorInfo);

        // Update state with error details
        this.setState({
            error,
            errorInfo,
        });

        // Report error to backend
        this.reportError(error, errorInfo);
    }

    reportError = async (error: Error, errorInfo: ErrorInfo) => {
        try {
            await fetch("/api/errors/report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack,
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                }),
            });
        } catch (reportError) {
            console.error("Failed to report error:", reportError);
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                    <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-red-100 p-4 rounded-full">
                                <AlertTriangle className="w-12 h-12 text-red-600" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
                            Oops! Something went wrong
                        </h1>

                        {/* Message */}
                        <p className="text-gray-600 text-center mb-8">
                            We're sorry, but something unexpected happened. Our team has been
                            notified and we're working to fix this.
                        </p>

                        {/* Error Details (dev mode only) */}
                        {import.meta.env.DEV && this.state.error && (
                            <div className="bg-gray-100 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    Error Details (Development Only):
                                </h3>
                                <p className="text-sm text-red-600 font-mono mb-2">
                                    {this.state.error.message}
                                </p>
                                {this.state.error.stack && (
                                    <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                                        {this.state.error.stack}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                <Home className="w-5 h-5" />
                                Go Home
                            </button>
                        </div>

                        {/* Support Contact */}
                        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                            <p className="text-sm text-gray-500">
                                If this problem persists, please contact our{" "}
                                <a href="/support" className="text-indigo-600 hover:underline">
                                    support team
                                </a>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
