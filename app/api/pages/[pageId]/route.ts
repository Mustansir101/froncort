import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> | { pageId: string } }
) {
  const { pageId } = (await params) as { pageId: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { project: true },
  });
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!page.project)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (page.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(page);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> | { pageId: string } }
) {
  const { pageId } = (await params) as { pageId: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { project: true },
  });
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!page.project)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (page.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, content } = body;

  // Get the latest version number for this page
  const latestVersion = await prisma.pageVersion.findFirst({
    where: { pageId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latestVersion?.version ?? 0) + 1;

  // Create a new version record before updating the page
  await prisma.pageVersion.create({
    data: {
      pageId,
      title,
      content,
      version: nextVersion,
    },
  });

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: { title, content },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ pageId: string }> | { pageId: string } }
) {
  const { pageId } = (await params) as { pageId: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { project: true },
  });
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!page.project)
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (page.project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.page.delete({ where: { id: pageId } });
  return NextResponse.json({ ok: true });
}
