import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    include: { pages: true, columns: true },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;
  if (!name)
    return NextResponse.json({ error: "name required" }, { status: 400 });

  const project = await prisma.project.create({
    data: { name, description, ownerId: userId },
  });
  console.log("[api/projects] created project", project.id);
  const existingCount = await prisma.column.count({
    where: { projectId: project.id },
  });
  if (existingCount === 0) {
    const defs = ["To do", "In progress", "Done"];
    for (let i = 0; i < defs.length; i++) {
      await prisma.column.create({
        data: { title: defs[i], order: i, projectId: project.id },
      });
    }
  } else {
    console.log(
      `[api/projects] project ${project.id} already has ${existingCount} columns, skipping default creation`
    );
  }
  const created = await prisma.project.findUnique({
    where: { id: project.id },
    include: { columns: true },
  });
  return NextResponse.json(created);
}
