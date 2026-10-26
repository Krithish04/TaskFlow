import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireProjectAccess, handleAuthError } from "@/lib/permissions";
import { getProjectAnalytics } from "@/lib/analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    await requireProjectAccess(id, "view");

    const searchParams = request.nextUrl.searchParams;
    const rangeParam = searchParams.get("range");
    const rangeDays = rangeParam === "7" ? 7 : rangeParam === "90" ? 90 : 30;

    const analytics = await getProjectAnalytics(id, rangeDays);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    const authResponse = handleAuthError(error);
    if (authResponse) return authResponse;
    return NextResponse.json(
      { error: "Failed to compute project analytics" },
      { status: 500 }
    );
  }
}
