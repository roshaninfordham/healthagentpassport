import type { TrustRoute } from "./trust";

export type EndpointPolicy = {
  name: string;
  method: "GET" | "POST";
  pathPattern: RegExp;
  requiredScopes: string[];
  allowSandbox: boolean;
  extractPatientId: (path: string, body: unknown) => string | null;
};

export const endpointPolicies: EndpointPolicy[] = [
  {
    name: "Read synthetic patient FHIR bundle",
    method: "GET",
    pathPattern: /^\/fhir\/patient\/([^/]+)$/,
    requiredScopes: [
      "patient/Patient.read",
      "patient/Condition.read",
      "patient/MedicationRequest.read",
      "patient/Observation.read"
    ],
    allowSandbox: false,
    extractPatientId: (path) =>
      path.match(/^\/fhir\/patient\/([^/]+)$/)?.[1] ?? null
  },
  {
    name: "Submit prior authorization package",
    method: "POST",
    pathPattern: /^\/prior-auth$/,
    requiredScopes: ["payer/PriorAuth.write"],
    allowSandbox: false,
    extractPatientId: (_path, body) => {
      if (body && typeof body === "object" && "patientId" in body) {
        return String((body as { patientId: unknown }).patientId);
      }
      return null;
    }
  }
];

export function findEndpointPolicy(
  method: string,
  path: string
): EndpointPolicy | null {
  return (
    endpointPolicies.find(
      (policy) =>
        policy.method === method.toUpperCase() && policy.pathPattern.test(path)
    ) ?? null
  );
}

export function routeFromScore(score: number): TrustRoute {
  if (score >= 85) return "prod";
  if (score >= 70) return "prod_throttled";
  if (score >= 50) return "sandbox";
  return "sandbox_only";
}

export function tierFromScore(score: number): string {
  if (score >= 95) return "AAA";
  if (score >= 90) return "AA";
  if (score >= 85) return "A";
  if (score >= 75) return "BAA";
  if (score >= 65) return "BA";
  if (score >= 50) return "B";
  if (score >= 35) return "CAA";
  if (score >= 20) return "CA";
  return "C";
}

export function isAllowedRoute(route: TrustRoute): boolean {
  return route === "prod" || route === "prod_throttled";
}
