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

  const pages = await prisma.page.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pages);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const body = await req.json();
  const { title, content } = body;
  if (!title) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const created = await prisma.page.create({
    data: { title, content: content ?? "", projectId },
  });
  return NextResponse.json(created);
}
