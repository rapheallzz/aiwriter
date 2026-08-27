import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      name: "Demo Writer",
      color: "#6366f1",
    },
  });

  const doc = await prisma.document.upsert({
    where: { id: "demo-doc" },
    update: {},
    create: {
      id: "demo-doc",
      title: "Welcome to AI Writer",
      ownerId: user.id,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Start writing here. Select text and use the AI toolbar to continue, improve, or summarize. Open this document in a second browser tab to see real-time collaboration in action.",
              },
            ],
          },
        ],
      },
    },
  });

  await prisma.documentVersion.create({
    data: {
      documentId: doc.id,
      title: doc.title,
      content: doc.content as any,
      label: "Manual save",
      createdById: user.id,
    },
  });

  console.log("Seeded:", { user: user.id, doc: doc.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
