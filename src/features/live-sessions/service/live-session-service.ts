import type { UpcomingSessionDto } from "@/features/live-sessions/live-session-types";
import { toUpcomingSessionDto } from "@/features/live-sessions/live-session-mappers";
import type { LiveSessionRepository } from "@/features/live-sessions/repository/live-session-repository";
import { liveSessionRepository } from "@/features/live-sessions/repository/live-session-repository";

export interface LiveSessionService {
  /** Next SCHEDULED session in the future, or null when none is upcoming. */
  getNextUpcomingSession(): Promise<UpcomingSessionDto | null>;
}

export class LiveSessionServiceImpl implements LiveSessionService {
  constructor(
    private readonly repository: LiveSessionRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getNextUpcomingSession(): Promise<UpcomingSessionDto | null> {
    const session = await this.repository.findNextUpcoming(this.clock());

    return session ? toUpcomingSessionDto(session) : null;
  }
}

export const liveSessionService: LiveSessionService = new LiveSessionServiceImpl(liveSessionRepository);
