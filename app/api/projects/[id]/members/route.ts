import { NextResponse } from "next/server";
import { getAuth, clerkClient } from "@clerk/nextjs/server";

// Get list of users for mention suggestions
// In a real app, this would return project members; for now returns recent Clerk users
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: projectId } = (await params) as { id: string };
  const { userId } = getAuth(req as any);
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const client = await clerkClient();

    // Always include the current user first
    const currentUser = await client.users.getUser(userId);
    const members = [
      {
        id: currentUser.id,
        name: currentUser.fullName || currentUser.firstName || currentUser.id,
        email: currentUser.emailAddresses[0]?.emailAddress || "",
        image: currentUser.imageUrl || null,
      },
    ];

    // Try to fetch other users
    try {
      const userList = await client.users.getUserList({ limit: 20 });
      const otherUsers = userList.data
        .filter((u) => u.id !== userId) // exclude current user
        .map((u) => ({
          id: u.id,
          name: u.fullName || u.firstName || u.id,
          email: u.emailAddresses[0]?.emailAddress || "",
          image: u.imageUrl || null,
        }));

      members.push(...otherUsers);
    } catch (err) {
      console.log("Could not fetch other users, using current user only");
    }

    return NextResponse.json(members);
  } catch (err) {
    console.error("Members API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
