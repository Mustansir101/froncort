import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id },
    include: { pages: true, columns: { include: { cards: true } } },
  });
  if (!project)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(project);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const project = await prisma.project.update({ where: { id }, data: body });
  return NextResponse.json(project);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try {
    const cols = await prisma.column.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    const colIds = cols.map((c: { id: string }) => c.id);

    const tx: any[] = [];
    if (colIds.length)
      tx.push(prisma.card.deleteMany({ where: { columnId: { in: colIds } } }));
    tx.push(prisma.column.deleteMany({ where: { projectId: id } }));
    tx.push(prisma.page.deleteMany({ where: { projectId: id } }));
    tx.push(prisma.project.delete({ where: { id } }));

    await prisma.$transaction(tx);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete project and children", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
