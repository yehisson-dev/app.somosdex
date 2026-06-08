import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import sql from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existing = await sql`SELECT id FROM users WHERE email = ${user.email} LIMIT 1`;

          // Solo pueden entrar usuarios pre-registrados por el admin
          if (!existing[0]) {
            return false;
          }

          // Actualizar avatar y nombre si cambiaron en Google
          await sql`
            UPDATE users SET
              full_name = ${user.name ?? null},
              avatar_url = ${user.image ?? null},
              updated_at = now()
            WHERE email = ${user.email}
          `;

          // Agregar al canal General si aún no es miembro
          const generalChannel = await sql`
            SELECT id FROM channels WHERE type = 'general' LIMIT 1
          `;

          if (generalChannel[0]) {
            const channelId = (generalChannel[0] as any).id;
            const userId = (existing[0] as any).id;
            const membership = await sql`
              SELECT channel_id FROM channel_members
              WHERE channel_id = ${channelId} AND user_id = ${userId}
              LIMIT 1
            `;

            if (!membership[0]) {
              await sql`
                INSERT INTO channel_members (channel_id, user_id)
                VALUES (${channelId}, ${userId})
                ON CONFLICT DO NOTHING
              `;
            }
          }
        } catch (err) {
          console.error("[auth] signIn error:", err);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token.profile) {
        const p = token.profile as any;
        session.user.id        = p.id;
        session.user.role      = p.role;
        session.user.job_title = p.job_title;
        session.user.full_name = p.full_name;
      }
      return session;
    },
    async jwt({ token, user, trigger }) {
      if (user || trigger === "update" || !token.profile) {
        const email = token.email ?? user?.email;
        if (email) {
          try {
            const rows = await sql`
              SELECT id, role, job_title, full_name, avatar_url
              FROM users WHERE email = ${email} LIMIT 1
            `;
            if (rows[0]) token.profile = rows[0];
          } catch (err) {
            console.error("[auth] jwt profile error:", err);
          }
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      job_title: string;
      full_name: string;
    };
  }
}
