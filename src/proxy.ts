import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, localeCookie } from "@/i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (hasLocale(firstSegment)) return;

  // English on a first visit, whatever the browser's language; then the language the visitor picked.
  const savedLocale = request.cookies.get(localeCookie)?.value;
  const locale = savedLocale && hasLocale(savedLocale) ? savedLocale : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skips Next internals and any path with a file extension (favicon, corpus, images).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
