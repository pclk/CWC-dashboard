import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") ?? "";
  const target = new URL("https://t.me/share/url");

  target.searchParams.set("url", "");
  target.searchParams.set("text", text);

  return NextResponse.redirect(target);
}
