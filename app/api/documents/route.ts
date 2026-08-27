import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/documents?userId=xxx
// Lists documents owned by, or shared with, the given user.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const documents = await prisma.document.findMany({
    where: {
      OR: [{ ownerId: userId }, { collaborators: { some: { userId } } }]
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, color: true } },
      collaborators: { include: { user: { select: { id: true, name: true, color: true } } } },
      _count: { select: { versions: true } }
    }
  });

  return NextResponse.json({ documents });
}

// POST /api/documents  { userId, title? }
// Creates a new document owned by the given user.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, title } = body ?? {};
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Ensure the user row exists (simple client-generated identity, no auth provider).
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: body.userName ?? "Anonymous", color: body.userColor ?? "#6366f1" }
  });

  const document = await prisma.document.create({
    data: {
      title: title?.trim() || "Untitled document",
      ownerId: userId,
      content: {}
    }
  });

  return NextResponse.json({ document }, { status: 201 });
}
