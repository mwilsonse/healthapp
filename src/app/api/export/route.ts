import { NextResponse } from "next/server";

import { exportService } from "@/server/services";

export async function GET() {
  const result = await exportService.exportUserData();

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === "NOT_FOUND" ? 404 : 400 }
    );
  }

  const generatedForFile = result.data.generatedAt
    .replaceAll(":", "")
    .replaceAll(".", "");

  return NextResponse.json(result.data, {
    headers: {
      "Content-Disposition": `attachment; filename="phip-export-${generatedForFile}.json"`,
      "Cache-Control": "no-store"
    }
  });
}
