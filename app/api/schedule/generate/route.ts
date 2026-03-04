import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { z } from "zod";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const scheduleBlockSchema = z.object({
  time: z.string().describe("Start time in HH:MM format (24h)"),
  endTime: z.string().describe("End time in HH:MM format (24h)"),
  taskTitle: z.string().describe("The assignment or task title"),
  taskType: z
    .string()
    .describe("Type: study, break, review, project-work, personal"),
  notes: z
    .string()
    .nullable()
    .describe("Brief tip or strategy for this block"),
  priority: z
    .string()
    .nullable()
    .describe("Priority tag if applicable: test_prep, project, long_term, short_term, personal"),
});

const dayScheduleSchema = z.object({
  date: z.string().describe("Date in YYYY-MM-DD format"),
  dayLabel: z.string().describe("e.g. Monday, Feb 17"),
  blocks: z.array(scheduleBlockSchema),
});

const scheduleResponseSchema = z.object({
  title: z.string().describe("A motivating title for this schedule"),
  summary: z
    .string()
    .describe("Brief 1-2 sentence overview of the schedule strategy"),
  days: z.array(dayScheduleSchema),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      assignments,
      preferences,
      scheduleType,
    }: {
      assignments: Array<{
        title: string;
        dueDate: string | null;
        priorityTag: string | null;
        courseName: string;
        estimatedMinutes: number | null;
        status: string;
      }>;
      preferences: {
        homeworkStartTime: string;
        homeworkEndTime: string;
        breakDuration: number;
        studySessionLength: number;
        daysAvailable: string[];
        additionalNotes: string;
      };
      scheduleType: "day" | "week" | "month";
    } = body;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    let dateRangeInstruction = "";
    if (scheduleType === "day") {
      dateRangeInstruction = `Generate a schedule for TODAY only (${todayStr}).`;
    } else if (scheduleType === "week") {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      dateRangeInstruction = `Generate a schedule for 7 days starting from ${todayStr} to ${endOfWeek.toISOString().split("T")[0]}.`;
    } else {
      const endOfMonth = new Date(today);
      endOfMonth.setDate(endOfMonth.getDate() + 13);
      dateRangeInstruction = `Generate a schedule for 14 days starting from ${todayStr} to ${endOfMonth.toISOString().split("T")[0]}. Group tasks logically and spread them out.`;
    }

    const assignmentSummary = assignments
      .filter((a) => a.status !== "submitted" && a.status !== "graded")
      .map((a) => {
        let line = `- "${a.title}" (${a.courseName})`;
        if (a.dueDate) line += ` | Due: ${a.dueDate}`;
        if (a.priorityTag) line += ` | Priority: ${a.priorityTag}`;
        if (a.estimatedMinutes)
          line += ` | Est: ${a.estimatedMinutes} min`;
        return line;
      })
      .join("\n");

    const prompt = `You are an expert student planner AI. Create a realistic, balanced study schedule that prevents burnout.

ASSIGNMENTS:
${assignmentSummary || "No assignments currently."}

CRITICAL: Each task's "Est: X min" value above is the EXACT duration for that task's time block. Do not use the "Preferred study session length" as the block duration. The estimated minutes ARE the block durations you must use.

STUDENT PREFERENCES:
- Study window: ${preferences.homeworkStartTime} to ${preferences.homeworkEndTime}
- Preferred study session length: ${preferences.studySessionLength} minutes (guideline only, not block duration)
- Break duration between sessions: ${preferences.breakDuration} minutes
- Available days: ${preferences.daysAvailable.join(", ")}
${preferences.additionalNotes ? `- Additional notes: ${preferences.additionalNotes}` : ""}

${dateRangeInstruction}

RULES:
1. Prioritize in this order: test_prep > project > long_term > short_term > personal
2. Schedule study blocks ONLY within the student's study window
3. Each block's duration MUST match the estimated minutes provided for that task
4. Include breaks between study blocks - the break duration should be ${preferences.breakDuration} minutes
5. If a task is estimated to take longer than the study window allows in one day, split it across days (each part matching its estimated duration)
6. For tasks with close due dates, schedule them sooner
7. Include brief review sessions for test prep items
8. Keep the schedule realistic - don't overload any single day
9. Add encouraging notes/tips for each block
10. Only schedule on the days the student marked as available
11. The "study session length" preference is ONLY a guideline for how long the student prefers to study continuously - it does NOT determine block duration. Use the estimated minutes from each task instead.

Return ONLY valid JSON (no other text) in this exact format:
{
  "title": "A motivating title for this schedule",
  "summary": "Brief 1-2 sentence overview of the schedule strategy",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayLabel": "e.g. Monday, Feb 17",
      "blocks": [
        {
          "time": "HH:MM",
          "endTime": "HH:MM",
          "taskTitle": "Assignment or task title",
          "taskType": "study|break|review|project-work|personal",
          "notes": "Brief tip or strategy",
          "priority": "test_prep|project|long_term|short_term|personal|null"
        }
      ]
    }
  ]
}`;

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt,
    });

    // Parse the JSON response
    let output: any;
    try {
      // Extract JSON from the response (in case there's any extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      output = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!output.title || !output.summary || !Array.isArray(output.days)) {
        throw new Error("Invalid schedule structure");
      }
    } catch (parseError) {
      console.error("Failed to parse schedule JSON:", parseError, "Response:", text);
      return Response.json(
        { error: "AI returned invalid schedule format. Please try again." },
        { status: 500 }
      );
    }

    // Delete any existing schedule for this user, then insert the new one
    await sql()`DELETE FROM user_schedules WHERE user_email = ${session.user.email}`;

    const inserted = await sql()`
      INSERT INTO user_schedules (user_id, user_email, schedule_type, schedule_data, preferences)
      VALUES (
        ${session.user.id || session.user.email},
        ${session.user.email},
        ${scheduleType},
        ${JSON.stringify(output)},
        ${JSON.stringify(preferences)}
      )
      RETURNING id, created_at
    `;

    return Response.json({
      schedule: {
        id: inserted[0].id,
        scheduleType,
        data: output,
        preferences,
        createdAt: inserted[0].created_at,
      },
    });
  } catch (error) {
    console.error("Schedule generation error:", error);
    return Response.json(
      { error: "Failed to generate schedule. Please try again." },
      { status: 500 }
    );
  }
}
