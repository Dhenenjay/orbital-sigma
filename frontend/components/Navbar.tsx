import { useUser, UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface NavbarProps {
  showPlan?: boolean;
}

export default function Navbar({ showPlan = true }: NavbarProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { userId } = useAuth();
  const router = useRouter();
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn && user) {
      // Check user's plan from publicMetadata
      const plan = user.publicMetadata?.plan as string;
      setUserPlan(plan === "pro" ? "pro" : "free");
      setLoading(false);
    }
  }, [isSignedIn, user]);

  const getPlanBadge = () => {
    if (!showPlan || !isSignedIn) return null;
    
    if (loading) {
      return (
        <div style={{
          padding: "4px 10px",
          background: "#e5e7eb",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          animation: "pulse 1.5s infinite",
        }}>
          <span style={{ color: "#6b7280" }}>Loading...</span>
        </div>
      );
    }

    const isPro = userPlan === "pro";
    
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: isPro ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "#f3f4f6",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        boxShadow: isPro ? "0 2px 4px rgba(251, 191, 36, 0.3)" : "none",
      }}>
        <span style={{ fontSize: 14 }}>{isPro ? "⭐" : "🎯"}</span>
        <span style={{ color: isPro ? "#ffffff" : "#4b5563" }}>
          {isPro ? "PRO" : "FREE"}
        </span>
        {!isPro && (
          <Link 
            href="/pricing"
            style={{
              marginLeft: 4,
              padding: "2px 6px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 10,
              fontSize: 10,
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#4338ca";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#4f46e5";
            }}
          >
            Upgrade
          </Link>
        )}
      </div>
    );
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 1000,
      background: "white",
      borderBottom: "1px solid #e5e7eb",
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    }}>
      <div style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Left Section - Logo & Navigation */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}>
          {/* Logo */}
          <Link 
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#1f2937",
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}>
              🛰️
            </div>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}>
              Orbital Sigma
            </span>
          </Link>

          {/* Navigation Links */}
          {isSignedIn && (
            <div style={{
              display: "flex",
              gap: 24,
            }}>
              <Link
                href="/dashboard"
                style={{
                  color: isActive("/dashboard") ? "#4f46e5" : "#6b7280",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  position: "relative",
                  padding: "4px 0",
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/dashboard")) {
                    e.currentTarget.style.color = "#4f46e5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/dashboard")) {
                    e.currentTarget.style.color = "#6b7280";
                  }
                }}
              >
                Dashboard
                {isActive("/dashboard") && (
                  <div style={{
                    position: "absolute",
                    bottom: -20,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "#4f46e5",
                    borderRadius: 1,
                  }} />
                )}
              </Link>

              <Link
                href="/test-queries"
                style={{
                  color: isActive("/test-queries") ? "#4f46e5" : "#6b7280",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  position: "relative",
                  padding: "4px 0",
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/test-queries")) {
                    e.currentTarget.style.color = "#4f46e5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/test-queries")) {
                    e.currentTarget.style.color = "#6b7280";
                  }
                }}
              >
                Test Queries
                {isActive("/test-queries") && (
                  <div style={{
                    position: "absolute",
                    bottom: -20,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "#4f46e5",
                    borderRadius: 1,
                  }} />
                )}
              </Link>

              <Link
                href="/pricing"
                style={{
                  color: isActive("/pricing") ? "#4f46e5" : "#6b7280",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  position: "relative",
                  padding: "4px 0",
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/pricing")) {
                    e.currentTarget.style.color = "#4f46e5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/pricing")) {
                    e.currentTarget.style.color = "#6b7280";
                  }
                }}
              >
                Pricing
                {isActive("/pricing") && (
                  <div style={{
                    position: "absolute",
                    bottom: -20,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "#4f46e5",
                    borderRadius: 1,
                  }} />
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Right Section - User Info */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}>
          {isLoaded ? (
            isSignedIn ? (
              <>
                {/* Plan Badge */}
                {getPlanBadge()}

                {/* User Info */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}>
                  <div style={{
                    textAlign: "right",
                    display: "none",
                    "@media (min-width: 640px)": {
                      display: "block",
                    },
                  }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#1f2937",
                    }}>
                      {user?.firstName || user?.username || "User"}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: "#6b7280",
                    }}>
                      {user?.primaryEmailAddress?.emailAddress}
                    </div>
                  </div>

                  {/* User Button */}
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: {
                          width: 36,
                          height: 36,
                        },
                      },
                    }}
                  />
                </div>
              </>
            ) : (
              <SignInButton mode="modal">
                <button style={{
                  padding: "8px 16px",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#4338ca";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#4f46e5";
                  e.currentTarget.style.transform = "scale(1)";
                }}
                >
                  Sign In
                </button>
              </SignInButton>
            )
          ) : (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#f3f4f6",
              animation: "pulse 1.5s infinite",
            }} />
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </nav>
  );
}
