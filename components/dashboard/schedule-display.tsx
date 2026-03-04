"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  BookOpen,
  FlaskConical,
  FolderKanban,
  User,
  Sparkles,
  CalendarDays,
  Edit2,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
} from "lucide-react";

export interface ScheduleBlock {
  time: string;
  endTime: string;
  taskTitle: string;
  taskType: string;
  notes: string | null;
  priority: string | null;
}

export interface DaySchedule {
  date: string;
  dayLabel: string;
  blocks: ScheduleBlock[];
}

export interface ScheduleData {
  title: string;
  summary: string;
  days: DaySchedule[];
}

export interface SavedSchedule {
  id: number;
  scheduleType: string;
  data: ScheduleData;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  study: {
    icon: BookOpen,
    color: "text-sky-600 dark:text-sky-300",
    bg: "bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800",
  },
  break: {
    icon: Coffee,
    color: "text-emerald-600 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800",
  },
  review: {
    icon: FlaskConical,
    color: "text-amber-600 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
  },
  "project-work": {
    icon: FolderKanban,
    color: "text-orange-600 dark:text-orange-300",
    bg: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
  },
  personal: {
    icon: User,
    color: "text-purple-600 dark:text-purple-300",
    bg: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
  },
};

function getTypeConfig(type: string) {
  return (
    typeConfig[type] || {
      icon: BookOpen,
      color: "text-sky-700",
      bg: "bg-sky-50 border-sky-200",
    }
  );
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

interface ScheduleDisplayProps {
  schedule: SavedSchedule;
  onRegenerate: () => void;
  onClear: () => void;
  isRegenerating: boolean;
}

export function ScheduleDisplay({
  schedule,
  onRegenerate,
  onClear,
  isRegenerating,
}: ScheduleDisplayProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState<ScheduleData>(schedule.data);
  const [collapsed, setCollapsed] = useState(false);

  // reset collapse when a new schedule is loaded
  React.useEffect(() => {
    setCollapsed(false);
  }, [schedule.id]);

  const scheduleData = editMode ? editedSchedule : schedule.data;
  // Filter to only show days with blocks
  let days = scheduleData.days;
  if (Array.isArray(days)) {
    days = days.filter((day) => day && Array.isArray(day.blocks) && day.blocks.length > 0);
  }
  
  const currentDay = days && days.length > 0 ? days[activeDayIndex] : null;

  const handleSaveChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedSchedule),
      });

      if (res.ok) {
        setEditMode(false);
        // Optionally show a success message here
      } else {
        const error = await res.json();
        console.error("Save failed:", error);
        alert("Failed to save schedule. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save schedule:", err);
      alert("An error occurred while saving. Please try again.");
    }
  }, [editedSchedule, schedule.id]);

  const handleRevert = useCallback(() => {
    setEditedSchedule(schedule.data);
    setEditMode(false);
  }, [schedule.data]);

  const sortBlocksByTime = (blocks: ScheduleBlock[]): ScheduleBlock[] => {
    return [...blocks].sort((a, b) => {
      const timeA = a.time.split(":").join("");
      const timeB = b.time.split(":").join("");
      return timeA.localeCompare(timeB);
    });
  };

  const handleUpdateBlockTime = useCallback(
    (dayIndex: number, blockIndex: number, field: "time" | "endTime", value: string) => {
      setEditedSchedule((prev) => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        newSchedule.days[dayIndex].blocks[blockIndex][field] = value;
        // Auto-sort blocks by time after updating
        newSchedule.days[dayIndex].blocks = sortBlocksByTime(
          newSchedule.days[dayIndex].blocks
        );
        return newSchedule;
      });
    },
    []
  );

  const handleMoveBlock = useCallback(
    (dayIndex: number, blockIndex: number, direction: "up" | "down") => {
      setEditedSchedule((prev) => {
        const newSchedule = JSON.parse(JSON.stringify(prev));
        const blocks = newSchedule.days[dayIndex].blocks;
        const newIndex = direction === "up" ? blockIndex - 1 : blockIndex + 1;

        if (newIndex >= 0 && newIndex < blocks.length) {
          [blocks[blockIndex], blocks[newIndex]] = [blocks[newIndex], blocks[blockIndex]];
        }

        return newSchedule;
      });
    },
    []
  );

  if (!currentDay || !days.length) {
    return (
      <Card className="border-accent/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No schedule data available. Please generate a schedule.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-accent shrink-0" />
              <CardTitle className="text-lg truncate">
                {scheduleData.title}
              </CardTitle>
            </div>
            <CardDescription className="leading-relaxed">
              {scheduleData.summary}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {editMode ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevert}
                  className="text-xs bg-transparent"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Revert
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
                className="text-xs bg-transparent"
              >
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating || editMode}
              className="text-xs bg-transparent"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRegenerating ? "animate-spin" : ""}`}
              />
              Regenerate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed((c) => !c)}
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? "Expand schedule" : "Minimize schedule"}
              title={collapsed ? "Expand schedule" : "Minimize schedule"}
            >
              {collapsed ? (
                <Plus className="h-3.5 w-3.5" />
              ) : (
                <Minus className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          {/* Day navigation */}
          {days.length > 1 && (
            <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActiveDayIndex((i) => Math.max(0, i - 1))
              }
              disabled={activeDayIndex === 0}
              className="text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Prev
            </Button>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%] px-1">
              {days.map((day, i) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setActiveDayIndex(i)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    i === activeDayIndex
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {day.dayLabel.split(",")[0]}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setActiveDayIndex((i) =>
                  Math.min(days.length - 1, i + 1)
                )
              }
              disabled={activeDayIndex === days.length - 1}
              className="text-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Day header */}
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">
            {currentDay.dayLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentDay.blocks.length} block
            {currentDay.blocks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-2">
          {currentDay.blocks.map((block, index) => {
            const config = getTypeConfig(block.taskType);
            const Icon = config.icon;
            // Find the correct day index in the FULL editedSchedule.days array
            const dayIndex = editedSchedule.days.findIndex(
              (d) => d.date === currentDay.date
            );

            return (
              <div key={index} className="flex gap-3">
                {/* Time column */}
                <div className="w-20 shrink-0 text-right pt-2.5">
                  {editMode ? (
                    <Input
                      type="time"
                      value={block.time}
                      onChange={(e) =>
                        handleUpdateBlockTime(
                          dayIndex,
                          index,
                          "time",
                          e.target.value
                        )
                      }
                      className="h-6 text-xs"
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatTimeLabel(block.time)}
                    </span>
                  )}
                </div>

                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full mt-3 shrink-0 ${
                      block.taskType === "break"
                        ? "bg-emerald-500 dark:bg-emerald-400"
                        : "bg-accent"
                    }`}
                  />
                  {index < currentDay.blocks.length - 1 && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Block card */}
                <div
                  className={`flex-1 rounded-lg border p-3 mb-1 ${config.bg}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-3.5 w-3.5 ${config.color} shrink-0`} />
                      <span
                        className={`text-sm font-medium ${config.color} truncate`}
                      >
                        {block.taskTitle}
                      </span>
                      {block.taskType === "break" ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 shrink-0"
                        >
                          break
                        </Badge>
                      ) : block.priority ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 shrink-0"
                        >
                          {block.priority.replace("_", " ")}
                        </Badge>
                      ) : null}
                    </div>

                    {/* Move buttons in edit mode */}
                    {editMode && (
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleMoveBlock(dayIndex, index, "up")
                          }
                          disabled={index === 0}
                          className="h-5 w-5 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleMoveBlock(dayIndex, index, "down")
                          }
                          disabled={index === currentDay.blocks.length - 1}
                          className="h-5 w-5 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {editMode ? (
                      <div className="flex gap-1 items-center text-[11px]">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <Input
                          type="time"
                          value={block.time}
                          onChange={(e) =>
                            handleUpdateBlockTime(
                              dayIndex,
                              index,
                              "time",
                              e.target.value
                            )
                          }
                          className="h-5 text-[10px] w-16"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={block.endTime}
                          onChange={(e) =>
                            handleUpdateBlockTime(
                              dayIndex,
                              index,
                              "endTime",
                              e.target.value
                            )
                          }
                          className="h-5 text-[10px] w-16"
                        />
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeLabel(block.time)} -{" "}
                        {formatTimeLabel(block.endTime)}
                      </span>
                    )}
                  </div>
                  {block.notes && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed italic">
                      {block.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      )}
    </Card>
  );
}
