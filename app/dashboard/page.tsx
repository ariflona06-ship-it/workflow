import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Image from "next/image";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpModal } from "@/components/help-modal";
import { WelcomeGreeting } from "@/components/dashboard/welcome-greeting";
import { MotivationalQuote } from "@/components/dashboard/motivational-quote";
import { AssignmentsPanel } from "@/components/dashboard/assignments-panel";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const user = session.user;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">WorkFlow</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Theme Toggle and Help */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <HelpModal />
            </div>
            {/* User Info */}
            <div className="flex items-center gap-2">
              {user.image ? (
                <Image
                  src={user.image || "/placeholder.svg"}
                  alt={user.name || "User avatar"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-accent-foreground">
                    {initials}
                  </span>
                </div>
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name || user.email}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="mb-8">
          <WelcomeGreeting userName={user.name?.split(" ")[0] || "there"} />
          <p className="text-muted-foreground">
            Here is what is on your plate. Plan smart, not hard.
          </p>
          <MotivationalQuote />
        </div>

        {/* Assignments Panel */}
        <AssignmentsPanel hasClassroomAccess={!!session.hasClassroomAccess} />
      </main>
    </div>
  );
}
