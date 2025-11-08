import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const columns = await prisma.column.findMany({
    where: { projectId },
    include: { cards: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(columns);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const { columnId, title, description, assignee, dueDate, labels } = body;
  if (!columnId || !title)
    return NextResponse.json({ error: "invalid" }, { status: 400 });

  const card = await prisma.card.create({
    data: {
      columnId,
      title,
      description,
      assignee: assignee || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      labels: labels || null,
    },
  });

  // Create activity
  await prisma.activity.create({
    data: {
      projectId,
      userId,
      type: "card_create",
      content: `Created card "${title}"`,
      metadata: { cardId: card.id, columnId },
    },
  });

  return NextResponse.json(card);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { cardId, toColumnId, toOrder } = body;
  if (!cardId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: { include: { project: true } } },
  });
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!card.column || !card.column.project)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (card.column.project.id !== projectId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (card.column.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const data: any = {};
  const oldColumnId = card.columnId;
  const oldAssignee = card.assignee;

  if (toColumnId) data.columnId = toColumnId;
  if (typeof toOrder !== "undefined") data.order = toOrder;
  if (typeof body.title !== "undefined") data.title = body.title;
  if (typeof body.description !== "undefined")
    data.description = body.description;
  if (typeof body.assignee !== "undefined") data.assignee = body.assignee;
  if (typeof body.dueDate !== "undefined")
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (typeof body.labels !== "undefined") data.labels = body.labels;

  const updated = await prisma.card.update({ where: { id: cardId }, data });

  // Create activities for significant changes
  if (toColumnId && toColumnId !== oldColumnId) {
    const fromCol = await prisma.column.findUnique({
      where: { id: oldColumnId },
    });
    const toCol = await prisma.column.findUnique({ where: { id: toColumnId } });
    await prisma.activity.create({
      data: {
        projectId,
        userId,
        type: "card_move",
        content: `Moved "${card.title}" from ${fromCol?.title || "?"} to ${
          toCol?.title || "?"
        }`,
        metadata: { cardId, fromColumnId: oldColumnId, toColumnId },
      },
    });
  }

  if (body.assignee && body.assignee !== oldAssignee) {
    await prisma.activity.create({
      data: {
        projectId,
        userId,
        type: "card_assign",
        content: `Assigned "${card.title}" to ${body.assignee}`,
        metadata: { cardId, assignee: body.assignee },
      },
    });
  }

  if (body.title && body.title !== card.title) {
    await prisma.activity.create({
      data: {
        projectId,
        userId,
        type: "card_edit",
        content: `Edited card "${card.title}"`,
        metadata: { cardId, field: "title" },
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { cardId } = body;
  if (!cardId) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: { include: { project: true } } },
  });
  if (!card) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!card.column || !card.column.project)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (card.column.project.id !== projectId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (card.column.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.card.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
