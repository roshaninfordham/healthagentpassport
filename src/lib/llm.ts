export type CareAdminSummary = {
  title: string;
  safeAdminSummary: string;
  missingDocuments: string[];
  nextSteps: string[];
  safetyFlags: string[];
};

const deterministicSummary: CareAdminSummary = {
  title: "Prior authorization package ready",
  safeAdminSummary:
    "TrustedCareAgent retrieved a scoped synthetic FHIR bundle for Maya Patel and assembled a synthetic prior-authorization package for cardiology follow-up. This is administrative support only and does not provide diagnosis or treatment advice.",
  missingDocuments: [
    "Recent A1C observation",
    "Medication list",
    "Relevant diagnosis list",
    "Specialist referral note"
  ],
  nextSteps: [
    "Send prior-auth package to payer portal",
    "Confirm specialist appointment availability",
    "Log completion in care coordination system"
  ],
  safetyFlags: [
    "synthetic_data_only",
    "no_medical_advice",
    "scoped_patient_delegation"
  ]
};

export async function makeCareAdminSummary(input: {
  patientCall: unknown;
  priorAuthCall: unknown;
}): Promise<CareAdminSummary> {
  if (process.env.LLM_MODE !== "openai" || !process.env.OPENAI_API_KEY) {
    return deterministicSummary;
  }

  try {
    const importer = new Function(
      "specifier",
      "return import(specifier)"
    ) as (specifier: string) => Promise<{ default: unknown }>;
    const OpenAI = (await importer("openai")).default as new (input: {
      apiKey: string;
    }) => {
      responses: {
        create: (params: Record<string, unknown>) => Promise<{
          output_text: string;
        }>;
      };
    };

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You summarize approved synthetic care-admin data. Do not diagnose, recommend treatment, or alter authorization decisions."
        },
        { role: "user", content: JSON.stringify(input) }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "care_admin_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "title",
              "safeAdminSummary",
              "missingDocuments",
              "nextSteps",
              "safetyFlags"
            ],
            properties: {
              title: { type: "string" },
              safeAdminSummary: { type: "string" },
              missingDocuments: { type: "array", items: { type: "string" } },
              nextSteps: { type: "array", items: { type: "string" } },
              safetyFlags: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    return JSON.parse(response.output_text) as CareAdminSummary;
  } catch (error) {
    console.error("LLM summary failed; using deterministic fallback.", error);
    return {
      ...deterministicSummary,
      safetyFlags: [...deterministicSummary.safetyFlags, "llm_fallback_used"]
    };
  }
}
