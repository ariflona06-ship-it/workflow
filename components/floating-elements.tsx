"use client";

export function FloatingElements() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft floating circles */}
      <div
        className="absolute top-20 left-[10%] h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-float-slow"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute top-40 right-[15%] h-48 w-48 rounded-full bg-accent/15 blur-3xl animate-float-medium"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-32 left-[20%] h-56 w-56 rounded-full bg-accent/10 blur-3xl animate-float-slow"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute bottom-20 right-[25%] h-40 w-40 rounded-full bg-primary/5 blur-3xl animate-float-medium"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/10 blur-3xl animate-pulse-soft"
      />
    </div>
  );
}
