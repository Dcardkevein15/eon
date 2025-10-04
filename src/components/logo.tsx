import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-8 h-8", className)}
      stroke="url(#logo-gradient)"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Vertical stem */}
      <path d="M 50 20 V 80" />
      {/* Left arc */}
      <path d="M 25 50 C 25 30, 35 20, 50 20" />
      {/* Right arc */}
      <path d="M 75 50 C 75 30, 65 20, 50 20" />
    </svg>
  );
}
