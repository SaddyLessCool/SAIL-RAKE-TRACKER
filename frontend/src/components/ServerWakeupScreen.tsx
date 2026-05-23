import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Train, ShieldAlert, Wifi } from "lucide-react";

const LOTTIE_URL = "/loading-animation.json";

const ENGAGING_HINTS = [
  "Waking up the cloud server database...",
  "Initializing the SAIL railway analytics engine...",
  "Coupling virtual locomotives & scheduling rakes...",
  "Verifying stabled-hours calculation rules...",
  "Loading standard operating division coordinates (ADRA, CKR, WAT)...",
  "Checking for delayed loading and unloading events...",
  "Applying timezone offsets for Indian Standard Time (IST)...",
  "Almost there! Establishing secure API handshake..."
];

export function ServerWakeupScreen() {
  const [seconds, setSeconds] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [slowWakeup, setSlowWakeup] = useState(false);

  // Seconds counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s > 25) setSlowWakeup(true);
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate hints
  useEffect(() => {
    const hintTimer = setInterval(() => {
      setHintIndex((i) => (i + 1) % ENGAGING_HINTS.length);
    }, 4500);
    return () => clearInterval(hintTimer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-foreground select-none overflow-hidden animate-fade-in-up">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative flex flex-col items-center max-w-lg text-center z-10 space-y-6">

        {/* Logo badge */}
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-1.5 shadow-md-soft">
          <Train className="h-4 w-4 text-primary animate-heartbeat dark:text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            SAIL Rake Tracker
          </span>
        </div>

        {/* Lottie animation */}
        <div className="w-52 h-52 flex items-center justify-center">
          <DotLottieReact
            src={LOTTIE_URL}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Booting Cloud Servers
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Our backend service is waking up on the free cloud tier. This requires starting containers and initializing libraries.
          </p>
        </div>

        {/* Status card */}
        <div className="w-full max-w-sm rounded-xl border border-border bg-card/40 backdrop-blur p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Wifi className="h-3.5 w-3.5 text-primary animate-pulse dark:text-accent" />
              Initializing API connection...
            </span>
            <span className="font-mono bg-muted/60 dark:bg-muted/10 px-2 py-0.5 rounded text-[11px] font-bold text-foreground">
              {seconds}s elapsed
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-primary dark:bg-accent rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(98, (seconds / 45) * 100)}%` }}
            />
          </div>

          {/* Rotating hint */}
          <p className="text-[11px] font-medium text-primary dark:text-accent/90 truncate">
            {ENGAGING_HINTS[hintIndex]}
          </p>
        </div>

        {/* Slow wakeup warning */}
        {slowWakeup && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[11px] text-warning/90 leading-relaxed font-medium">
              Free tiers usually take 30–50 seconds to complete cold starts. If it fails, check your network connection or update the backend URL in the ⚙️ Settings top-right.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
