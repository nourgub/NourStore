import { NextResponse } from "next/server";
import { MERCHANT_SESSION_COOKIE } from "@/lib/merchant-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(MERCHANT_SESSION_COOKIE);
  return response;
}
