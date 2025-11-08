import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

// Get activities for the authenticated user (across all their projects)
export async function GET(req: Request) {
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    // Get user's projects
    const userProjects = await prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const projectIds = userProjects.map((p: { id: string }) => p.id);

    // Fetch activities from user's projects (optionally filtered by projectId)
    const where = projectId ? { projectId } : { projectId: { in: projectIds } };

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(activities);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// Create a new activity
export async function POST(req: Request) {
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { projectId, type, content, metadata } = body;

    // Verify user owns the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.ownerId !== userId)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const activity = await prisma.activity.create({
      data: {
        projectId,
        userId,
        type,
        content,
        metadata,
      },
    });

    return NextResponse.json(activity);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}
