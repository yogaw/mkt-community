import { toMarketIndexSnapshotDto } from "@/features/market-index/market-index-mappers";
import type {
  CreateMarketIndexInput,
  MarketIndexSnapshotDto,
} from "@/features/market-index/market-index-types";
import type { MarketIndexRepository } from "@/features/market-index/repository/market-index-repository";
import { marketIndexRepository } from "@/features/market-index/repository/market-index-repository";

export interface MarketIndexService {
  getLatest(): Promise<MarketIndexSnapshotDto | null>;
  postSnapshot(input: CreateMarketIndexInput): Promise<MarketIndexSnapshotDto>;
}

export class MarketIndexServiceImpl implements MarketIndexService {
  constructor(private readonly repository: MarketIndexRepository) {}

  async getLatest(): Promise<MarketIndexSnapshotDto | null> {
    const snapshot = await this.repository.findLatest();
    return snapshot ? toMarketIndexSnapshotDto(snapshot) : null;
  }

  async postSnapshot(input: CreateMarketIndexInput): Promise<MarketIndexSnapshotDto> {
    //每 post is a new row rather than an edit, so the history is preserved.
    const snapshot = await this.repository.create(input);
    return toMarketIndexSnapshotDto(snapshot);
  }
}

export const marketIndexService: MarketIndexService = new MarketIndexServiceImpl(
  marketIndexRepository,
);
