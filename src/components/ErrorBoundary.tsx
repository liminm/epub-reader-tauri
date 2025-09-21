import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-red-900 text-white h-full flex flex-col items-center justify-center">
                    <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
                    <p className="text-sm font-mono bg-black/50 p-2 rounded max-w-lg overflow-auto">
                        {this.state.error?.toString()}
                    </p>
                    <button
                        className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                        onClick={() => window.location.reload()}
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
