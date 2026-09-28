import { Icon } from './Icons';

interface Props {
  onClose: () => void;
  onRetry: () => void;
  onSelectArea: () => void;
}

/** Recovery instructions shown after the browser has blocked location access. */
export function LocationPermissionHelp({
  onClose,
  onRetry,
  onSelectArea,
}: Props) {
  return (
    <div className="sheet-backdrop location-prompt-backdrop">
      <section
        className="location-soft-prompt dialog location-permission-help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-permission-help-title"
      >
        <button
          type="button"
          className="icon-button sheet-close"
          aria-label="ปิดคำแนะนำ"
          onClick={onClose}
        >
          ×
        </button>
        <span className="state-icon" aria-hidden="true">
          <Icon name="locate" />
        </span>
        <h2 id="location-permission-help-title">เปิดสิทธิ์ตำแหน่ง</h2>
        <p>
          หลังเลือก Don’t Allow เบราว์เซอร์จะไม่ถามซ้ำ
          กรุณาเปิดสิทธิ์จากการตั้งค่าของอุปกรณ์
        </p>
        <ol>
          <li>เปิด การตั้งค่า บน iPhone หรือ iPad</li>
          <li>ไปที่ ความเป็นส่วนตัวและความปลอดภัย → บริการหาตำแหน่งที่ตั้ง</li>
          <li>เลือก รู้ทาง หรือเว็บไซต์ Safari แล้วเลือก ขณะใช้แอป</li>
          <li>กลับมาที่รู้ทาง แล้วกด “ลองตำแหน่งอีกครั้ง”</li>
        </ol>
        <div className="location-prompt-actions">
          <button
            type="button"
            className="primary-button"
            autoFocus
            onClick={onRetry}
          >
            ลองตำแหน่งอีกครั้ง
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onSelectArea}
          >
            เลือกพื้นที่แทน
          </button>
        </div>
      </section>
    </div>
  );
}
