import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents/:id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, color: true } },
      collaborators: { include: { user: { select: { id: true, name: true, color: true } } } }
    }
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  return NextResponse.json({ document });
}

// PATCH /api/documents/:id  { title?, content? }
// Used for autosave and title renames.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.trim() || "Untitled document";
  if (body.content !== undefined) data.content = body.content;

  const document = await prisma.document.update({
    where: { id: params.id },
    data
  });

  return NextResponse.json({ document });
}

// DELETE /api/documents/:id
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
