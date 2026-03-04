"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  CalendarIcon,
  X,
  Flame,
  FolderKanban,
  CalendarRange,
  Zap,
  User,
  Pencil,
} from "lucide-react";
import type { PriorityTag, Assignment } from "./assignment-card";

const tagOptions: {
  value: PriorityTag;
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}[] = [
  {
    value: "test_prep",
    label: "Test Prep",
    icon: Flame,
    description: "Exams, quizzes, midterms",
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  },
  {
    value: "project",
    label: "Project",
    icon: FolderKanban,
    description: "Group or solo projects",
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    value: "long_term",
    label: "Long-term",
    icon: CalendarRange,
    description: "Papers, essays, research",
    color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
  },
  {
    value: "short_term",
    label: "Short-term",
    icon: Zap,
    description: "Homework, daily tasks",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  },
  {
    value: "personal",
    label: "Personal",
    icon: User,
    description: "Non-academic tasks",
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
];

function computeStatus(
  dueDate: Date | undefined
): Assignment["status"] {
  if (!dueDate) return "no_due_date";
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffMs < 0) return "overdue";
  if (diffHours <= 48) return "due_soon";
  return "upcoming";
}

/* ─── Create-new trigger variant ─── */
export function AddTaskDialog({
  onAdd,
}: {
  onAdd: (task: Assignment) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-primary-foreground gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Task</span>
        </Button>
      </DialogTrigger>
      <TaskFormContent
        mode="create"
        onSubmit={(task) => {
          onAdd(task);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </Dialog>
  );
}

/* ─── Edit-existing trigger variant ─── */
export function EditTaskDialog({
  assignment,
  open,
  onOpenChange,
  onSave,
}: {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (updated: Assignment) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <TaskFormContent
        mode="edit"
        initial={assignment}
        onSubmit={(updated) => {
          onSave(updated);
          onOpenChange(false);
        }}
        onCancel={() => onOpenChange(false)}
      />
    </Dialog>
  );
}

/* ─── Shared form content ─── */
function TaskFormContent({
  mode,
  initial,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: Assignment;
  onSubmit: (task: Assignment) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTag, setSelectedTag] = useState<PriorityTag>("short_term");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Pre-fill when editing
  useEffect(() => {
    if (mode === "edit" && initial) {
      setTitle(initial.title);
      setDescription(initial.description || "");
      setSelectedTag(initial.priorityTag || "short_term");
      setDueDate(initial.dueDateTime ? new Date(initial.dueDateTime) : undefined);
    } else {
      setTitle("");
      setDescription("");
      setSelectedTag("short_term");
      setDueDate(undefined);
    }
  }, [mode, initial]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (mode === "edit" && initial) {
      const updated: Assignment = {
        ...initial,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? dueDate.toISOString().split("T")[0] : null,
        dueDateTime: dueDate ? dueDate.toISOString() : null,
        status: computeStatus(dueDate),
        priorityTag: selectedTag,
      };
      onSubmit(updated);
    } else {
      const now = new Date();
      const task: Assignment = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        courseId: "custom",
        courseName: "Custom Task",
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? dueDate.toISOString().split("T")[0] : null,
        dueDateTime: dueDate ? dueDate.toISOString() : null,
        maxPoints: null,
        workType: "ASSIGNMENT",
        link: "",
        createdAt: now.toISOString(),
        status: computeStatus(dueDate),
        isCustom: true,
        priorityTag: selectedTag,
      };
      onSubmit(task);
    }
  }

  const isEdit = mode === "edit";

  return (
    <DialogContent className="sm:max-w-md">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "Add a custom task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of your custom task."
              : "Create a task for anything -- test prep, personal goals, or assignments not on Classroom."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="e.g. Study for Calculus midterm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-desc" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="task-desc"
              placeholder="Add details, notes, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background resize-none h-20"
            />
          </div>

          {/* Priority Tag */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Tag</Label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const Icon = tag.icon;
                const isSelected = selectedTag === tag.value;
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() => setSelectedTag(tag.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? `${tag.color} ring-2 ring-offset-1 ring-current/20 shadow-sm`
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {tagOptions.find((t) => t.value === selectedTag)?.description}
            </p>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              Due date{" "}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`bg-transparent justify-start text-left font-normal flex-1 ${
                      !dueDate ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {dueDate
                      ? dueDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return date < yesterday;
                    }}
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setDueDate(undefined)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear date</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-transparent"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!title.trim()}
            className="bg-primary text-primary-foreground"
          >
            {isEdit ? (
              <>
                <Pencil className="h-4 w-4 mr-1.5" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Task
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
