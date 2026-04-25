// Add x-tenant-id header to all requests based on the host header

import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@repo/db/server";
import { getTenantByDomain, getTenantBySlug } from "@repo/db/queries";

const { PLATFORM_DOMAIN = 'folkreg.org' } = process.env;

async function resolveTenant(request: NextRequest) {
  const supabase = createServiceRoleClient();

  const host = request.headers.get('host');
  if (!host) {
    return new NextResponse('Host header is required', { status: 400 });
  }

  try {
    const isPlatformSubdomain = host.endsWith(`.${PLATFORM_DOMAIN}`);

    // console.log(`Resolving tenant for host: ${host} (isPlatformSubdomain: ${isPlatformSubdomain}, slug: ${isPlatformSubdomain ? host.split('.')[0] : 'N/A'})`);
    const tenant = isPlatformSubdomain
      ? await getTenantBySlug(supabase, host.split('.')[0]!)
      : await getTenantByDomain(supabase, host);

    if (!tenant) {
      return new NextResponse('Tenant not found', { status: 404 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenant.id);
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    console.error('Error resolving tenant:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
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
