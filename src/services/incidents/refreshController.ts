export const INCIDENT_REFRESH_MS = 120_000;

export class IncidentRefreshController {
  private timer?: number;
  private lastUpdated = 0;
  constructor(
    private readonly refresh: () => void,
    private readonly online = () => navigator.onLine,
  ) {}
  markUpdated(timestamp = Date.now()) {
    this.lastUpdated = timestamp;
  }
  start() {
    this.stop();
    this.timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && this.online())
        this.refresh();
    }, INCIDENT_REFRESH_MS);
  }
  handleVisible(now = Date.now()) {
    if (
      document.visibilityState === 'visible' &&
      this.online() &&
      now - this.lastUpdated >= INCIDENT_REFRESH_MS
    )
      this.refresh();
  }
  stop() {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
  }
}
