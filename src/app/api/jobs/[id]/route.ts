import { NextResponse } from "next/server";

import { jobService } from "@/server/services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await jobService.getJob(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === "NOT_FOUND" ? 404 : 400 }
    );
  }

  return NextResponse.json({ job: result.data });
}
