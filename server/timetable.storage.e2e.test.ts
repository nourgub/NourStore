import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db/shared";
import { createEmailUser } from "./db/usersAuth";
import { emailOpenId, hashPassword } from "./_core/emailAuth";
import { users, type User } from "../drizzle/schema";
import { SECONDARY_STREAM_TEMPLATES } from "@shared/secondaryCurriculum";
import type { Section, Teacher } from "@shared/secondaryTimetable";

/**
 * REAL DATABASE coverage for timetable storage: the SQL of migration
 * drizzle/0023_add_secondary_timetables.sql, and the ownership rule that
 * one school's timetable is invisible to another account.
 *
 * Skipped — not faked as passing — when DATABASE_URL is unset, the same way
 * realDb.e2e.test.ts is: these tests only prove something against real
 * MySQL with the migrations applied.
 *
 *   DATABASE_URL="mysql://user:pass@host:3306/db" JWT_SECRET=... pnpm test timetable.storage
 */
const HAS_DB = !!process.env.DATABASE_URL;

if (!HAS_DB) {
  // eslint-disable-next-line no-console
  console.warn(
    "[timetable.storage.e2e.test.ts] SKIPPED — no DATABASE_URL set. The " +
      "timetable storage layer and its ownership checks are only proven " +
      "against a real MySQL instance with drizzle/0023 applied."
  );
}

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function ctxFor(user: User): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

async function mustGetDb() {
  const db = await getDb();
  if (!db) throw new Error("Expected a real database connection in this suite");
  return db;
}

async function makeUser(
  label: string,
  role: "institution" | "admin"
): Promise<User> {
  const email = `${label}-${RUN}@nourix.test`;
  const openId = emailOpenId(email);
  const result = await createEmailUser({
    openId,
    email,
    name: label,
    passwordHash: await hashPassword("Fixture-Pass-123"),
  });
  if (!result.ok) throw new Error(`Failed to create fixture user ${email}`);
  const db = await mustGetDb();
  await db.update(users).set({ role }).where(eq(users.openId, openId));
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  if (!rows[0]) throw new Error(`Fixture user not found: ${email}`);
  return rows[0];
}

function sectionOf(streamId: string, label: string): Section {
  const stream = SECONDARY_STREAM_TEMPLATES.find(s => s.id === streamId);
  if (!stream) throw new Error(`unknown stream ${streamId}`);
  return {
    id: label,
    label,
    level: stream.level,
    stream: stream.id,
    requirements: stream.subjects.map(subject => ({ ...subject })),
  };
}

describe.skipIf(!HAS_DB)("REAL DB — secondary timetable storage", () => {
  let schoolA: User;
  let schoolB: User;
  let admin: User;
  let sections: Section[];
  let teachers: Teacher[];

  beforeAll(async () => {
    schoolA = await makeUser("timetable-school-a", "institution");
    schoolB = await makeUser("timetable-school-b", "institution");
    admin = await makeUser("timetable-admin", "admin");
    sections = [sectionOf("3AS-experimental-sciences", `3 ع ت ${RUN}`)];
    const hours = new Map<string, number>();
    for (const row of sections[0].requirements) {
      hours.set(row.subjectId, row.weeklyHours);
    }
    teachers = Array.from(hours.entries()).map(([subjectId]) => ({
      id: subjectId,
      name: `أستاذ ${subjectId}`,
      rank: "standard" as const,
      subjectIds: [subjectId],
    }));
  });

  it("saves a generated timetable and reads it back unchanged", async () => {
    const caller = appRouter.createCaller(ctxFor(schoolA));
    const generated = await caller.timetable.generate({
      sections,
      teachers,
      options: { seed: 5 },
    });
    expect(generated.sessions.length).toBeGreaterThan(0);

    const { id } = await caller.timetable.save({
      name: `جدول ${RUN}`,
      schoolYear: "2025/2026",
      status: "draft",
      config: { sections, teachers },
      sessions: generated.sessions,
    });
    const loaded = await caller.timetable.get({ id });
    expect(loaded.name).toBe(`جدول ${RUN}`);
    expect(loaded.schoolYear).toBe("2025/2026");
    // The whole week survives the round trip, which is what lets a saved
    // timetable be re-validated later against the same rules.
    expect(loaded.sessions).toEqual(generated.sessions);
    expect((loaded.config as { sections: Section[] }).sections).toHaveLength(
      sections.length
    );

    const mine = await caller.timetable.list();
    expect(mine.map(row => row.id)).toContain(id);
  });

  it("hides one school's timetable from another school, and lets an admin see it", async () => {
    const ownerCaller = appRouter.createCaller(ctxFor(schoolA));
    const { id } = await ownerCaller.timetable.save({
      name: `جدول خاص ${RUN}`,
      schoolYear: "2025/2026",
      status: "draft",
      config: { sections, teachers },
      sessions: [],
    });

    const otherCaller = appRouter.createCaller(ctxFor(schoolB));
    await expect(otherCaller.timetable.get({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      otherCaller.timetable.save({
        id,
        name: "محاولة تعديل",
        schoolYear: "2025/2026",
        status: "published",
        config: { sections, teachers },
        sessions: [],
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(otherCaller.timetable.remove({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(
      (await otherCaller.timetable.list()).map(row => row.id)
    ).not.toContain(id);

    // The other school's attempted rename never landed.
    expect((await ownerCaller.timetable.get({ id })).name).toBe(
      `جدول خاص ${RUN}`
    );

    const adminCaller = appRouter.createCaller(ctxFor(admin));
    expect((await adminCaller.timetable.get({ id })).name).toBe(
      `جدول خاص ${RUN}`
    );
  });

  it("updates in place and deletes only the owner's own timetable", async () => {
    const caller = appRouter.createCaller(ctxFor(schoolA));
    const { id } = await caller.timetable.save({
      name: `جدول للتعديل ${RUN}`,
      schoolYear: "2025/2026",
      status: "draft",
      config: { sections, teachers },
      sessions: [],
    });
    const again = await caller.timetable.save({
      id,
      name: `جدول معدّل ${RUN}`,
      schoolYear: "2026/2027",
      status: "published",
      config: { sections, teachers },
      sessions: [],
    });
    expect(again.id).toBe(id);
    const loaded = await caller.timetable.get({ id });
    expect(loaded.name).toBe(`جدول معدّل ${RUN}`);
    expect(loaded.status).toBe("published");
    expect(loaded.schoolYear).toBe("2026/2027");

    await expect(caller.timetable.remove({ id })).resolves.toEqual({
      ok: true,
    });
    await expect(caller.timetable.get({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
