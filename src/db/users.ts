import { db } from "./index.ts";
import { users } from "./schema.ts";

export async function getOrCreateUser(uid: string, email: string, name: string) {
  try {
    const result = await db.insert(users)
      .values({
        id: uid,
        email,
        name,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          name,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query in getOrCreateUser failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
