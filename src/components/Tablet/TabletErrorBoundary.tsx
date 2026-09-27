import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Archive,
  X,
} from "../Icons";

interface Props {
  children: ReactNode;
  tabletType: string;
  tabletId: string;
  tabletState?: string;
  onCloseTab?: () => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorTime?: Date;
}

export class TabletErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorTime: new Date(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Tablet Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
      errorTime: new Date(),
    });
  }

  private generateGitHubIssueUrl = (): string => {
    const { tabletType, tabletId } = this.props;
    const { error, errorInfo, errorTime } = this.state;

    const title = `Tablet Rendering Error: ${tabletType}`;

    const body = `**Problem Description**
A tablet failed to render and caused the app to become unusable.

**Tablet Details**
- **Type**: ${tabletType}
- **ID**: ${tabletId}
- **Error Time**: ${errorTime?.toISOString() || "Unknown"}
- **Browser**: ${navigator.userAgent}

**Error Information**
- **Error Message**: ${error?.message || "Unknown error"}
- **Error Stack**: 
\`\`\`
${error?.stack || "No stack trace available"}
\`\`\`

**Component Stack**:
\`\`\`
${errorInfo?.componentStack || "No component stack available"}
\`\`\`

**Additional Context**
Please provide any additional details about what you were doing when this error occurred.

**Expected Behavior**
The tablet should render normally without breaking the entire application.
`;

    const params = new URLSearchParams({
      title,
      body,
      labels: "bug,tablet-error",
    });

    return `https://github.com/girishbuilds/scratch-tabs/issues/new?${params.toString()}`;
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onRetry?.();
  };

  public render() {
    if (this.state.hasError) {
      const githubUrl = this.generateGitHubIssueUrl();

      return (
        <div className="h-full bg-surface text-main p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto flex flex-col justify-center min-h-full">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-danger" size={32} />
              <div>
                <h2 className="text-xl font-semibold text-danger">
                  Tablet Error
                </h2>
                <p className="text-secondary">
                  Something went wrong with this {this.props.tabletType} tablet
                </p>
              </div>
            </div>

            <div className="bg-surface rounded-lg p-4 mb-6 border border-base">
              <p className="text-secondary leading-relaxed">
                We apologize for the inconvenience. This tablet encountered an
                error and couldn't render properly. To help us fix this issue
                and prevent it from happening again, please consider reporting
                it.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-main">
                Recovery Options:
              </h3>

              <div className="grid gap-3">
                {this.props.onRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center gap-3 w-full p-3 bg-primary hover:bg-primary-hover rounded-lg transition-colors"
                  >
                    <RefreshCw size={18} />
                    <div className="text-left">
                      <div className="font-medium">Try Again</div>
                      <div className="text-sm text-info">
                        Attempt to reload this tablet
                      </div>
                    </div>
                  </button>
                )}

                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <ExternalLink size={18} />
                  <div className="text-left">
                    <div className="font-medium">Report Issue on GitHub</div>
                    <div className="text-sm text-green-200">
                      Help us fix this by reporting the error (recommended)
                    </div>
                  </div>
                </a>

                <div className="flex items-center gap-3 w-full p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                  <Archive size={18} className="text-yellow-400" />
                  <div className="text-left">
                    <div className="font-medium text-yellow-200">
                      Move to a 'Recovery' Workspace
                    </div>
                    <div className="text-sm text-yellow-300">
                      Manually drag this tab to a different workspace to keep it
                      out of the way
                    </div>
                  </div>
                </div>

                {this.props.onCloseTab && (
                  <button
                    onClick={this.props.onCloseTab}
                    className="flex items-center gap-3 w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    <X size={18} />
                    <div className="text-left">
                      <div className="font-medium">Close This Tab</div>
                      <div className="text-sm text-red-200">
                        Remove this tab and create a fresh one
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 bg-surface rounded-lg border border-base">
                <h4 className="font-medium text-main mb-2">
                  What happens next?
                </h4>
                <ul className="text-sm text-muted space-y-1">
                  <li>
                    • If you report the issue, our team will investigate and
                    provide a fix
                  </li>
                  <li>
                    • You can continue using other tabs and features normally
                  </li>
                  <li>• Your data in other tabs is safe and unaffected</li>
                  <li>
                    • Check back on the GitHub issue for updates and solutions
                  </li>
                </ul>
              </div>

              {this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted hover:text-secondary">
                    Technical Details (for debugging)
                  </summary>
                  <div className="mt-2 p-3 bg-surface rounded border border-base text-xs font-mono text-muted">
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div className="mt-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
