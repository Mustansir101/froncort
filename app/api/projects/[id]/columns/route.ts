import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const body = await req.json();
  const { title } = body;
  if (!title) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const max = await prisma.column.findFirst({
    where: { projectId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (max?.order ?? 0) + 1;
  const created = await prisma.column.create({
    data: { title, projectId, order: nextOrder },
  });
  return NextResponse.json(created);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const body = await req.json();
  const { columnId, title } = body;
  if (!columnId || typeof title === "undefined")
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const col = await prisma.column.findUnique({
    where: { id: columnId },
    include: { project: true },
  });
  if (!col) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!col.project || col.project.id !== projectId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (col.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const updated = await prisma.column.update({
    where: { id: columnId },
    data: { title },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const body = await req.json();
  const { columnId } = body;
  if (!columnId)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const col = await prisma.column.findUnique({
    where: { id: columnId },
    include: { project: true },
  });
  if (!col) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!col.project || col.project.id !== projectId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (col.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    await prisma.$transaction([
      prisma.card.deleteMany({ where: { columnId } }),
      prisma.column.delete({ where: { id: columnId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete column", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
