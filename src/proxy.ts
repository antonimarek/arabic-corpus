import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Missing env during first setup — send the user to a setup page.
    if (!request.nextUrl.pathname.startsWith("/setup")) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      const { NextResponse } = await import("next/server");
      return NextResponse.redirect(url);
    }
    const { NextResponse } = await import("next/server");
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
