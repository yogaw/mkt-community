import { db } from "@/database";
import type { MarketIndexSnapshotModel } from "@/database/prisma/models";
import type { CreateMarketIndexInput } from "@/features/market-index/market-index-types";

export interface MarketIndexRepository {
  findLatest(): Promise<MarketIndexSnapshotModel | null>;
  create(input: CreateMarketIndexInput): Promise<MarketIndexSnapshotModel>;
}

export class PrismaMarketIndexRepository implements MarketIndexRepository {
  async findLatest(): Promise<MarketIndexSnapshotModel | null> {
    return db.marketIndexSnapshot.findFirst({ orderBy: { capturedAt: "desc" } });
  }

  async create(input: CreateMarketIndexInput): Promise<MarketIndexSnapshotModel> {
    return db.marketIndexSnapshot.create({ data: input });
  }
}

export const marketIndexRepository: MarketIndexRepository = new PrismaMarketIndexRepository();
