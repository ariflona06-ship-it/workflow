import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const scheduleId = id;
    const body = await req.json();

    // Update the schedule in the database
    const updated = await sql`
      UPDATE user_schedules
      SET schedule_data = ${JSON.stringify(body)}, updated_at = NOW()
      WHERE id = ${parseInt(scheduleId)} AND user_email = ${session.user.email}
      RETURNING id, schedule_type, schedule_data, preferences, created_at, updated_at
    `;

    if (!updated || updated.length === 0) {
      return Response.json(
        { error: "Schedule not found or unauthorized" },
        { status: 404 }
      );
    }

    return Response.json({
      schedule: {
        id: updated[0].id,
        scheduleType: updated[0].schedule_type,
        data: updated[0].schedule_data,
        preferences: updated[0].preferences,
        createdAt: updated[0].created_at,
        updatedAt: updated[0].updated_at,
      },
    });
  } catch (error) {
    console.error("Schedule update error:", error);
    return Response.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}
