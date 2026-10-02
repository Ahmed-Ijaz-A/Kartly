import { NextResponse, type NextRequest } from "next/server";

import { getSearchSuggestions } from "@/db/queries";

export const dynamic = "force-dynamic";

/**
 * Backs the search box's as-you-type dropdown. A Route Handler rather than a
 * Server Action: this is fired many times a second while typing, which is a
 * GET/read shape, not an RPC-style mutation.
 */
export async function GET(request: NextRequest) {
  // searchParams is untrusted input -- trim and cap length same as the full
  // search page does, and treat anything too short as "no suggestions" so a
  // single keystroke doesn't hit the database.
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const suggestions = await getSearchSuggestions(q);
  return NextResponse.json({ suggestions });
}
