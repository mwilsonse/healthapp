import { NextResponse } from "next/server";

import { exportService } from "@/server/services";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await exportService.resetUserData({
    confirmation:
      typeof body?.confirmation === "string" ? body.confirmation : "",
    preserveUser: body?.preserveUser !== false
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === "NOT_FOUND" ? 404 : 400 }
    );
  }

  return NextResponse.json({ reset: result.data });
}
