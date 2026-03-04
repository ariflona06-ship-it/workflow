"use client";

import React from "react";
import { useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  RefreshCw,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Inbox,
  GraduationCap,
  LayoutGrid,
  List,
  Filter,
  CalendarDays,
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  AssignmentCard,
  priorityTagConfig,
  type Assignment,
  type PriorityTag,
} from "./assignment-card";
import { AddTaskDialog, EditTaskDialog } from "./add-task-dialog";
import { AnnotateDialog, type AnnotationData } from "./annotate-dialog";
import {
  ScheduleWizard,
  type ScheduleType,
  type SchedulePreferences,
  type TaskEstimate,
} from "./schedule-wizard";
import {
  ScheduleDisplay,
  type SavedSchedule,
} from "./schedule-display";

interface ClassroomData {
  courses: Array<{
    id: string;
    name: string;
    section?: string;
    link: string;
  }>;
  assignments: Assignment[];
  error?: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

type FilterTab =
  | "all"
  | "overdue"
  | "due_soon"
  | "upcoming"
  | "submitted"
  | "graded";

type SortMode = "due_date" | "priority";

const tabs: { key: FilterTab; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "overdue", label: "Overdue", icon: AlertTriangle },
  { key: "due_soon", label: "Due Soon", icon: Clock },
  { key: "upcoming", label: "Upcoming", icon: BookOpen },
  { key: "submitted", label: "Done", icon: CheckCircle2 },
  { key: "graded", label: "Graded", icon: GraduationCap },
];

type PriorityFilterTab = "all" | PriorityTag;
const priorityTabs: {
  key: PriorityFilterTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "test_prep", label: "Test Prep", icon: priorityTagConfig.test_prep.icon },
  { key: "project", label: "Project", icon: priorityTagConfig.project.icon },
  { key: "long_term", label: "Long-term", icon: priorityTagConfig.long_term.icon },
  { key: "short_term", label: "Short-term", icon: priorityTagConfig.short_term.icon },
  { key: "personal", label: "Personal", icon: priorityTagConfig.personal.icon },
];

const statusOrder: Record<string, number> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  no_due_date: 3,
  submitted: 4,
  graded: 5,
};

/* ─── localStorage helpers ─── */

const CUSTOM_TASKS_KEY = "workflow-custom-tasks";
const ANNOTATIONS_KEY = "workflow-annotations";


function loadCustomTasks(): Assignment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    if (!raw) return [];
    const tasks: Assignment[] = JSON.parse(raw);
    return tasks.map((t) => {
      if (t.dueDateTime) {
        const due = new Date(t.dueDateTime);
        const now = new Date();
        const diffMs = due.getTime() - now.getTime();
        const diffH = diffMs / (1000 * 60 * 60);
        if (diffMs < 0) t.status = "overdue";
        else if (diffH <= 48) t.status = "due_soon";
        else t.status = "upcoming";
      }
      return t;
    });
  } catch {
    return [];
  }
}

function saveCustomTasks(tasks: Assignment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(tasks));
}

// Annotations are keyed by `courseId::assignmentId`
type AnnotationsMap = Record<
  string,
  { customNote?: string; priorityTag?: PriorityTag }
>;

function loadAnnotations(): AnnotationsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ANNOTATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAnnotations(m: AnnotationsMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(m));
}

function annotationKey(courseId: string, id: string) {
  return `${courseId}::${id}`;
}

/* ─── Component ─── */

export function AssignmentsPanel({
  hasClassroomAccess,
}: {
  hasClassroomAccess: boolean;
}) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [activePriorityTab, setActivePriorityTab] =
    useState<PriorityFilterTab>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<SortMode>("due_date");
  const [hideCompleted, setHideCompleted] = useState(true);
  const [customTasks, setCustomTasks] = useState<Assignment[]>(() =>
    loadCustomTasks()
  );
  const [annotations, setAnnotations] = useState<AnnotationsMap>(() =>
    loadAnnotations()
  );

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<{
    overdue: boolean;
    dueSoon: boolean;
    upcoming: boolean;
    completed: boolean;
  }>({
    overdue: false,
    dueSoon: false,
    upcoming: false,
    completed: false,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Edit dialog state
  const [editingTask, setEditingTask] = useState<Assignment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Annotate dialog state
  const [annotatingAssignment, setAnnotatingAssignment] =
    useState<Assignment | null>(null);
  const [annotateDialogOpen, setAnnotateDialogOpen] = useState(false);

  // Schedule state -- backed by Neon DB via SWR
  const {
    data: scheduleResponse,
    mutate: mutateSchedule,
  } = useSWR<{ schedule: SavedSchedule | null }>(
    "/api/schedule",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const schedule = scheduleResponse?.schedule ?? null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastPreferences, setLastPreferences] =
    useState<SchedulePreferences | null>(null);
  const [lastScheduleType, setLastScheduleType] =
    useState<ScheduleType>("week");

  // Ref to hold latest assignments for use inside callbacks
  const allAssignmentsRef = useRef<Assignment[]>([]);

  const { data, error, isLoading, mutate } = useSWR<ClassroomData>(
    hasClassroomAccess ? "/api/classroom/assignments" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  /* ─── Custom task handlers ─── */

  const handleAddTask = useCallback((task: Assignment) => {
    setCustomTasks((prev) => {
      const next = [task, ...prev];
      saveCustomTasks(next);
      return next;
    });
  }, []);

  const handleDeleteTask = useCallback((id: string) => {
    setCustomTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveCustomTasks(next);
      return next;
    });
  }, []);

  const handleEditTask = useCallback((assignment: Assignment) => {
    setEditingTask(assignment);
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback((updated: Assignment) => {
    setCustomTasks((prev) => {
      const next = prev.map((t) => (t.id === updated.id ? updated : t));
      saveCustomTasks(next);
      return next;
    });
    setEditingTask(null);
  }, []);

  const handleMarkDone = useCallback((id: string) => {
    setCustomTasks((prev) => {
      const next = prev.map((t) => 
        t.id === id ? { ...t, status: "submitted" as const } : t
      );
      saveCustomTasks(next);
      return next;
    });
  }, []);

  /* ─── Annotation handlers ─── */

  const handleAnnotate = useCallback((assignment: Assignment) => {
    setAnnotatingAssignment(assignment);
    setAnnotateDialogOpen(true);
  }, []);

  const handleSaveAnnotation = useCallback(
    (data: AnnotationData) => {
      setAnnotations((prev) => {
        const key = annotationKey(data.courseId, data.assignmentId);
        const next = { ...prev };
        if (!data.customNote && !data.priorityTag) {
          delete next[key];
        } else {
          next[key] = {
            customNote: data.customNote,
            priorityTag: data.priorityTag,
          };
        }
        saveAnnotations(next);
        return next;
      });
    },
    []
  );

  /* ─── Schedule handlers ─── */

  const handleGenerateSchedule = useCallback(
    async (
      scheduleType: ScheduleType,
      preferences: SchedulePreferences,
      taskEstimates: TaskEstimate[]
    ) => {
      setIsGenerating(true);
      setLastPreferences(preferences);
      setLastScheduleType(scheduleType);
      try {
        // start with existing assignments
      const assignmentPayload = allAssignmentsRef.current.map((a) => {
          const est = taskEstimates.find((t) => t.id === a.id);
          return {
            title: a.title,
            dueDate: a.dueDate,
            priorityTag: a.priorityTag || null,
            courseName: a.courseName,
            estimatedMinutes: est?.estimatedMinutes || null,
            status: a.status,
          };
        });

      // include any custom tasks the user added only in the wizard
      taskEstimates.forEach((t) => {
        // we use custom- prefix for wizard-only tasks
        if (t.id.startsWith("custom-") &&
            !allAssignmentsRef.current.find((a) => a.id === t.id)) {
          assignmentPayload.push({
            title: t.title,
            dueDate: null,
            priorityTag: null,
            courseName: "Custom",
            estimatedMinutes: t.estimatedMinutes || null,
            status: "upcoming",
          });

          // also persist this task so it shows up in the list
          setCustomTasks((prev) => {
            const exists = prev.find((x) => x.id === t.id);
            if (exists) return prev;
            const newTask: Assignment = {
              id: t.id,
              courseId: "custom",
              courseName: "Custom",
              title: t.title,
              description: "",
              dueDate: null,
              dueDateTime: null,
              maxPoints: null,
              workType: "",
              link: "",
              createdAt: new Date().toISOString(),
              status: "upcoming",
              isCustom: true,
            };
            const next = [newTask, ...prev];
            saveCustomTasks(next);
            return next;
          });
        }
      });

        const res = await fetch("/api/schedule/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignments: assignmentPayload,
            preferences,
            scheduleType,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to generate");
        }

        const responseData = await res.json();
        if (responseData.schedule) {
          // Optimistically update SWR cache, then revalidate from DB
          mutateSchedule({ schedule: responseData.schedule }, false);
        }
      } catch (err) {
        console.error("Schedule generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [mutateSchedule]
  );

  const handleRegenerateSchedule = useCallback(() => {
    if (lastPreferences) {
      const activeTasks = allAssignmentsRef.current
        .filter((a) => a.status !== "submitted" && a.status !== "graded")
        .map((a) => ({
          id: a.id,
          title: a.title,
          estimatedMinutes: 30 as number | null,
        }));
      handleGenerateSchedule(lastScheduleType, lastPreferences, activeTasks);
    }
  }, [lastPreferences, lastScheduleType, handleGenerateSchedule]);

  const handleClearSchedule = useCallback(async () => {
    // Optimistically clear, then call DELETE
    mutateSchedule({ schedule: null }, false);
    try {
      await fetch("/api/schedule", { method: "DELETE" });
      mutateSchedule();
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  }, [mutateSchedule]);

  // Apply annotations to classroom assignments
  function applyAnnotations(assignments: Assignment[]): Assignment[] {
    return assignments.map((a) => {
      const key = annotationKey(a.courseId, a.id);
      const ann = annotations[key];
      if (!ann) return a;
      return {
        ...a,
        customNote: ann.customNote,
        priorityTag: ann.priorityTag,
      };
    });
  }

  // ─── Render states ───

  if (!hasClassroomAccess && customTasks.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-end gap-2">
          <ScheduleWizard
            assignments={[]}
            onGenerate={handleGenerateSchedule}
            isGenerating={isGenerating}
          />
          <AddTaskDialog onAdd={handleAddTask} />
        </div>
        {schedule && (
          <ScheduleDisplay
            schedule={schedule}
            onRegenerate={handleRegenerateSchedule}
            onClear={handleClearSchedule}
            isRegenerating={isGenerating}
          />
        )}
        <Card className="bg-accent/5 border-accent/20 border-dashed">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Connect Google Classroom
              </h3>
              <p className="text-muted-foreground mb-6 text-sm max-w-md mx-auto leading-relaxed">
                Sign in with your Google account to sync your courses and
                assignments. You can also add custom tasks above!
              </p>
              <Button
                onClick={() => signIn("google")}
                className="bg-primary text-primary-foreground"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Connect Google Classroom
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && customTasks.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <AddTaskDialog onAdd={handleAddTask} />
        </div>
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Fetching your assignments from Google Classroom...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((error || data?.error) && customTasks.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <AddTaskDialog onAdd={handleAddTask} />
        </div>
        <Card className="border-destructive/30">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">
                Could not load assignments
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {data?.error ||
                  "Something went wrong. Make sure the Google Classroom API is enabled in your Google Cloud Console."}
              </p>
              <div className="flex items-center gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => mutate()}
                  className="bg-transparent"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  onClick={() => signIn("google")}
                  className="bg-primary text-primary-foreground"
                >
                  Re-sign in
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courses = data?.courses || [];
  const classroomAssignments = applyAnnotations(data?.assignments || []);

  // Merge classroom + custom tasks
  const allAssignments = [...classroomAssignments, ...customTasks];

  // Keep ref in sync
  allAssignmentsRef.current = allAssignments;

  // Sorting
  function sortByDueDate(list: Assignment[]): Assignment[] {
    return [...list].sort((a, b) => {
      const sa = statusOrder[a.status] ?? 3;
      const sb = statusOrder[b.status] ?? 3;
      if (sa !== sb) return sa - sb;
      if (a.dueDateTime && b.dueDateTime) {
        return (
          new Date(a.dueDateTime).getTime() -
          new Date(b.dueDateTime).getTime()
        );
      }
      if (a.dueDateTime) return -1;
      if (b.dueDateTime) return 1;
      return 0;
    });
  }

  function sortByPriority(list: Assignment[]): Assignment[] {
    return [...list].sort((a, b) => {
      const pa = a.priorityTag
        ? priorityTagConfig[a.priorityTag].order
        : 99;
      const pb = b.priorityTag
        ? priorityTagConfig[b.priorityTag].order
        : 99;
      if (pa !== pb) return pa - pb;
      const sa = statusOrder[a.status] ?? 3;
      const sb = statusOrder[b.status] ?? 3;
      if (sa !== sb) return sa - sb;
      if (a.dueDateTime && b.dueDateTime) {
        return (
          new Date(a.dueDateTime).getTime() -
          new Date(b.dueDateTime).getTime()
        );
      }
      return 0;
    });
  }

  // Filter
  let filtered = allAssignments;

  if (sortMode === "due_date") {
    if (activeTab !== "all") {
      filtered = filtered.filter((a) => a.status === activeTab);
    }
  } else {
    if (activePriorityTab !== "all") {
      filtered = filtered.filter(
        (a) => a.priorityTag === activePriorityTab
      );
    }
  }

  if (selectedCourse !== "all") {
    if (selectedCourse === "custom") {
      filtered = filtered.filter((a) => a.isCustom);
    } else {
      filtered = filtered.filter((a) => a.courseId === selectedCourse);
    }
  }

  filtered =
    sortMode === "due_date"
      ? sortByDueDate(filtered)
      : sortByPriority(filtered);

  // Hide completed assignments if toggled
  if (hideCompleted) {
    filtered = filtered.filter(
      (a) => a.status !== "submitted" && a.status !== "graded"
    );
  }

  // Stats
  const overdueCount = allAssignments.filter(
    (a) => a.status === "overdue"
  ).length;
  const dueSoonCount = allAssignments.filter(
    (a) => a.status === "due_soon"
  ).length;
  const upcomingCount = allAssignments.filter(
    (a) => a.status === "upcoming" || a.status === "no_due_date"
  ).length;
  const doneCount = allAssignments.filter(
    (a) => a.status === "submitted" || a.status === "graded"
  ).length;

  function getPriorityTabCount(key: PriorityFilterTab): number {
    if (key === "all") return allAssignments.length;
    return allAssignments.filter((a) => a.priorityTag === key).length;
  }

  function getDueDateTabCount(key: FilterTab): number {
    if (key === "all") return allAssignments.length;
    return allAssignments.filter((a) =>
      key === "submitted" ? a.status === "submitted" : a.status === key
    ).length;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Overdue"
          count={overdueCount}
          icon={AlertTriangle}
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          label="Due Soon"
          count={dueSoonCount}
          icon={Clock}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          label="Upcoming"
          count={upcomingCount}
          icon={BookOpen}
          color="text-sky-600"
          bgColor="bg-sky-50"
        />
        <StatCard
          label="Completed"
          count={doneCount}
          icon={CheckCircle2}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
      </div>

      {/* Generated Schedule -- always visible right after stats */}
      {schedule && (
        <ScheduleDisplay
          schedule={schedule}
          onRegenerate={handleRegenerateSchedule}
          onClear={handleClearSchedule}
          isRegenerating={isGenerating}
        />
      )}

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Your Assignments</CardTitle>
              <CardDescription>
                {allAssignments.length} total
                {courses.length > 0 &&
                  ` across ${courses.length} course${courses.length > 1 ? "s" : ""}`}
                {customTasks.length > 0 &&
                  ` + ${customTasks.length} custom task${customTasks.length > 1 ? "s" : ""}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort toggle */}
              <div className="flex items-center bg-secondary rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSortMode("due_date");
                    setActivePriorityTab("all");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    sortMode === "due_date"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Due Date
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortMode("priority");
                    setActiveTab("all");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    sortMode === "priority"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Priority
                </button>
              </div>

              {/* Course filter */}
              {(courses.length > 1 || customTasks.length > 0) && (
                <div className="relative">
                  <Filter className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="text-xs bg-secondary text-secondary-foreground border border-border rounded-md pl-7 pr-3 py-1.5 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All sources</option>
                    {customTasks.length > 0 && (
                      <option value="custom">Custom Tasks</option>
                    )}
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* View toggle */}
              <div className="flex items-center bg-secondary rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Hide/Show completed toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHideCompleted(!hideCompleted)}
                className="text-xs bg-transparent gap-1.5"
                title={hideCompleted ? "Show completed assignments" : "Hide completed assignments"}
              >
                {hideCompleted ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Show Done (0)
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide Done ({doneCount})
                  </>
                )}
              </Button>

              {/* Refresh */}
              {hasClassroomAccess && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutate()}
                  className="text-xs bg-transparent"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh
                </Button>
              )}

              {/* Schedule Wizard */}
              <ScheduleWizard
                assignments={allAssignments}
                onGenerate={handleGenerateSchedule}
                isGenerating={isGenerating}
              />

              {/* Add Task */}
              <AddTaskDialog onAdd={handleAddTask} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab filters */}
          <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
            {sortMode === "due_date"
              ? tabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const count = getDueDateTabCount(tab.key);
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                        activeTab === tab.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <TabIcon className="h-3.5 w-3.5" />
                      {tab.label}
                      <span
                        className={`ml-0.5 text-[10px] ${
                          activeTab === tab.key
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })
              : priorityTabs.map((tab) => {
                  const TabIcon = tab.icon;
                  const count = getPriorityTabCount(tab.key);
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActivePriorityTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                        activePriorityTab === tab.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      <TabIcon className="h-3.5 w-3.5" />
                      {tab.label}
                      <span
                        className={`ml-0.5 text-[10px] ${
                          activePriorityTab === tab.key
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
          </div>

          {/* Assignments grid / list */}
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {sortMode === "priority" && activePriorityTab !== "all"
                  ? `No tasks with the "${priorityTabs.find((t) => t.key === activePriorityTab)?.label}" tag. Add one with the + button above!`
                  : "No assignments match this filter."}
              </p>
            </div>
          ) : (
            <>
              {/** section helper */}
              {(() => {
                const overdue = filtered.filter((a) => a.status === "overdue");
                const dueSoon = filtered.filter((a) => a.status === "due_soon");
                const upcoming = filtered.filter(
                  (a) => a.status === "upcoming" || a.status === "no_due_date"
                );
                const completed = filtered.filter(
                  (a) => a.status === "submitted" || a.status === "graded"
                );

                const renderSection = (
                  title: string,
                  items: Assignment[],
                  sectionKey: keyof typeof collapsedSections
                ) => (
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionKey)}
                      className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                    >
                      {collapsedSections[sectionKey] ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                      <h3 className="text-lg font-semibold">
                        {title} {items.length > 0 && <>({items.length})</>}
                      </h3>
                    </button>
                    {!collapsedSections[sectionKey] && (
                      <div className="mt-3">
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            None
                          </p>
                        ) : (
                          <div
                            className={
                              viewMode === "grid"
                                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                                : "flex flex-col gap-3"
                            }
                          >
                            {items.map((assignment) => (
                              <AssignmentCard
                                key={`${assignment.courseId}-${assignment.id}`}
                                assignment={assignment}
                                onDelete={
                                  assignment.isCustom ? handleDeleteTask : undefined
                                }
                                onEdit={
                                  assignment.isCustom ? handleEditTask : undefined
                                }
                                onAnnotate={!assignment.isCustom ? handleAnnotate : undefined}
                                onMarkDone={
                                  assignment.isCustom ? handleMarkDone : undefined
                                }
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );

                return (
                  <> 
                    {renderSection("Overdue", overdue, "overdue")}
                    {renderSection("Due Soon", dueSoon, "dueSoon")}
                    {renderSection("Upcoming", upcoming, "upcoming")}
                    {!hideCompleted && renderSection("Completed", completed, "completed")}
                  </>
                );
              })()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTask && (
        <EditTaskDialog
          assignment={editingTask}
          open={editDialogOpen}
          onOpenChange={(v) => {
            setEditDialogOpen(v);
            if (!v) setEditingTask(null);
          }}
          onSave={handleSaveEdit}
        />
      )}

      {/* Annotate Dialog */}
      {annotatingAssignment && (
        <AnnotateDialog
          assignment={annotatingAssignment}
          open={annotateDialogOpen}
          onOpenChange={(v) => {
            setAnnotateDialogOpen(v);
            if (!v) setAnnotatingAssignment(null);
          }}
          onSave={handleSaveAnnotation}
        />
      )}

    </div>
  );
}

function StatCard({
  label,
  count,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}
        >
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">
            {count}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
