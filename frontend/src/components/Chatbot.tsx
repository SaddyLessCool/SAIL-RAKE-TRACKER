import { useState, useRef, useEffect } from "react";
import { X, Send, User, Loader2, Sparkles, Menu, Minus, Maximize2 } from "lucide-react";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "bot";
  content: string;
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "### Hello! I'm RakeAssist AI. \nHow can I help you optimize your logistics data today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dragging Logic
  const [hasMoved, setHasMoved] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Allow dragging from the floating bubble even if it's a button
    const isFloatingBubble = target.closest(".floating-bubble-trigger");
    
    if (!isFloatingBubble && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.closest("button"))) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX + position.x,
      y: e.clientY + position.y,
    });
  };

  const toggleChat = (e: React.MouseEvent) => {
    if (hasMoved) return;
    setIsOpen(!isOpen);
    setIsMinimized(false); // Reset minimize when reopening
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = dragStart.x - e.clientX;
      const newY = dragStart.y - e.clientY;
      
      if (Math.abs(newX - position.x) > 2 || Math.abs(newY - position.y) > 2) {
        setHasMoved(true);
      }
      
      // Strict Viewport Boundaries
      const chatWidth = isOpen ? (isMinimized ? 280 : 330) : 56;
      const chatHeight = isOpen ? (isMinimized ? 72 : 480) : 56;
      
      // Increased left boundary by 280px to prevent overlapping with the sidebar
      const maxX = Math.max(10, window.innerWidth - chatWidth - 280);
      const maxY = Math.max(10, window.innerHeight - chatHeight - 10);
      
      setPosition({
        x: Math.min(Math.max(newX, 10), maxX),
        y: Math.min(Math.max(newY, 10), maxY),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await api.chat(userMsg);
      setMessages(prev => [...prev, { role: "bot", content: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "bot", content: `**Error:** ${error.message}. Please check your connection.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed z-50 select-none touch-none"
      style={{ right: position.x, bottom: position.y }}
    >
      {/* Premium Floating Bubble */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          onMouseDown={handleMouseDown}
          className="group relative flex h-14 w-14 items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing floating-bubble-trigger"
          aria-label="Open Chat"
        >
          {/* Hover Tooltip Label */}
          <div className="absolute right-[120%] top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 text-foreground text-xs font-bold whitespace-nowrap shadow-xl opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 pointer-events-none">
            Need help? Chat with AI
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 rotate-45 bg-card/80 border-t border-r border-border/50"></div>
          </div>

          {/* Animated Glow Rings */}
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse blur-xl group-hover:bg-primary/50 transition-all duration-500"></div>
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20 group-hover:hidden"></div>
          
          {/* Themed Icon Container */}
          <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/90 shadow-[0_10px_30px_-5px_rgba(var(--primary-rgb),0.5)] border border-white/30 overflow-hidden animate-heartbeat">
            <img 
              src="/chat-icon.png" 
              alt="Chat" 
              className="h-7 w-7 object-contain brightness-0 invert opacity-95 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300" 
            />
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
            {/* Glass Shine */}
            <div className="absolute -left-[100%] top-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-1000 ease-in-out"></div>
          </div>
        </button>
      )}

      {/* Modern Compact Chat Window */}
      {isOpen && (
        <div 
          onMouseDown={handleMouseDown}
          className={`flex ${isMinimized ? "h-[72px] w-[280px]" : "h-[480px] w-[330px]"} flex-col overflow-hidden rounded-[2.5rem] border border-border/50 bg-card/90 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-8 fade-in duration-500 ring-1 ring-white/10 cursor-default active:cursor-grabbing transition-all duration-300`}
        >
          
          {/* Header (Drag Handle) */}
          <div 
            className="flex items-center justify-between bg-gradient-to-b from-primary/10 to-transparent p-4 pb-2"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 backdrop-blur-md border border-primary/20 shadow-sm overflow-hidden group/avatar">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card shadow-sm"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-foreground/90">RakeAssist AI</h3>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="rounded-full p-2 hover:bg-muted/80 transition-colors group"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground" /> : <Minus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="rounded-full p-2.5 hover:bg-muted/80 transition-colors group"
              >
                <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 space-y-5 scroll-smooth custom-scrollbar"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar Icon */}
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm mt-0.5 overflow-hidden ${
                  m.role === "user" ? "bg-background border-border text-foreground" : "bg-primary/10 border-primary/20"
                }`}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                </div>
                
                {/* Bubble */}
                <div
                  className={`relative max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm text-[13px] leading-relaxed transition-all ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-secondary/60 text-secondary-foreground border border-border/20 rounded-tl-none"
                  }`}
                >
                  <ReactMarkdown 
                    className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:leading-relaxed prose-strong:text-inherit"
                    components={{
                      h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-0.5 my-2" {...props} />,
                      li: ({node, ...props}) => <li className="my-0.5" {...props} />
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5 flex-row">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-border/30">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                </div>
                <div className="bg-secondary/40 border border-border/20 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-5 pt-0">
            <div className="relative flex items-center group">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask RakeAssist..."
                className="w-full bg-muted/40 border border-border/40 rounded-[1.5rem] pl-4 pr-11 py-3 text-[13px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50 shadow-inner"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="absolute right-1.5 h-8 w-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-center mt-3 text-muted-foreground/40 font-bold uppercase tracking-[0.1em]">
              Real-time Rake Logistics Suite
            </p>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}
