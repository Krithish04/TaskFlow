import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGlobalAnalytics } from "@/lib/analytics";
import { handleAuthError } from "@/lib/permissions";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "admin" && role !== "pm") {
    // Anti-probing: regular members do not have access to global analytics
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const analytics = await getGlobalAnalytics(session.user.id, role);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to compute global analytics" },
      { status: 500 }
    );
  }
}
