import { describe, it, expect } from "vitest";
import { z } from "zod";
import { makeSecrets } from "@/test/fixtures";
import { secretValues } from "./secret-values";

describe("secretValues", () => {
  const schema = z.object({ docuseal_key: z.string(), stripe_secret_key_live: z.string() });

  // A page never sends the browser secrets its form doesn't edit.
  it("keeps only the columns the schema names", () => {
    const row = makeSecrets({ docuseal_key: "dk", stripe_secret_key_live: "sk_live", paypal_secret_live: "pp_live" });
    expect(secretValues(schema, row)).toEqual({ docuseal_key: "dk", stripe_secret_key_live: "sk_live" });
  });

  it('gives an unset (null) secret as ""', () => {
    expect(secretValues(schema, makeSecrets({ docuseal_key: null }))).toEqual({ docuseal_key: "", stripe_secret_key_live: "" });
  });
});
