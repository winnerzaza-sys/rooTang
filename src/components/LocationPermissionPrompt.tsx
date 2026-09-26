import { Icon } from './Icons';

interface Props {
  mode?: 'card' | 'dialog';
  onAllow: () => void;
  onLater: () => void;
}

/** Context shown before the browser's geolocation permission prompt. */
export function LocationPermissionPrompt({
  mode = 'card',
  onAllow,
  onLater,
}: Props) {
  const content = (
    <section
      className={`location-soft-prompt ${mode}`}
      role={mode === 'dialog' ? 'dialog' : 'region'}
      aria-modal={mode === 'dialog' ? 'true' : undefined}
      aria-labelledby={`location-prompt-title-${mode}`}
    >
      <span className="state-icon" aria-hidden="true">
        <Icon name="locate" />
      </span>
      <h2 id={`location-prompt-title-${mode}`}>ใช้ตำแหน่งของคุณ</h2>
      <p>
        รู้ทางใช้ตำแหน่งเพื่อแสดงเหตุการณ์ใกล้คุณ
        และใช้เป็นต้นทางเริ่มต้นในการค้นหาเส้นทาง
      </p>
      <div className="location-prompt-actions">
        <button
          type="button"
          className="primary-button"
          autoFocus={mode === 'dialog'}
          onClick={onAllow}
        >
          ใช้ตำแหน่งของฉัน
        </button>
        <button type="button" className="secondary-button" onClick={onLater}>
          ไว้ทีหลัง
        </button>
      </div>
    </section>
  );

  return mode === 'dialog' ? (
    <div className="sheet-backdrop location-prompt-backdrop">{content}</div>
  ) : (
    content
  );
}
