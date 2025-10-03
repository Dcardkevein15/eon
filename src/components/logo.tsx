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
        fill="url(#logo-gradient)"
        d="M 50,15
           C 25,15 15,35 15,50
           C 15,65 25,85 50,85
           C 75,85 85,65 85,50
           C 85,35 75,15 50,15 Z
           M 50,25
           C 69.33,25 75,40.67 75,50
           C 75,59.33 69.33,75 50,75
           C 30.67,75 25,59.33 25,50
           C 25,40.67 30.67,25 50,25 Z"
      />
    </svg>
  );
}
