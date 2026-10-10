import type { z } from "zod";
import type { TenantSecrets } from "@repo/types";

/**
 * A secrets form's starting values from the tenant_secrets row: only the columns its schema
 * names, so a page never sends the browser secrets it doesn't edit, and the table's unset null as
 * the form's "". Called on the server, by the page.
 */
export const secretValues = <TSchema extends z.ZodObject>(schema: TSchema, row: TenantSecrets): z.output<TSchema> =>
  Object.fromEntries(
    Object.keys(schema.shape).map((key) => [key, row[key as keyof TenantSecrets] ?? ""]),
  ) as z.output<TSchema>;
