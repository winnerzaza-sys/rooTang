import type { DemoState } from '../domain/types';

export function SystemBanners({ state }: { state: DemoState }) {
  if (state === 'offline')
    return (
      <div className="system-banner danger" role="alert">
        <strong>คุณกำลังออฟไลน์</strong>
        <span>
          ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อค้นหาเส้นทางและอัปเดตเหตุการณ์
        </span>
      </div>
    );
  if (state === 'partial')
    return (
      <div className="system-banner warning" role="status" aria-live="polite">
        <strong>ข้อมูลบางแหล่งยังไม่พร้อม</strong>
        <span>
          ผลลัพธ์อาจไม่ครบถ้วน{' '}
          <button type="button" className="text-button">
            ลองใหม่
          </button>
        </span>
      </div>
    );
  if (state === 'all-unavailable')
    return (
      <div className="system-banner danger" role="alert">
        <strong>ยังโหลดข้อมูลเหตุการณ์ไม่ได้</strong>
        <span>ข้อมูลทุกแหล่งยังไม่พร้อม กรุณาลองใหม่</span>
      </div>
    );
  if (state === 'stale')
    return (
      <div className="system-banner warning" role="status">
        <strong>กำลังแสดงข้อมูลที่บันทึกไว้</strong>
        <span>อัปเดตล่าสุด 25 กันยายน 2569 เวลา 18:20 น.</span>
      </div>
    );
  return null;
}
