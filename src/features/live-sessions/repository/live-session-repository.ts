import { db } from "@/database";
import type { LiveSessionModel } from "@/database/prisma/models";
import { LiveSessionStatusKind } from "@/database/prisma/enums";

export interface LiveSessionRepository {
  /** Earliest SCHEDULED session strictly in the future; past, completed and cancelled never match. */
  findNextUpcoming(now: Date): Promise<LiveSessionModel | null>;
}

export class PrismaLiveSessionRepository implements LiveSessionRepository {
  findNextUpcoming(now: Date): Promise<LiveSessionModel | null> {
    return db.liveSession.findFirst({
      where: {
        status: LiveSessionStatusKind.SCHEDULED,
        scheduledAt: { gt: now },
        deletedAt: null,
      },
      orderBy: { scheduledAt: "asc" },
    });
  }
}

export const liveSessionRepository: LiveSessionRepository = new PrismaLiveSessionRepository();
