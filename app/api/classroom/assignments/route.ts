import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

interface CourseWorkItem {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
  maxPoints?: number;
  workType: string;
  alternateLink: string;
  creationTime: string;
  updateTime: string;
}

interface Course {
  id: string;
  name: string;
  section?: string;
  courseState: string;
  alternateLink: string;
}

interface StudentSubmission {
  courseWorkId: string;
  state: string;
  assignedGrade?: number;
  late?: boolean;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return NextResponse.json(
      { error: "No Google Classroom access token. Please re-sign in." },
      { status: 403 }
    );
  }

  const accessToken = token.accessToken as string;
  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    // 1. Fetch active courses
    const coursesRes = await fetch(
      "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20",
      { headers }
    );

    if (!coursesRes.ok) {
      const errData = await coursesRes.json().catch(() => ({}));
      console.error("[v0] Classroom courses error:", errData);
      return NextResponse.json(
        { error: "Failed to fetch courses. Ensure Google Classroom API is enabled in your Google Cloud Console." },
        { status: coursesRes.status }
      );
    }

    const coursesData = await coursesRes.json();
    const courses: Course[] = coursesData.courses || [];

    if (courses.length === 0) {
      return NextResponse.json({ courses: [], assignments: [] });
    }

    // 2. Fetch coursework and submissions for each course in parallel
    const allAssignments: Array<{
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
    }> = [];

    await Promise.all(
      courses.map(async (course) => {
        try {
          // Fetch coursework
          const cwRes = await fetch(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?orderBy=dueDate asc&pageSize=50`,
            { headers }
          );

          if (!cwRes.ok) return;

          const cwData = await cwRes.json();
          const courseWork: CourseWorkItem[] = cwData.courseWork || [];

          // Fetch student submissions for this course
          const submissionsMap = new Map<string, StudentSubmission>();
          try {
            const subRes = await fetch(
              `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/-/studentSubmissions?pageSize=100`,
              { headers }
            );
            if (subRes.ok) {
              const subData = await subRes.json();
              const submissions: StudentSubmission[] = subData.studentSubmissions || [];
              for (const sub of submissions) {
                submissionsMap.set(sub.courseWorkId, sub);
              }
            }
          } catch {
            // Submissions fetch failed, continue without
          }

          for (const cw of courseWork) {
            let dueDateStr: string | null = null;
            let dueDateTimeStr: string | null = null;

            if (cw.dueDate) {
              const { year, month, day } = cw.dueDate;
              const hours = cw.dueTime?.hours ?? 23;
              const minutes = cw.dueTime?.minutes ?? 59;
              dueDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              dueDateTimeStr = `${dueDateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
            }

            const submission = submissionsMap.get(cw.id);
            let status: typeof allAssignments[number]["status"] = "no_due_date";

            if (submission?.state === "RETURNED") {
              status = "graded";
            } else if (submission?.state === "TURNED_IN") {
              status = "submitted";
            } else if (dueDateTimeStr) {
              const dueMs = new Date(dueDateTimeStr).getTime();
              const nowMs = Date.now();
              const oneDayMs = 24 * 60 * 60 * 1000;

              if (dueMs < nowMs) {
                status = "overdue";
              } else if (dueMs - nowMs < 2 * oneDayMs) {
                status = "due_soon";
              } else {
                status = "upcoming";
              }
            }

            allAssignments.push({
              id: cw.id,
              courseId: course.id,
              courseName: course.name,
              courseSection: course.section,
              title: cw.title,
              description: cw.description || "",
              dueDate: dueDateStr,
              dueDateTime: dueDateTimeStr,
              maxPoints: cw.maxPoints ?? null,
              workType: cw.workType,
              link: cw.alternateLink,
              createdAt: cw.creationTime,
              status,
              submissionState: submission?.state,
              grade: submission?.assignedGrade ?? null,
              isLate: submission?.late ?? false,
            });
          }
        } catch (err) {
          console.error(`[v0] Error fetching coursework for ${course.name}:`, err);
        }
      })
    );

    // Sort: overdue first, then due_soon, then upcoming, then the rest
    const statusOrder = { overdue: 0, due_soon: 1, upcoming: 2, no_due_date: 3, submitted: 4, graded: 5 };
    allAssignments.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status];
      if (orderDiff !== 0) return orderDiff;
      if (a.dueDateTime && b.dueDateTime) {
        return new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime();
      }
      return 0;
    });

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        link: c.alternateLink,
      })),
      assignments: allAssignments,
    });
  } catch (err) {
    console.error("[v0] Classroom API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching Classroom data." },
      { status: 500 }
    );
  }
}
