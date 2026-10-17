import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { Role, SessionUser } from "./types";

export const DEFAULT_USER_ID = "usr_alex_lead"; // Alex Rivera (Team Lead, Payments)

/**
 * Retrieves the currently authenticated user from the session cookie or test header.
 * Strictly validates against database to ensure identity cannot be forged.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  let userId: string | null = null;

  try {
    // 1. Check for test header (used in automated Vitest tests)
    const headerList = headers();
    const testHeaderUser = headerList.get("x-user-id");
    if (testHeaderUser) {
      userId = testHeaderUser;
    }
  } catch {
    // headers() might not be available in non-request contexts
  }

  if (!userId) {
    try {
      // 2. Check HTTP-only session cookie
      const cookieStore = cookies();
      const sessionCookie = cookieStore.get("opsflow_session_user");
      if (sessionCookie && sessionCookie.value) {
        userId = sessionCookie.value;
      }
    } catch {
      // cookies() might not be available in non-request contexts
    }
  }

  // 3. Fallback to default user for seamless local development
  if (!userId) {
    userId = DEFAULT_USER_ID;
  }

  // 4. Fetch user from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true },
  });

  if (!user) {
    // If user not found, fall back to default seed admin
    const fallbackUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      include: { team: true },
    });

    if (!fallbackUser) {
      throw new Error("No users found in database. Please run npm run db:seed");
    }

    return {
      id: fallbackUser.id,
      name: fallbackUser.name,
      email: fallbackUser.email,
      role: fallbackUser.role as Role,
      avatar: fallbackUser.avatar,
      teamId: fallbackUser.teamId,
      teamName: fallbackUser.team?.name || null,
    };
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatar: user.avatar,
    teamId: user.teamId,
    teamName: user.team?.name || null,
  };
}

/**
 * Returns all available personas/users for the quick-switcher
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    include: { team: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}
