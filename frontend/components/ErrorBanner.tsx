import { useEffect, useState } from "react";

export type ErrorType = 
  | "gee_auth" 
  | "gee_quota" 
  | "gee_processing" 
  | "gee_timeout"
  | "gpt5_rate_limit" 
  | "gpt5_unavailable" 
  | "gpt5_context_length"
  | "gpt5_invalid_response"
  | "network" 
  | "auth" 
  | "quota" 
  | "server"
  | "unknown";

interface ErrorDetails {
  type: ErrorType;
  message: string;
  details?: string;
  retryable?: boolean;
  actionLabel?: string;
  actionCallback?: () => void;
  timestamp?: Date;
  requestId?: string;
}

interface ErrorBannerProps {
  error: ErrorDetails | null;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const errorConfigs: Record<ErrorType, {
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  suggestions?: string[];
}> = {
  gee_auth: {
    title: "Google Earth Engine Authentication Failed",
    icon: "🔐",
    color: "text-red-400",
    bgColor: "bg-red-900/20",
    borderColor: "border-red-800",
    suggestions: [
      "Check if your GEE credentials are properly configured",
      "Verify your service account has the necessary permissions",
      "Contact support if the issue persists"
    ]
  },
  gee_quota: {
    title: "Earth Engine Quota Exceeded",
    icon: "📊",
    color: "text-orange-400",
    bgColor: "bg-orange-900/20",
    borderColor: "border-orange-800",
    suggestions: [
      "You've reached your daily Earth Engine compute quota",
      "Try again after quota reset at midnight UTC",
      "Consider upgrading to a higher tier for increased limits"
    ]
  },
  gee_processing: {
    title: "Satellite Image Processing Error",
    icon: "🛰️",
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/20",
    borderColor: "border-yellow-800",
    suggestions: [
      "The satellite imagery for this region may be temporarily unavailable",
      "Cloud coverage might be affecting image quality",
      "Try selecting a different date range or AOI"
    ]
  },
  gee_timeout: {
    title: "Earth Engine Request Timeout",
    icon: "⏱️",
    color: "text-blue-400",
    bgColor: "bg-blue-900/20",
    borderColor: "border-blue-800",
    suggestions: [
      "The image processing is taking longer than expected",
      "Try reducing the area of interest or date range",
      "Complex computations may require batch processing"
    ]
  },
  gpt5_rate_limit: {
    title: "GPT-5 Rate Limit Reached",
    icon: "⚡",
    color: "text-purple-400",
    bgColor: "bg-purple-900/20",
    borderColor: "border-purple-800",
    suggestions: [
      "You've exceeded the API rate limit for GPT-5",
      "Please wait a few moments before making another request",
      "Consider spacing out your queries or upgrading your plan"
    ]
  },
  gpt5_unavailable: {
    title: "GPT-5 Service Temporarily Unavailable",
    icon: "🤖",
    color: "text-indigo-400",
    bgColor: "bg-indigo-900/20",
    borderColor: "border-indigo-800",
    suggestions: [
      "The AI service is experiencing high demand",
      "Your request has been queued and will be processed shortly",
      "Check status.openai.com for service updates"
    ]
  },
  gpt5_context_length: {
    title: "Query Too Complex for Processing",
    icon: "📝",
    color: "text-pink-400",
    bgColor: "bg-pink-900/20",
    borderColor: "border-pink-800",
    suggestions: [
      "Your query exceeds the maximum context length",
      "Try breaking down your request into smaller parts",
      "Simplify the query or reduce the time range"
    ]
  },
  gpt5_invalid_response: {
    title: "AI Response Validation Failed",
    icon: "⚠️",
    color: "text-amber-400",
    bgColor: "bg-amber-900/20",
    borderColor: "border-amber-800",
    suggestions: [
      "The AI generated an unexpected response format",
      "This might be due to ambiguous query parameters",
      "Try rephrasing your query more specifically"
    ]
  },
  network: {
    title: "Network Connection Error",
    icon: "🌐",
    color: "text-gray-400",
    bgColor: "bg-gray-900/20",
    borderColor: "border-gray-800",
    suggestions: [
      "Check your internet connection",
      "If using a VPN, try disabling it temporarily",
      "The service might be blocked by your firewall"
    ]
  },
  auth: {
    title: "Authentication Required",
    icon: "🔑",
    color: "text-cyan-400",
    bgColor: "bg-cyan-900/20",
    borderColor: "border-cyan-800",
    suggestions: [
      "Your session has expired",
      "Please sign in again to continue",
      "Check if your account has the necessary permissions"
    ]
  },
  quota: {
    title: "API Quota Exceeded",
    icon: "📈",
    color: "text-emerald-400",
    bgColor: "bg-emerald-900/20",
    borderColor: "border-emerald-800",
    suggestions: [
      "You've reached your daily API limit",
      "Quota resets at midnight UTC",
      "Upgrade to Pro for unlimited queries"
    ]
  },
  server: {
    title: "Server Error",
    icon: "🖥️",
    color: "text-red-400",
    bgColor: "bg-red-900/20",
    borderColor: "border-red-800",
    suggestions: [
      "Our servers encountered an unexpected error",
      "Our team has been notified and is working on a fix",
      "Please try again in a few minutes"
    ]
  },
  unknown: {
    title: "Unexpected Error Occurred",
    icon: "❓",
    color: "text-gray-400",
    bgColor: "bg-gray-900/20",
    borderColor: "border-gray-800",
    suggestions: [
      "An unexpected error occurred while processing your request",
      "Please try again or contact support if the issue persists"
    ]
  }
};

export default function ErrorBanner({ 
  error, 
  onDismiss, 
  autoHide = false, 
  autoHideDelay = 10000 
}: ErrorBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      if (autoHide) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => onDismiss?.(), 300);
        }, autoHideDelay);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoHide, autoHideDelay, onDismiss]);

  if (!error) return null;

  const config = errorConfigs[error.type] || errorConfigs.unknown;
  const showTimestamp = error.timestamp ? new Date(error.timestamp).toLocaleTimeString() : null;

  return (
    <div
      className={`
        fixed top-20 right-4 left-4 md:left-auto md:w-[480px] z-50
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
    >
      <div className={`
        ${config.bgColor} ${config.borderColor} border rounded-xl
        backdrop-blur-sm shadow-2xl overflow-hidden
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <span className="text-2xl mt-1">{config.icon}</span>
              <div className="flex-1">
                <h3 className={`font-semibold ${config.color}`}>
                  {config.title}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {error.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss?.(), 300);
              }}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error Details */}
        {error.details && (
          <div className="px-4 py-3 border-b border-gray-800/50">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-300">
                {error.details}
              </p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {config.suggestions && (
          <div className="px-4 py-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-sm font-medium text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg 
                className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Troubleshooting suggestions</span>
            </button>
            
            {isExpanded && (
              <ul className="mt-3 space-y-2">
                {config.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-gray-500 mt-1">•</span>
                    <span className="text-sm text-gray-400">{suggestion}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 bg-gray-900/30 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {showTimestamp && (
              <span>Occurred at {showTimestamp}</span>
            )}
            {error.requestId && (
              <span className="font-mono">ID: {error.requestId}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {error.retryable && (
              <button
                onClick={error.actionCallback}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {error.actionLabel || "Retry"}
              </button>
            )}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss?.(), 300);
              }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function to detect error type from error message or code
export function detectErrorType(error: any): ErrorType {
  const message = error?.message?.toLowerCase() || "";
  const code = error?.code?.toLowerCase() || "";
  
  // GEE errors
  if (message.includes("earth engine") || message.includes("gee")) {
    if (message.includes("auth") || message.includes("permission")) return "gee_auth";
    if (message.includes("quota") || message.includes("limit")) return "gee_quota";
    if (message.includes("timeout")) return "gee_timeout";
    return "gee_processing";
  }
  
  // GPT-5 errors
  if (message.includes("gpt") || message.includes("openai")) {
    if (message.includes("rate") || code === "rate_limit_exceeded") return "gpt5_rate_limit";
    if (message.includes("unavailable") || code === "service_unavailable") return "gpt5_unavailable";
    if (message.includes("context") || message.includes("token")) return "gpt5_context_length";
    return "gpt5_invalid_response";
  }
  
  // Network errors
  if (message.includes("network") || message.includes("fetch")) return "network";
  
  // Auth errors
  if (message.includes("unauthorized") || code === "401") return "auth";
  
  // Quota errors
  if (message.includes("quota") || message.includes("limit")) return "quota";
  
  // Server errors
  if (code === "500" || code === "503") return "server";
  
  return "unknown";
}

// Hook for managing error state
export function useErrorBanner() {
  const [error, setError] = useState<ErrorDetails | null>(null);

  const showError = (errorData: Partial<ErrorDetails> & { type: ErrorType; message: string }) => {
    setError({
      ...errorData,
      timestamp: new Date(),
      requestId: Math.random().toString(36).substr(2, 9),
    });
  };

  const clearError = () => setError(null);

  return { error, showError, clearError };
}
