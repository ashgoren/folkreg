import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { type Database } from "@repo/types";

function createMiddlewareClient(request: NextRequest) {
  // Generate a default response. If setAll is not called, this is the response that will be returned.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Replace in-memory cookies for current req, so subsequent middleware calls to getAll() return the updated cookies
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Replace default response with one with updated cookies
          supabaseResponse = NextResponse.next({ request });
          // Set the cookies on the response that will be returned
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        }
      }
    }
  );
  return { supabase, supabaseResponse };
}

export async function handleAuthSession(request: NextRequest) {
  const { supabase, supabaseResponse } = createMiddlewareClient(request);

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getClaims(), to avoid hard-to-debug bugs.
  // IMPORTANT: Do not remove getClaims() if using SSR with the Supabase client, to avoid users being logged out.

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const path = request.nextUrl.pathname;

  if (!user && path !== "/" && !path.startsWith("/login") && !path.startsWith("/auth")) {
    // no user; redirect the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You must return the supabaseResponse object as it is.
  return supabaseResponse;
}
