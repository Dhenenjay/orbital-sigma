import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard-pro');
    }
  }, [isSignedIn, isLoaded, router]);

  // Track mouse for gradient effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const sampleQuestions = [
    {
      icon: "🌾",
      text: "Where did soy fields in Brazil change most this month and what's the impact on futures?",
      color: "from-green-500/20 to-emerald-600/20",
      borderColor: "hover:border-green-500/50"
    },
    {
      icon: "🚢",
      text: "Is port congestion in Asia likely to hit US retail stocks next week?",
      color: "from-blue-500/20 to-cyan-600/20",
      borderColor: "hover:border-blue-500/50"
    },
    {
      icon: "⛏️",
      text: "Any copper mine activity that could move HG in the next 2-4 weeks?",
      color: "from-orange-500/20 to-red-600/20",
      borderColor: "hover:border-orange-500/50"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative" ref={containerRef}>
      {/* Animated gradient background */}
      <div 
        className="fixed inset-0 opacity-30 transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.15) 0%, transparent 50%)`
        }}
      />
      
      {/* Grid background */}
      <div className="fixed inset-0 opacity-20">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Floating orbs */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-indigo-600 rounded-full filter blur-[128px] opacity-20 animate-pulse" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-purple-600 rounded-full filter blur-[128px] opacity-20 animate-pulse animation-delay-2000" />
      
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-indigo-400 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Navigation */}
        <nav className="flex items-center justify-between py-8 animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                <span className="text-2xl animate-pulse-slow">🛰️</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Orbital Sigma
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Intelligence Platform</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-all hover:scale-105">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-400 hover:text-white transition-all hover:scale-105">
              Docs
            </Link>
            <SignInButton mode="modal">
              <button className="text-gray-400 hover:text-white transition-all hover:scale-105">
                Sign In
              </button>
            </SignInButton>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="mt-20 mb-16 text-center relative">
          {/* Floating satellite decoration */}
          <div className="absolute -top-10 right-10 w-32 h-32 opacity-20 animate-float-slow">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-3xl" />
              <span className="absolute inset-0 flex items-center justify-center text-5xl">🛰️</span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight animate-slide-up">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              The Virtual Satellite for
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-x">
              Market Alpha
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up animation-delay-200">
            Ask in plain English. We scan the planet, explain what changed,
            <br />
            and turn it into trade-ready signals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slide-up animation-delay-400">
            <button
              onClick={() => router.push('/demo')}
              className="group relative px-8 py-4 overflow-hidden rounded-xl font-semibold text-lg transform hover:scale-105 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <span className="relative z-10">Try a Demo</span>
            </button>

            <SignInButton mode="modal">
              <button className="group px-8 py-4 bg-gray-900 border border-gray-800 rounded-xl font-semibold text-lg hover:bg-gray-800 hover:border-gray-700 transform hover:scale-105 transition-all duration-300">
                <span className="flex items-center space-x-2">
                  <span>Sign in to Start</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </SignInButton>
          </div>

          {/* Live Status Badge */}
          <div className="mt-8 inline-flex items-center space-x-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-full animate-slide-up animation-delay-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">
              Last Earth scan: {new Date().toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })} UTC
            </span>
          </div>
        </div>

        {/* Sample Questions Section */}
        <div className="mb-20">
          <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-wider animate-fade-in">
            Sample Intelligence Queries
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {sampleQuestions.map((question, index) => (
              <div
                key={index}
                className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 animate-slide-up`}
                style={{ animationDelay: `${index * 100 + 800}ms` }}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => router.push('/demo')}
              >
                <div className={`relative p-6 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl transition-all duration-300 ${question.borderColor}`}>
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${question.color} opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300`} />
                  
                  {/* Icon */}
                  <div className="relative text-3xl mb-4 transform group-hover:scale-110 transition-transform">
                    {question.icon}
                  </div>
                  
                  {/* Question text */}
                  <p className="relative text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                    {question.text}
                  </p>
                  
                  {/* Hover indicator */}
                  <div className="relative mt-4 flex items-center space-x-2 text-xs text-gray-500 group-hover:text-indigo-400 transition-colors">
                    <span>Try this query</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Animated border glow */}
                  {hoveredCard === index && (
                    <div className="absolute inset-0 rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 blur-xl animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: "🌍",
              title: "Global Coverage",
              description: "Real-time satellite analysis across every commodity zone"
            },
            {
              icon: "🤖",
              title: "GPT-5 Powered",
              description: "Natural language to actionable trading signals"
            },
            {
              icon: "⚡",
              title: "Instant Signals",
              description: "From question to trade thesis in seconds"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="text-center group animate-fade-in"
              style={{ animationDelay: `${index * 100 + 1200}ms` }}
            >
              <div className="inline-block p-4 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl group-hover:border-gray-700 group-hover:scale-110 transition-all duration-300">
                <span className="text-4xl">{feature.icon}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              © 2025 Orbital Sigma. Not investment advice.
            </p>
            <div className="flex items-center space-x-6">
              <Link href="/terms" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(10px); }
          66% { transform: translateY(30px) translateX(-10px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 4s ease infinite;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out both;
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out both;
        }

        .animate-pulse-slow {
          animation: pulse 3s ease-in-out infinite;
        }

        .animation-delay-200 {
          animation-delay: 200ms;
        }

        .animation-delay-400 {
          animation-delay: 400ms;
        }

        .animation-delay-600 {
          animation-delay: 600ms;
        }

        .animation-delay-2000 {
          animation-delay: 2000ms;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
