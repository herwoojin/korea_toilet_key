import { NextResponse } from "next/server";

/** Route Handler 공용 에러 — code는 클라이언트 i18n 매핑용, detail은 디버깅 힌트 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string
  ) {
    super(code);
  }
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: e.code, ...(e.detail ? { detail: e.detail } : {}) },
      { status: e.status }
    );
  }
  console.error("[api] unexpected error", e);
  return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
}
