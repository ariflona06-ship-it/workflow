import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is already logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main 
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/newflower.jpg')",
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content Container with semi-transparent backdrop */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-md rounded-3xl px-8 md:px-12 py-12 md:py-16 max-w-md border border-white/20 dark:border-white/10 shadow-2xl flex flex-col items-center">
          {/* Logo/Brand */}
          <div className="mb-6 animate-fade-in">
            <span className="text-sm font-medium tracking-widest uppercase text-white/80">
              ✨ Student Planner
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4 text-balance">
            WorkFlow
          </h1>

          {/* Slogan */}
          <p className="text-lg md:text-xl text-white/90 mb-10 leading-relaxed">
            Plan your study time without burning out!
          </p>

          <div className="w-full flex justify-center">
            <GoogleSignInButton />
          </div>

          {/* Subtext */}
          <p className="mt-6 text-sm text-white/70">
            Connect with Google Classroom to get started
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-center z-10">
        <p className="text-sm text-white/60 font-medium">
          ✨ Your assignments, beautifully organized
        </p>
      </footer>
    </main>
  );
}

