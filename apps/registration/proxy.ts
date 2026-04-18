// Add x-tenant-id header to all requests based on the host header

import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@repo/db/server";
import { getTenantByDomain } from "@repo/db/queries";

async function resolveTenant(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });
  const supabase = createServiceRoleClient();

  const host = request.headers.get('host');
  if (!host) {
    return new NextResponse('Host header is required', { status: 400 });
  }

  try {
    const tenant = await getTenantByDomain(supabase, host);
    if (!tenant) {
      return new NextResponse('Tenant not found', { status: 404 });
    }

    // Set tenant ID in custom header for downstream middleware & route handlers to use
    supabaseResponse.headers.set('x-tenant-id', tenant.id);
  } catch (error) {
    console.error('Error resolving tenant:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  return supabaseResponse;
}

export async function proxy(request: NextRequest) {
  return resolveTenant(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
