"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  Calendar,
  CalendarRange,
  CalendarDays,
  Plus,
  X,
  RotateCcw,
} from "lucide-react";
import type { Assignment } from "./assignment-card";

export type ScheduleType = "day" | "week" | "month";

export interface SchedulePreferences {
  homeworkStartTime: string;
  homeworkEndTime: string;
  breakDuration: number;
  studySessionLength: number;
  daysAvailable: string[];
  additionalNotes: string;
}

export interface TaskEstimate {
  id: string;
  title: string;
  estimatedMinutes: number | null;
}

interface ScheduleWizardProps {
  assignments: Assignment[];
  onGenerate: (
    scheduleType: ScheduleType,
    preferences: SchedulePreferences,
    taskEstimates: TaskEstimate[]
  ) => Promise<void>;
  isGenerating: boolean;
}

const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function ScheduleWizard({
  assignments,
  onGenerate,
  isGenerating,
}: ScheduleWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("week");

  const [preferences, setPreferences] = useState<SchedulePreferences>({
    homeworkStartTime: "16:00",
    homeworkEndTime: "21:00",
    breakDuration: 10,
    studySessionLength: 45,
    daysAvailable: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    additionalNotes: "",
  });

  const activeTasks = assignments.filter(
    (a) => a.status !== "submitted" && a.status !== "graded"
  );

  const [taskEstimates, setTaskEstimates] = useState<TaskEstimate[]>(() =>
    activeTasks.map((a) => ({
      id: a.id,
      title: a.title,
      estimatedMinutes: 30,
    }))
  );

  const [previousTaskEstimates, setPreviousTaskEstimates] = useState<TaskEstimate[]>(() =>
    activeTasks.map((a) => ({
      id: a.id,
      title: a.title,
      estimatedMinutes: 30,
    }))
  );

  const [newTaskInput, setNewTaskInput] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(30);

  // Keep estimates in sync when dialog opens
  const handleOpen = useCallback(() => {
    const fresh = assignments
      .filter((a) => a.status !== "submitted" && a.status !== "graded")
      .map((a) => ({
        id: a.id,
        title: a.title,
        estimatedMinutes: 30,
      }));
    setTaskEstimates(fresh);
    setPreviousTaskEstimates(fresh);
    setStep(0);
    setOpen(true);
  }, [assignments]);

  const handleGenerate = async () => {
    await onGenerate(scheduleType, preferences, taskEstimates);
    setOpen(false);
  };

  const toggleDay = (day: string) => {
    setPreferences((prev) => ({
      ...prev,
      daysAvailable: prev.daysAvailable.includes(day)
        ? prev.daysAvailable.filter((d) => d !== day)
        : [...prev.daysAvailable, day],
    }));
  };

  const updateEstimate = (id: string, minutes: number) => {
    setPreviousTaskEstimates(taskEstimates);
    setTaskEstimates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estimatedMinutes: minutes } : t))
    );
  };

  const addTaskEstimate = () => {
    if (newTaskInput.trim()) {
      setPreviousTaskEstimates(taskEstimates);
      setTaskEstimates((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}`,
          title: newTaskInput.trim(),
          estimatedMinutes: newTaskDuration || 30,
        },
      ]);
      setNewTaskInput("");
      setNewTaskDuration(30);
    }
  };

  const removeTaskEstimate = (id: string) => {
    setPreviousTaskEstimates(taskEstimates);
    setTaskEstimates((prev) => prev.filter((t) => t.id !== id));
  };

  const undoLastAction = () => {
    setTaskEstimates(previousTaskEstimates);
  };
  
  const canUndo = JSON.stringify(taskEstimates) !== JSON.stringify(previousTaskEstimates);

  const totalSteps = activeTasks.length > 0 ? 3 : 2;

  return (
    <>
      <Button
        onClick={handleOpen}
        className="bg-accent text-accent-foreground hover:bg-accent/90"
        size="sm"
      >
        <Sparkles className="h-4 w-4 mr-1.5" />
        Generate Schedule
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {step === 0 && "Choose Schedule Type"}
              {step === 1 && "Your Study Preferences"}
              {step === 2 && "Estimate Task Durations"}
            </DialogTitle>
            <DialogDescription>
              {step === 0 && "How far ahead would you like to plan?"}
              {step === 1 && "Help the AI understand your study habits."}
              {step === 2 &&
                "Roughly how long will each task take? This helps create a realistic schedule."}
            </DialogDescription>
          </DialogHeader>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-accent"
                    : i < step
                      ? "w-1.5 bg-accent/50"
                      : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Step 0: Schedule type */}
          {step === 0 && (
            <div className="grid grid-cols-3 gap-3 py-2">
              {(
                [
                  {
                    key: "day" as ScheduleType,
                    label: "Today",
                    desc: "Plan for today",
                    icon: CalendarDays,
                  },
                  {
                    key: "week" as ScheduleType,
                    label: "This Week",
                    desc: "7-day plan",
                    icon: CalendarRange,
                  },
                  {
                    key: "month" as ScheduleType,
                    label: "Next 2 Weeks",
                    desc: "14-day plan",
                    icon: Calendar,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScheduleType(opt.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      scheduleType === opt.key
                        ? "border-accent bg-accent/5 shadow-sm"
                        : "border-border hover:border-accent/30"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${scheduleType === opt.key ? "text-accent" : "text-muted-foreground"}`}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Preferences */}
          {step === 1 && (
            <div className="flex flex-col gap-5 py-2">
              {/* Study window */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
                  When do you usually do homework?
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Start
                    </Label>
                    <Input
                      type="time"
                      value={preferences.homeworkStartTime}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          homeworkStartTime: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">to</span>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <Input
                      type="time"
                      value={preferences.homeworkEndTime}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          homeworkEndTime: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Session length + break */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">
                    Study session length
                  </Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      type="number"
                      min={15}
                      max={120}
                      value={preferences.studySessionLength}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          studySessionLength: Number(e.target.value),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium">Break between</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      type="number"
                      min={5}
                      max={30}
                      value={preferences.breakDuration}
                      onChange={(e) =>
                        setPreferences((p) => ({
                          ...p,
                          breakDuration: Number(e.target.value),
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                </div>
              </div>

              {/* Days available */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
                  Which days are you available?
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        preferences.daysAvailable.includes(day)
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional notes */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium">
                  Anything else the AI should know?
                </Label>
                <textarea
                  value={preferences.additionalNotes}
                  onChange={(e) =>
                    setPreferences((p) => ({
                      ...p,
                      additionalNotes: e.target.value,
                    }))
                  }
                  placeholder="e.g. I have soccer practice on Wednesdays, I prefer studying math in the morning..."
                  className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}

          {/* Step 2: Task estimates */}
          {step === 2 && activeTasks.length > 0 && (
            <div className="flex flex-col gap-3 py-2">
              {/* Undo button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undoLastAction}
                  disabled={!canUndo}
                  className="text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Undo
                </Button>
              </div>

              {/* Existing tasks list */}
              <div className="flex flex-col gap-2 max-h-[32vh] overflow-y-auto pr-2">
                {taskEstimates.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-secondary/50 group w-full"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground break-words">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        value={task.estimatedMinutes || ""}
                        onChange={(e) =>
                          updateEstimate(task.id, Number(e.target.value))
                        }
                        className="w-14 h-7 text-xs text-center shrink-0"
                      />
                      <span className="text-[11px] text-muted-foreground shrink-0 w-6">
                        min
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTaskEstimate(task.id)}
                        className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new task */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Label className="text-sm font-medium">
                  Add a new task
                </Label>
                <div className="flex flex-col gap-2">
                  <Input
                    placeholder="Task name (e.g., Study for quiz)"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        addTaskEstimate();
                      }
                    }}
                    className="text-sm"
                  />
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">
                        Duration (minutes)
                      </Label>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        value={newTaskDuration}
                        onChange={(e) =>
                          setNewTaskDuration(Number(e.target.value))
                        }
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addTaskEstimate}
                      disabled={!newTaskInput.trim()}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="bg-transparent"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>

            {step < totalSteps - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={
                  isGenerating || preferences.daysAvailable.length === 0
                }
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate Schedule
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
