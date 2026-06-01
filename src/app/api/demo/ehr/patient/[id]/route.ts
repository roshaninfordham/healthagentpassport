import {
  demoError,
  demoJson,
  getSyntheticPatient
} from "@/lib/internal-demo-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    return demoJson(getSyntheticPatient(params.id));
  } catch (error) {
    return demoError(error);
  }
}
