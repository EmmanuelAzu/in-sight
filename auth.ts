import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/** Sign-in is optional: without these variables the app keeps study data in the browser. */
export const authEnabled = Boolean(process.env.AUTH_SECRET && process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, profile }) {
      if (profile && profile.id != null) token.uid = "gh:" + String(profile.id);
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.uid === "string") (session.user as { id?: string }).id = token.uid;
      return session;
    },
  },
});

export async function currentUser(): Promise<{ id: string; name: string } | null> {
  if (!authEnabled) return null;
  try {
    const s = await auth();
    const id = (s?.user as { id?: string } | undefined)?.id;
    return id ? { id, name: s?.user?.name || "Someone" } : null;
  } catch {
    return null;
  }
}
