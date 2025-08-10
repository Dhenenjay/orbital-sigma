import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface Message {
  id: string;
  type: "user" | "assistant" | "error" | "analyzing";
  content: string;
  timestamp: Date;
  data?: any;
  stage?: "parsing" | "satellite" | "analysis" | "complete";
  progress?: number;
  signals?: Signal[];
}

interface Signal {
  instrument: string;
  direction: "long" | "short" | "neutral";
  confidence: number;
  rationale: string;
  aoiName?: string;
}

export default function NaturalLanguageChat() {
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim() || isLoading) return;
    
    const userQuery = query.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: userQuery,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);
    
    // Add analyzing message with stages
    const analyzingMessage: Message = {
      id: `analyzing-${Date.now()}`,
      type: "analyzing",
      content: "Processing your query...",
      timestamp: new Date(),
      stage: "parsing",
      progress: 0,
    };
    setMessages(prev => [...prev, analyzingMessage]);
    
    try {
      // Update stage: Parsing
      setMessages(prev => prev.map(msg => 
        msg.id === analyzingMessage.id 
          ? { ...msg, content: "🔍 Parsing natural language query...", stage: "parsing", progress: 25 }
          : msg
      ));
      
      // Call the real intelligence API
      const response = await fetch("/api/intelligence/generate-signals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userQuery,
          maxSignals: 5,
          timeWindow: "7d",
        }),
      });

      // Update stage: Satellite Analysis
      setMessages(prev => prev.map(msg => 
        msg.id === analyzingMessage.id 
          ? { ...msg, content: "🛰️ Analyzing satellite imagery...", stage: "satellite", progress: 50 }
          : msg
      ));

      if (!response.ok) {
        throw new Error(`Failed to process query: ${response.status}`);
      }

      const result = await response.json();
      
      // Update stage: AI Analysis
      setMessages(prev => prev.map(msg => 
        msg.id === analyzingMessage.id 
          ? { ...msg, content: "🤖 Generating market intelligence...", stage: "analysis", progress: 75 }
          : msg
      ));

      // Remove analyzing message
      setMessages(prev => prev.filter(msg => msg.id !== analyzingMessage.id));
      
      // Format response
      let responseContent = "";
      
      if (result.success && result.signals && result.signals.length > 0) {
        responseContent = `I've analyzed your query and identified ${result.signals.length} trading signal${result.signals.length > 1 ? 's' : ''}:\n\n`;
        
        result.signals.forEach((signal: any, idx: number) => {
          const directionEmoji = signal.direction === 'long' ? '📈' : signal.direction === 'short' ? '📉' : '➡️';
          const confidenceLevel = signal.confidence > 0.8 ? 'High' : signal.confidence > 0.6 ? 'Medium' : 'Low';
          
          responseContent += `${idx + 1}. ${directionEmoji} **${signal.instrument}** (${signal.direction.toUpperCase()})\n`;
          responseContent += `   Confidence: ${(signal.confidence * 100).toFixed(0)}% (${confidenceLevel})\n`;
          if (signal.aoiName) {
            responseContent += `   Location: ${signal.aoiName}\n`;
          }
          responseContent += `   Rationale: ${signal.rationale}\n\n`;
        });
        
        if (result.metadata) {
          responseContent += `\n📊 Analysis Summary:\n`;
          responseContent += `• AOIs Checked: ${result.metadata.aoisChecked}\n`;
          responseContent += `• Anomalies Detected: ${result.metadata.anomaliesDetected}\n`;
          responseContent += `• Average Confidence: ${(result.metadata.confidence * 100).toFixed(0)}%`;
        }
      } else if (result.message) {
        responseContent = result.message;
      } else {
        responseContent = "No significant signals detected for your query. Try being more specific about locations, commodities, or timeframes.";
      }
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: responseContent,
        timestamp: new Date(),
        data: result.metadata,
        signals: result.signals,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      // Remove analyzing message
      setMessages(prev => prev.filter(msg => msg.type !== "analyzing"));
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "error",
        content: error instanceof Error ? error.message : "Failed to process query. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentStage("");
    }
  };

  const clearChat = () => {
    setMessages([]);
    setQuery("");
  };

  const suggestedQueries = [
    "What's happening at major oil ports in the Middle East?",
    "Show copper mine disruptions in Chile",
    "Are there any farm anomalies affecting wheat prices?",
    "Detect port congestion in Asia that could impact shipping stocks",
    "Find energy infrastructure changes in Texas",
  ];

  const handleSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    if (!isExpanded) setIsExpanded(true);
    inputRef.current?.focus();
  };

  // Format message content with markdown-like styling
  const formatContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      // Bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={idx} className="mb-1">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
            )}
          </div>
        );
      }
      // Headers
      if (line.startsWith('###')) {
        return <h4 key={idx} className="text-sm font-semibold text-white mt-2 mb-1">{line.replace('###', '')}</h4>;
      }
      // Bullet points
      if (line.startsWith('•') || line.startsWith('-')) {
        return <div key={idx} className="ml-2 text-sm">{line}</div>;
      }
      // Regular line
      return line ? <div key={idx} className="text-sm">{line}</div> : <br key={idx} />;
    });
  };

  return (
    <>
      {/* Minimized chat button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center z-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Expanded chat interface */}
      {isExpanded && (
        <div className="fixed bottom-6 right-6 w-[480px] h-[650px] bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-lg">🛰️</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Orbital Intelligence</h3>
                <p className="text-xs text-gray-400">Real-time satellite analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Clear chat"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-6">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm">Ask me about market intelligence</p>
                </div>
                
                {/* Suggested queries */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 mb-2">Try these queries:</p>
                  {suggestedQueries.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestion(suggestion)}
                      className="block w-full text-left px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : message.type === "error"
                      ? "bg-red-900/30 border border-red-800 text-red-400"
                      : message.type === "analyzing"
                      ? "bg-gray-800/50 border border-gray-700 text-gray-300"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {message.type === "analyzing" && (
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm">{message.content}</div>
                        {message.progress !== undefined && (
                          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                              style={{ width: `${message.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {message.type !== "analyzing" && (
                    <div className="text-sm">
                      {typeof message.content === 'string' ? formatContent(message.content) : message.content}
                    </div>
                  )}
                  
                  {/* Display signals as cards if available */}
                  {message.signals && message.signals.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.signals.slice(0, 3).map((signal, idx) => (
                        <div key={idx} className="p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white text-xs">{signal.instrument}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              signal.direction === 'long' ? 'bg-green-500/20 text-green-400' :
                              signal.direction === 'short' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {signal.direction.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Confidence: {(signal.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={userId ? "Ask about market intelligence..." : "Sign in to use AI assistant"}
                disabled={isLoading || !userId}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isLoading || !query.trim() || !userId}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
