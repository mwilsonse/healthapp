import { NextResponse } from "next/server";

import { getEnv } from "@/server/env";

export function GET() {
  const env = getEnv();

  return NextResponse.json({
    ok: true,
    environment: env.NODE_ENV,
    service: "healthapp-web",
    timestamp: new Date().toISOString()
  });
}
