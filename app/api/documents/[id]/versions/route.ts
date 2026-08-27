import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents/:id/versions
// Returns version history, newest first.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: params.id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, color: true } } }
  });
  return NextResponse.json({ versions });
}

// POST /api/documents/:id/versions  { userId, label? }
// Snapshots the document's *current* content as a new version.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { userId, label } = body ?? {};

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Avoid creating back-to-back duplicate autosave snapshots.
  const last = await prisma.documentVersion.findFirst({
    where: { documentId: params.id },
    orderBy: { createdAt: "desc" }
  });
  if (last && JSON.stringify(last.content) === JSON.stringify(document.content) && label !== "Manual save") {
    return NextResponse.json({ version: last, deduped: true });
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: params.id,
      title: document.title,
      content: document.content as object,
      label: label || "Autosave",
      createdById: userId ?? null
    },
    include: { createdBy: { select: { id: true, name: true, color: true } } }
  });

  return NextResponse.json({ version }, { status: 201 });
}
