import { NextRequest, NextResponse } from "next/server";

const BASIC_AUTH_USER = process.env.APP_BASIC_AUTH_USER ?? "zlt";
const BASIC_AUTH_PASSWORD = process.env.APP_BASIC_AUTH_PASSWORD ?? "";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ZLT CRM"' },
  });
}

export function middleware(req: NextRequest) {
  if (!BASIC_AUTH_PASSWORD) {
    return NextResponse.next();
  }

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorized();
  }

  try {
    const decoded = atob(header.slice("Basic ".length));
    const sepIndex = decoded.indexOf(":");
    if (sepIndex === -1) return unauthorized();
    const user = decoded.slice(0, sepIndex);
    const pass = decoded.slice(sepIndex + 1);

    if (user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASSWORD) {
      return NextResponse.next();
    }
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
