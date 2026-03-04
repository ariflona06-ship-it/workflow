import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

//Load user's saved schedule
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await sql`
    SELECT id, schedule_type, schedule_data, preferences, created_at, updated_at
    FROM user_schedules
    WHERE user_email = ${session.user.email}
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return Response.json({ schedule: null });
  }

  const row = rows[0];
  return Response.json({
    schedule: {
      id: row.id,
      scheduleType: row.schedule_type,
      data: row.schedule_data,
      preferences: row.preferences,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}

//Remove user's saved schedule
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sql`
    DELETE FROM user_schedules
    WHERE user_email = ${session.user.email}
  `;

  return Response.json({ success: true });
}
