import { readFileSync, writeFileSync } from "node:fs";

const sharedFiles = {
  cors: "supabase/functions/_shared/cors.ts",
  paystack: "supabase/functions/_shared/paystack.ts",
  shipping: "supabase/functions/_shared/shipping.ts",
};

const functions = [
  {
    source: "supabase/functions/initialize-payment/index.ts",
    output: "supabase/dashboard-functions/initialize-payment.ts",
    helpers: ["cors", "paystack", "shipping"],
  },
  {
    source: "supabase/functions/paystack-webhook/index.ts",
    output: "supabase/dashboard-functions/paystack-webhook.ts",
    helpers: ["paystack"],
  },
  {
    source: "supabase/functions/verify-payment/index.ts",
    output: "supabase/dashboard-functions/verify-payment.ts",
    helpers: ["cors", "paystack"],
  },
  {
    source: "supabase/functions/process-order-emails/index.ts",
    output: "supabase/dashboard-functions/process-order-emails.ts",
    helpers: [],
  },
];

function withoutExports(source) {
  return source.replace(/^export\s+/gm, "").trim();
}

for (const functionDefinition of functions) {
  const source = readFileSync(functionDefinition.source, "utf8");
  const sourceLines = source.split("\n");
  const imports = sourceLines.filter((line) => line.startsWith("import ") && !line.includes("../_shared/"));
  const body = sourceLines
    .filter((line) => !line.startsWith("import "))
    .join("\n")
    .trim();
  const helpers = functionDefinition.helpers
    .map((helper) => withoutExports(readFileSync(sharedFiles[helper], "utf8")))
    .join("\n\n");
  const output = [
    "// Generated for Supabase Dashboard deployment. Edit the canonical files in supabase/functions.",
    ...imports,
    "",
    helpers,
    "",
    body,
    "",
  ].join("\n");

  writeFileSync(functionDefinition.output, output);
}
