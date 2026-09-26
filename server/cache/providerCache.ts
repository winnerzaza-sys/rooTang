export interface CacheResult<T> {
  value: T;
  fetchedAt: string;
  stale: boolean;
}

export class ProviderCache<T> {
  private value?: T;
  private fetchedAt = 0;
  private inFlight?: Promise<CacheResult<T>>;
  constructor(
    private readonly ttlMs: number,
    private readonly now = () => Date.now(),
  ) {}

  async get(load: () => Promise<T>): Promise<CacheResult<T>> {
    if (this.value !== undefined && this.now() - this.fetchedAt < this.ttlMs) {
      return {
        value: this.value,
        fetchedAt: new Date(this.fetchedAt).toISOString(),
        stale: false,
      };
    }
    if (this.inFlight) return this.inFlight;
    this.inFlight = load()
      .then((value) => {
        this.value = value;
        this.fetchedAt = this.now();
        return {
          value,
          fetchedAt: new Date(this.fetchedAt).toISOString(),
          stale: false,
        };
      })
      .catch((error: unknown) => {
        if (this.value !== undefined)
          return {
            value: this.value,
            fetchedAt: new Date(this.fetchedAt).toISOString(),
            stale: true,
          };
        throw error;
      })
      .finally(() => {
        this.inFlight = undefined;
      });
    return this.inFlight;
  }
}
