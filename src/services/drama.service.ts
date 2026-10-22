import type { Config } from "../infrastructure/config/index.js";
import { ProviderUnavailableError } from "../shared/errors/index.js";
import { createProvider } from "../integrations/providers/registry.js";
import type { Episode, SeriesDetail } from "../shared/types/index.js";

export interface DramaBundle {
  provider: string;
  detail: SeriesDetail;
  episodes: Episode[];
}

/** Detail + episode satu judul dari provider asal. */
export class DramaService {
  constructor(private readonly config: Config) {}

  async getDrama(providerSlug: string, id: string): Promise<DramaBundle> {
    const provider = createProvider(providerSlug, this.config);
    try {
      const [detail, episodes] = await Promise.all([provider.detail(id), provider.episodes(id)]);
      return { provider: providerSlug, detail, episodes };
    } catch (err) {
      throw new ProviderUnavailableError(providerSlug, err);
    }
  }
}
