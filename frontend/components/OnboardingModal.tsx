import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  image?: string;
  highlights?: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Welcome to Orbital Sigma",
    description: "Your AI-powered satellite intelligence platform for trading signals. Let's get you started with a quick tour of the key features.",
    icon: "🛰️",
    highlights: [
      "Real-time satellite imagery analysis",
      "GPT-5 powered market insights",
      "Actionable trading signals",
      "24/7 global monitoring"
    ]
  },
  {
    title: "Search Areas of Interest (AOIs)",
    description: "Start by searching for locations that matter to your trading strategy. Monitor ports, farms, mines, and energy facilities worldwide.",
    icon: "🔍",
    highlights: [
      "Use the search bar to find specific locations",
      "Filter by type: Port, Farm, Mine, or Energy",
      "Click on map markers to select AOIs",
      "View real-time satellite data for each location"
    ]
  },
  {
    title: "Analyze with GPT-5",
    description: "Our advanced AI analyzes satellite imagery to detect changes and generate trading signals with confidence scores.",
    icon: "🤖",
    highlights: [
      "Automatic detection of supply chain disruptions",
      "Commodity flow analysis",
      "Infrastructure change detection",
      "Weather impact assessment"
    ]
  },
  {
    title: "Trading Signals Dashboard",
    description: "Receive actionable trading signals based on satellite intelligence. Each signal includes confidence scores and recommended instruments.",
    icon: "📊",
    highlights: [
      "Real-time signal generation",
      "Confidence scores for each prediction",
      "Suggested futures, ETFs, and FX pairs",
      "Export signals as CSV, PDF, or JSON"
    ]
  },
  {
    title: "Natural Language Assistant",
    description: "Use our AI chat assistant to ask questions in plain English. Get instant insights about markets, locations, and trading opportunities.",
    icon: "💬",
    highlights: [
      "Ask questions in natural language",
      "Get market analysis and predictions",
      "Query historical data",
      "Receive personalized recommendations"
    ]
  },
  {
    title: "Pro Features",
    description: "Unlock unlimited potential with Orbital Sigma Pro. Get priority processing, unlimited queries, and advanced analytics.",
    icon: "⚡",
    highlights: [
      "Unlimited API queries",
      "Priority satellite image processing",
      "Advanced technical indicators",
      "Custom alert configurations",
      "API access for automated trading"
    ]
  }
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useUser();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    // Mark onboarding as complete
    if (typeof window !== 'undefined') {
      localStorage.setItem(`orbital-sigma-onboarded-${user?.id}`, 'true');
    }
    onClose();
  };

  const handleComplete = () => {
    // Mark onboarding as complete
    if (typeof window !== 'undefined') {
      localStorage.setItem(`orbital-sigma-onboarded-${user?.id}`, 'true');
    }
    onClose();
  };

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/20">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </p>
                <h2 className="text-2xl font-bold text-white mt-1">
                  {step.title}
                </h2>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`px-8 py-6 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-gray-300 text-lg leading-relaxed mb-6">
            {step.description}
          </p>

          {step.highlights && (
            <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">
                Key Features
              </h3>
              <ul className="space-y-3">
                {step.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="mt-1.5">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" />
                    </div>
                    <span className="text-gray-300 text-sm leading-relaxed">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Visual Demo Area (placeholder for future screenshots) */}
          {currentStep === 0 && (
            <div className="mt-6 grid grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-lg p-4 border border-indigo-800/30">
                <div className="text-2xl mb-2">🌍</div>
                <p className="text-xs text-gray-400">Global Coverage</p>
              </div>
              <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-lg p-4 border border-green-800/30">
                <div className="text-2xl mb-2">⚡</div>
                <p className="text-xs text-gray-400">Real-time</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-lg p-4 border border-yellow-800/30">
                <div className="text-2xl mb-2">🎯</div>
                <p className="text-xs text-gray-400">High Accuracy</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg p-4 border border-purple-800/30">
                <div className="text-2xl mb-2">🔒</div>
                <p className="text-xs text-gray-400">Secure</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-800/50 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Skip tutorial
            </button>
            
            <div className="flex items-center space-x-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>
              )}
              
              {currentStep < onboardingSteps.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all flex items-center space-x-2"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all flex items-center space-x-2"
                >
                  <span>Get Started</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const { user, isLoaded } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user || hasChecked) return;

    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(`orbital-sigma-onboarded-${user.id}`);
    
    // Also check if this is user's first sign in (you might need to track this in your database)
    // For now, we'll show it if they haven't completed onboarding
    if (!hasCompletedOnboarding) {
      // Small delay to let the page load first
      setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
    }
    
    setHasChecked(true);
  }, [user, isLoaded, hasChecked]);

  const closeOnboarding = () => {
    setShowOnboarding(false);
    if (user) {
      localStorage.setItem(`orbital-sigma-onboarded-${user.id}`, 'true');
    }
  };

  const resetOnboarding = () => {
    if (user) {
      localStorage.removeItem(`orbital-sigma-onboarded-${user.id}`);
      setShowOnboarding(true);
    }
  };

  return { showOnboarding, closeOnboarding, resetOnboarding };
}
