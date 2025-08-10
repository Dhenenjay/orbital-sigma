import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser, SignInButton } from '@clerk/nextjs';

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/intelligence');
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Subtle animated background */}
      <div className="fixed inset-0 opacity-20">
        <div 
          className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Floating orbs - subtle */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 bg-indigo-600 rounded-full filter blur-[128px] opacity-10 animate-pulse" />
      <div className="fixed bottom-1/4 -right-32 w-96 h-96 bg-purple-600 rounded-full filter blur-[128px] opacity-10 animate-pulse" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-2xl shadow-indigo-500/20">
            <span className="text-4xl">🛰️</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-light mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Orbital Sigma
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Turn satellite intelligence into trading signals.
            <br />
            Ask in plain English. We scan Earth, explain changes, generate alpha.
          </p>
        </div>

        {/* Single Sign In Button */}
        <SignInButton mode="modal">
          <button className="group relative px-10 py-4 overflow-hidden rounded-xl font-medium text-lg transform hover:scale-105 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <span className="relative z-10 flex items-center space-x-2">
              <span>Start Scanning Earth</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </SignInButton>

        {/* Live Status */}
        <div className="mt-8 inline-flex items-center space-x-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-full">
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
    </div>
  );
}
