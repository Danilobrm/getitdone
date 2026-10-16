import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export async function getUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, process.env.SESSION_SECRET ?? "");
}

/** The signed-in user's id, or a redirect to /login. Every page and action starts with this. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) redirect("/login");
  return id;
}

