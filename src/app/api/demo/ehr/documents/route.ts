import {
  demoError,
  demoJson,
  getSyntheticDocuments
} from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return demoJson(getSyntheticDocuments(new URL(request.url).searchParams));
  } catch (error) {
    return demoError(error);
  }
}
