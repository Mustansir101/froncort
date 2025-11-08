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

  const versions = await prisma.pageVersion.findMany({
    where: { pageId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      title: true,
      createdAt: true,
      // don't return full content in list for performance
    },
  });

  return NextResponse.json(versions);
}
