"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  FileText,
  HelpCircle,
  Star,
  Flame,
  FolderKanban,
  CalendarRange,
  Zap,
  User,
  Trash2,
  Pencil,
  StickyNote,
  Tag,
  Check,
} from "lucide-react";

export type PriorityTag =
  | "test_prep"
  | "project"
  | "long_term"
  | "short_term"
  | "personal";

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  courseSection?: string;
  title: string;
  description: string;
  dueDate: string | null;
  dueDateTime: string | null;
  maxPoints: number | null;
  workType: string;
  link: string;
  createdAt: string;
  status: "upcoming" | "due_soon" | "overdue" | "no_due_date" | "submitted" | "graded";
  submissionState?: string;
  grade?: number | null;
  isLate?: boolean;
  isCustom?: boolean;
  priorityTag?: PriorityTag;
  customNote?: string;
}

const statusConfig = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    badgeClass: "bg-red-50 text-red-700 border-red-200",
    accentClass: "border-l-red-400",
  },
  due_soon: {
    label: "Due Soon",
    icon: Clock,
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    accentClass: "border-l-amber-400",
  },
  upcoming: {
    label: "Upcoming",
    icon: BookOpen,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    accentClass: "border-l-sky-400",
  },
  no_due_date: {
    label: "No Due Date",
    icon: FileText,
    badgeClass: "bg-secondary text-secondary-foreground border-border",
    accentClass: "border-l-border",
  },
  submitted: {
    label: "Submitted",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    accentClass: "border-l-emerald-400",
  },
  graded: {
    label: "Graded",
    icon: Star,
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    accentClass: "border-l-teal-400",
  },
};

export const priorityTagConfig: Record<PriorityTag, { label: string; icon: React.ElementType; badgeClass: string; order: number }> = {
  test_prep: {
    label: "Test Prep",
    icon: Flame,
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    order: 0,
  },
  project: {
    label: "Project",
    icon: FolderKanban,
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    order: 1,
  },
  long_term: {
    label: "Long-term",
    icon: CalendarRange,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    order: 2,
  },
  short_term: {
    label: "Short-term",
    icon: Zap,
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    order: 3,
  },
  personal: {
    label: "Personal",
    icon: User,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    order: 4,
  },
};

function getWorkTypeIcon(workType: string) {
  switch (workType) {
    case "ASSIGNMENT":
      return FileText;
    case "SHORT_ANSWER_QUESTION":
    case "MULTIPLE_CHOICE_QUESTION":
      return HelpCircle;
    default:
      return BookOpen;
  }
}

function formatDueDate(dueDate: string | null, dueDateTime: string | null) {
  if (!dueDate) return null;

  const date = new Date(dueDateTime || dueDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relative: string;
  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    relative = absDays === 0 ? "Today" : absDays === 1 ? "1 day ago" : `${absDays} days ago`;
  } else if (diffHours < 1) {
    relative = "Less than 1 hour";
  } else if (diffHours < 24) {
    relative = `${diffHours} hour${diffHours > 1 ? "s" : ""} left`;
  } else if (diffDays === 1) {
    relative = "Tomorrow";
  } else if (diffDays < 7) {
    relative = `${diffDays} days left`;
  } else {
    relative = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const formatted = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return { relative, formatted };
}

export function AssignmentCard({
  assignment,
  onDelete,
  onEdit,
  onAnnotate,
  onMarkDone,
}: {
  assignment: Assignment;
  onDelete?: (id: string) => void;
  onEdit?: (assignment: Assignment) => void;
  onAnnotate?: (assignment: Assignment) => void;
  onMarkDone?: (id: string) => void;
}) {
  const config = statusConfig[assignment.status];
  const StatusIcon = config.icon;
  const WorkIcon = getWorkTypeIcon(assignment.workType);
  const dueDateInfo = formatDueDate(assignment.dueDate, assignment.dueDateTime);
  const pTag = assignment.priorityTag ? priorityTagConfig[assignment.priorityTag] : null;
  const PTagIcon = pTag?.icon;

  const inner = (
    <Card
      className={`border-l-4 ${config.accentClass} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-card h-full`}
    >
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 flex-1">
          <div className="flex-1 min-w-0">
            {/* Source label */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-muted-foreground truncate">
                {assignment.isCustom ? "Custom Task" : assignment.courseName}
                {!assignment.isCustom && assignment.courseSection
                  ? ` - ${assignment.courseSection}`
                  : ""}
              </span>
              {assignment.isCustom && (
                <span className="text-[10px] font-medium bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                  Custom
                </span>
              )}
            </div>

            {/* Title */}
            <div className="flex items-center gap-2 mb-2">
              <WorkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-accent transition-colors line-clamp-2">
                {assignment.title}
              </h3>
            </div>

            {/* Description snippet */}
            {assignment.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {assignment.description}
              </p>
            )}

            {/* Custom note */}
            {assignment.customNote && (
              <div className="mb-3 flex items-start gap-1.5 bg-amber-50/70 border border-amber-100 rounded-md px-2.5 py-1.5">
                <StickyNote className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed line-clamp-2">
                  {assignment.customNote}
                </p>
              </div>
            )}

            {/* Bottom row: due date + points + priority tag */}
            <div className="flex items-center gap-3 flex-wrap">
              {dueDateInfo && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="font-medium">{dueDateInfo.relative}</span>
                  <span className="hidden sm:inline">
                    {"- "}
                    {dueDateInfo.formatted}
                  </span>
                </span>
              )}
              {assignment.maxPoints !== null && (
                <span className="text-xs text-muted-foreground">
                  {assignment.grade !== null && assignment.grade !== undefined
                    ? `${assignment.grade}/${assignment.maxPoints} pts`
                    : `${assignment.maxPoints} pts`}
                </span>
              )}
              {pTag && PTagIcon && (
                <Badge
                  variant="outline"
                  className={`${pTag.badgeClass} text-[10px] flex items-center gap-1 px-1.5 py-0`}
                >
                  <PTagIcon className="h-2.5 w-2.5" />
                  {pTag.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Right side: status badge + actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge
              variant="outline"
              className={`${config.badgeClass} text-xs flex items-center gap-1 px-2 py-0.5`}
            >
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </Badge>

            {/* Action buttons row */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Mark as done (custom only, if not already completed) */}
              {assignment.isCustom && 
               assignment.status !== "submitted" && 
               assignment.status !== "graded" && 
               onMarkDone && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMarkDone(assignment.id);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-all"
                  aria-label="Mark as done"
                  title="Mark as done"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Edit (custom) or Annotate (classroom) */}
              {assignment.isCustom && onEdit ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(assignment);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-accent hover:bg-accent/10 transition-all"
                  aria-label="Edit task"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              ) : (
                !assignment.isCustom && onAnnotate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAnnotate(assignment);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-accent hover:bg-accent/10 transition-all"
                    aria-label="Add note or tag"
                  >
                    <Tag className="h-3.5 w-3.5" />
                  </button>
                )
              )}

              {/* Delete for custom */}
              {assignment.isCustom && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(assignment.id);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              {/* External link for classroom */}
              {!assignment.isCustom && (
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (assignment.isCustom) {
    return <div className="block group">{inner}</div>;
  }

  return (
    <a
      href={assignment.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      {inner}
    </a>
  );
}
