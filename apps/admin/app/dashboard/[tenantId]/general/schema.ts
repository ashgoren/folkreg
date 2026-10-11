import { z } from "zod";
import { slugSchema } from "@repo/tenant-config";

// The subdomain, saved on its own and only when the organizer confirms: changing it moves the
// registration site, and the old address stops working.
export const slugValuesSchema = z.object({ slug: slugSchema });
