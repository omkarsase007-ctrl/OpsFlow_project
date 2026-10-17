import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getAllUsers } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const allUsers = await getAllUsers();
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      currentUser: user,
      users: allUsers,
      teams,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "userId is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { team: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        teamId: user.teamId,
        teamName: user.team?.name || null,
      },
    });

    // Set HTTP-only session cookie
    response.cookies.set("opsflow_session_user", user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
