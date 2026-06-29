import { NextResponse } from "next/server";

import { coachService } from "@/server/services";

function statusForError(code: string) {
  if (code === "NOT_FOUND") {
    return 404;
  }

  if (code === "CONFLICT") {
    return 409;
  }

  if (code === "VALIDATION" || code === "BAD_REQUEST") {
    return 400;
  }

  return 500;
}

export async function GET() {
  const result = await coachService.listRecentChatActions();

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: statusForError(result.error.code) }
    );
  }

  return NextResponse.json({ actions: result.data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await coachService.askCoach(body);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: statusForError(result.error.code) }
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await coachService.decideCoachChatAction(body);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: statusForError(result.error.code) }
    );
  }

  return NextResponse.json({ action: result.data });
}
