"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Flame,
  FolderKanban,
  CalendarRange,
  Zap,
  User,
  X,
  Save,
} from "lucide-react";
import type { PriorityTag, Assignment } from "./assignment-card";

const tagOptions: {
  value: PriorityTag;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    value: "test_prep",
    label: "Test Prep",
    icon: Flame,
    color: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
  },
  {
    value: "project",
    label: "Project",
    icon: FolderKanban,
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    value: "long_term",
    label: "Long-term",
    icon: CalendarRange,
    color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
  },
  {
    value: "short_term",
    label: "Short-term",
    icon: Zap,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  },
  {
    value: "personal",
    label: "Personal",
    icon: User,
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
];

export interface AnnotationData {
  assignmentId: string;
  courseId: string;
  customNote?: string;
  priorityTag?: PriorityTag;
}

export function AnnotateDialog({
  assignment,
  open,
  onOpenChange,
  onSave,
}: {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: AnnotationData) => void;
}) {
  const [note, setNote] = useState("");
  const [selectedTag, setSelectedTag] = useState<PriorityTag | undefined>(undefined);

  useEffect(() => {
    if (open && assignment) {
      setNote(assignment.customNote || "");
      setSelectedTag(assignment.priorityTag);
    }
  }, [open, assignment]);

  function handleSave() {
    onSave({
      assignmentId: assignment.id,
      courseId: assignment.courseId,
      customNote: note.trim() || undefined,
      priorityTag: selectedTag,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8 leading-snug">
            Annotate: {assignment.title}
          </DialogTitle>
          <DialogDescription>
            Add a personal note and/or a priority tag to this Classroom assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="annotation-note" className="text-sm font-medium">
              Note{" "}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="annotation-note"
              placeholder="e.g. Focus on chapters 5-7, bring calculator..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-background resize-none h-24"
              autoFocus
            />
          </div>

          {/* Priority Tag */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">
              Priority tag{" "}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const Icon = tag.icon;
                const isSelected = selectedTag === tag.value;
                return (
                  <button
                    key={tag.value}
                    type="button"
                    onClick={() =>
                      setSelectedTag((prev) =>
                        prev === tag.value ? undefined : tag.value
                      )
                    }
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
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(undefined)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors self-start flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear tag
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-primary text-primary-foreground"
          >
            <Save className="h-4 w-4 mr-1.5" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
