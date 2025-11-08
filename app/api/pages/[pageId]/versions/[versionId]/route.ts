import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params:
      | Promise<{ pageId: string; versionId: string }>
      | { pageId: string; versionId: string };
  }
) {
  const { pageId, versionId } = (await params) as {
    pageId: string;
    versionId: string;
  };
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

  const version = await prisma.pageVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.pageId !== pageId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(version);
}

export async function POST(
  req: Request,
  {
    params,
  }: {
    params:
      | Promise<{ pageId: string; versionId: string }>
      | { pageId: string; versionId: string };
  }
) {
  const { pageId, versionId } = (await params) as {
    pageId: string;
    versionId: string;
  };
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

  const version = await prisma.pageVersion.findUnique({
    where: { id: versionId },
  });

  if (!version || version.pageId !== pageId)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  // Restore by updating the current page with version content
  // This will trigger a new version creation on next save
  const updated = await prisma.page.update({
    where: { id: pageId },
    data: {
      title: version.title,
      content: version.content,
    },
  });

  return NextResponse.json(updated);
}
