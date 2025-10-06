import { cn } from "@/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-8 h-8", className)}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--accent))", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path 
        d="M 20 80 C 20 40, 40 20, 50 20 C 60 20, 80 40, 80 80 L 70 80 C 70 50, 60 40, 50 40 C 40 40, 30 50, 30 80 Z"
        stroke="none"
        fill="url(#logo-gradient)"
      />
      <path
        d="M 40 70 A 10 10 0 1 1 60 70 A 10 10 0 1 1 40 70"
        stroke="none"
        fill="url(#logo-gradient)"
      />
    </svg>
  );
}
