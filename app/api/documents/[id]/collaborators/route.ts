import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/documents/:id/collaborators  { userId, name, color, role? }
// Adds (or upserts) a collaborator on a document. Used when someone opens
// a shared document link for the first time.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { userId, name, color, role } = body ?? {};
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

  await prisma.user.upsert({
    where: { id: userId },
    update: { name: name ?? undefined, color: color ?? undefined },
    create: { id: userId, name: name ?? "Anonymous", color: color ?? "#6366f1" }
  });

  const document = await prisma.document.findUnique({ where: { id: params.id } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (document.ownerId !== userId) {
    await prisma.documentCollaborator.upsert({
      where: { documentId_userId: { documentId: params.id, userId } },
      update: {},
      create: { documentId: params.id, userId, role: role ?? "editor" }
    });
  }

  return NextResponse.json({ ok: true });
}
