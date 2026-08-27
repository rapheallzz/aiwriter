import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/documents/:id/versions/:versionId/restore
// Restores a past version as the document's current content.
// Also snapshots the pre-restore state so nothing is lost.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const body = await req.json().catch(() => ({}));
  const version = await prisma.documentVersion.findUnique({ where: { id: params.versionId } });
  if (!version || version.documentId !== params.id) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const current = await prisma.document.findUnique({ where: { id: params.id } });
  if (!current) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.documentVersion.create({
    data: {
      documentId: params.id,
      title: current.title,
      content: current.content as object,
      label: "Before restore",
      createdById: body.userId ?? null
    }
  });

  const document = await prisma.document.update({
    where: { id: params.id },
    data: { content: version.content as object, title: version.title }
  });

  return NextResponse.json({ document });
}
