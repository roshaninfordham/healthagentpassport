import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";
import type {
  DenyRule,
  HealthAgentPolicy,
  PolicyRoute
} from "./types.js";

const policySchema = z.object({
  version: z.number(),
  service: z.object({
    name: z.string(),
    upstream: z.string().url(),
    description: z.string().optional()
  }),
  demo: z
    .object({
      syntheticOnly: z.boolean().optional(),
      noMedicalAdvice: z.boolean().optional(),
      artificialStepDelayMs: z.number().optional()
    })
    .optional(),
  agents: z.record(
    z.object({
      name: z.string(),
      publicKeyFile: z.string(),
      defaultTrustTier: z.string()
    })
  ),
  routes: z.array(
    z.object({
      id: z.string(),
      description: z.string().optional(),
      match: z.object({
        method: z.string(),
        path: z.string()
      }),
      patientContext: z
        .object({
          source: z.enum(["path", "body"]),
          param: z.string().optional(),
          field: z.string().optional()
        })
        .optional(),
      requiredScopes: z.array(z.string()),
      trust: z.object({
        minScore: z.number(),
        allowedRoutes: z.array(
          z.enum(["prod", "prod_throttled", "sandbox", "sandbox_only"])
        )
      }),
      sandbox: z.object({
        required: z.boolean(),
        maxRiskScore: z.number()
      })
    })
  ),
  deny: z
    .array(
      z.object({
        id: z.string(),
        match: z.object({
          method: z.string(),
          pathPrefix: z.string()
        }),
        reason: z.string()
      })
    )
    .optional()
});

export type LoadedPolicy = {
  file: string;
  baseDir: string;
  policy: HealthAgentPolicy;
};

export async function loadPolicy(policyFile: string): Promise<LoadedPolicy> {
  const file = resolve(policyFile);
  const yaml = await readFile(file, "utf8");
  const parsed = policySchema.parse(parse(yaml)) as HealthAgentPolicy;

  return {
    file,
    baseDir: dirname(file),
    policy: parsed
  };
}

export function getUrlPath(pathWithQuery: string): string {
  return new URL(pathWithQuery, "http://healthagent.local").pathname;
}

function compileRoutePath(pattern: string) {
  const paramNames: string[] = [];
  const regexSource = pattern
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        paramNames.push(part.slice(1));
        return "([^/]+)";
      }

      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");

  return {
    regex: new RegExp(`^${regexSource}$`),
    paramNames
  };
}

export function matchDenyRule(
  policy: HealthAgentPolicy,
  method: string,
  pathWithQuery: string
): DenyRule | null {
  const urlPath = getUrlPath(pathWithQuery);

  return (
    policy.deny?.find(
      (rule) =>
        rule.match.method.toUpperCase() === method.toUpperCase() &&
        urlPath.startsWith(rule.match.pathPrefix)
    ) ?? null
  );
}

export function matchRoutePolicy(
  policy: HealthAgentPolicy,
  method: string,
  pathWithQuery: string
): { route: PolicyRoute; params: Record<string, string> } | null {
  const urlPath = getUrlPath(pathWithQuery);

  for (const route of policy.routes) {
    if (route.match.method.toUpperCase() !== method.toUpperCase()) continue;
    const compiled = compileRoutePath(route.match.path);
    const match = urlPath.match(compiled.regex);
    if (!match) continue;

    const params = Object.fromEntries(
      compiled.paramNames.map((name, index) => [name, match[index + 1]])
    );

    return { route, params };
  }

  return null;
}

export function extractPatientId(input: {
  route: PolicyRoute;
  params: Record<string, string>;
  body: unknown;
}): string | undefined {
  const context = input.route.patientContext;
  if (!context) return undefined;

  if (context.source === "path" && context.param) {
    return input.params[context.param];
  }

  if (
    context.source === "body" &&
    context.field &&
    input.body &&
    typeof input.body === "object" &&
    context.field in input.body
  ) {
    return String((input.body as Record<string, unknown>)[context.field]);
  }

  return undefined;
}

export function resolvePolicyFile(loaded: LoadedPolicy, relativePath: string) {
  return resolve(loaded.baseDir, relativePath);
}
