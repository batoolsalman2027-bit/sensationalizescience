import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkCanGenerate, consumeEntitlement } from "@/lib/billing";
import { requireOperator } from "@/lib/operator";
import { createVideoRequest, listVideoRequests } from "@/lib/video-requests";
import {
  BRANDING_OPTIONS,
  NARRATION_VOICES,
  OUTPUT_ASPECTS,
  SCIENTIFIC_FIELDS,
  VIDEO_LENGTHS,
  brandingNeedsLogo,
  type BrandingId,
  type NarrationVoiceId,
  type OutputAspectId,
  type ScientificField,
  type VideoLengthId,
} from "@/config/create-preferences";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 40 * 1024 * 1024;
const MAX_LOGO_BYTES = 8 * 1024 * 1024;

/** POST — authenticated submit (checks free request / credits). GET — operator inbox. */
export async function GET() {
  const gate = await requireOperator();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const requests = listVideoRequests().map((r) => ({
    id: r.id,
    status: r.status,
    contactEmail: r.contactEmail,
    scientificField: r.scientificField,
    videoLength: r.videoLength,
    narrationVoice: r.narrationVoice,
    aspectRatio: r.aspectRatio,
    branding: r.branding,
    sourceFileName: r.sourceFileName,
    hasLogo: Boolean(r.logoPath),
    libraryJobId: r.libraryJobId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        {
          error:
            "Sign in to submit a production request — your finished video appears in My Library",
          needsAuth: true,
        },
        { status: 401 }
      );
    }

    const entitlement = await checkCanGenerate();
    if (!entitlement.ok) {
      return NextResponse.json(
        {
          error: entitlement.message,
          code: entitlement.code,
          needsCredits: true,
        },
        { status: 402 }
      );
    }

    const form = await req.formData();
    const pdf = form.get("pdf");
    if (!(pdf instanceof File) || pdf.size === 0) {
      return NextResponse.json({ error: "A PDF of your paper is required" }, { status: 400 });
    }
    if (pdf.type && pdf.type !== "application/pdf") {
      return NextResponse.json({ error: "Upload a PDF file" }, { status: 400 });
    }
    if (pdf.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF must be under 40 MB" }, { status: 400 });
    }

    const scientificFieldRaw = String(form.get("scientificField") ?? "").trim();
    const scientificFieldOther = String(form.get("scientificFieldOther") ?? "").trim();
    const videoLength = String(form.get("videoLength") ?? "").trim();
    const narrationVoice = String(form.get("narrationVoice") ?? "").trim();
    const aspectRatio = String(form.get("aspectRatio") ?? "").trim();
    const branding = String(form.get("branding") ?? "").trim();

    const contactEmail = session.email.toLowerCase();

    if (!SCIENTIFIC_FIELDS.includes(scientificFieldRaw as (typeof SCIENTIFIC_FIELDS)[number])) {
      return NextResponse.json({ error: "Select a scientific field" }, { status: 400 });
    }
    if (scientificFieldRaw === "Other" && !scientificFieldOther) {
      return NextResponse.json({ error: "Please specify your scientific field" }, { status: 400 });
    }
    if (!VIDEO_LENGTHS.some((v) => v.id === videoLength)) {
      return NextResponse.json({ error: "Select a video length" }, { status: 400 });
    }
    if (!NARRATION_VOICES.some((v) => v.id === narrationVoice)) {
      return NextResponse.json({ error: "Select a narration voice" }, { status: 400 });
    }
    if (!OUTPUT_ASPECTS.some((a) => a.id === aspectRatio)) {
      return NextResponse.json({ error: "Select an aspect ratio" }, { status: 400 });
    }
    if (!BRANDING_OPTIONS.some((b) => b.id === branding)) {
      return NextResponse.json({ error: "Select a branding option" }, { status: 400 });
    }

    const logoEntry = form.get("logo");
    let logoBuffer: Buffer | null = null;
    let logoFileName: string | null = null;
    if (brandingNeedsLogo(branding as BrandingId)) {
      if (!(logoEntry instanceof File) || logoEntry.size === 0) {
        return NextResponse.json(
          { error: "Upload your lab or university logo" },
          { status: 400 }
        );
      }
      if (logoEntry.size > MAX_LOGO_BYTES) {
        return NextResponse.json({ error: "Logo must be under 8 MB" }, { status: 400 });
      }
      logoBuffer = Buffer.from(await logoEntry.arrayBuffer());
      logoFileName = logoEntry.name;
    }

    const scientificField =
      scientificFieldRaw === "Other"
        ? scientificFieldOther
        : (scientificFieldRaw as ScientificField);

    const row = createVideoRequest({
      contactEmail,
      userId: session.id,
      scientificField,
      videoLength: videoLength as VideoLengthId,
      narrationVoice: narrationVoice as NarrationVoiceId,
      aspectRatio: aspectRatio as OutputAspectId,
      branding: branding as BrandingId,
      sourceFileName: pdf.name || "paper.pdf",
      pdfBuffer: Buffer.from(await pdf.arrayBuffer()),
      logoBuffer,
      logoFileName,
    });

    // Deduct free request or 1 credit only after the request is stored.
    consumeEntitlement(entitlement);

    return NextResponse.json({
      id: row.id,
      entitlementMode: entitlement.mode,
      message:
        "Request received. When production is complete, your video will appear in My Library — visible only on your account.",
    });
  } catch (err) {
    console.error("[video-requests POST]", err);
    return NextResponse.json({ error: "Could not submit your request" }, { status: 500 });
  }
}
