import { describe, expect, it } from 'vitest';
import { FIXTURE_NOW, incidents, mockRoutes } from '../test/fixtures';
import {
  formatKilometers,
  formatMeters,
  formatRelativeTime,
  freshnessBadge,
  incidentTimeLabel,
  routeMatchSpokenLabel,
  routeProgressLabel,
} from './incidentPresentation';
import { analyzeRoutes } from './matching/routeAnalysis';

const byId = (id: string) => incidents.find((item) => item.id === id)!;

describe('incident presentation', () => {
  it('formats distances in Thai units', () => {
    expect(formatMeters(123)).toBe('120 ม.');
    expect(formatMeters(3)).toBe('10 ม.');
    expect(formatMeters(3240)).toBe('3.2 กม.');
    expect(formatKilometers(0.83)).toBe('0.8 กม.');
  });

  it('formats relative time and unknown timestamps', () => {
    expect(formatRelativeTime(FIXTURE_NOW - 12 * 60_000, FIXTURE_NOW)).toBe(
      '12 นาทีที่แล้ว',
    );
    expect(formatRelativeTime(FIXTURE_NOW - 3 * 3_600_000, FIXTURE_NOW)).toBe(
      '3 ชม. ที่แล้ว',
    );
    expect(incidentTimeLabel(byId('longdo:flood-01'), FIXTURE_NOW)).toBe(
      'อัปเดต 12 นาทีที่แล้ว',
    );
    expect(incidentTimeLabel(byId('traffy:road-03'), FIXTURE_NOW)).toBe(
      'รายงาน 19 ชม. ที่แล้ว',
    );
    expect(
      incidentTimeLabel(
        { ...byId('traffy:road-03'), reportedAt: undefined },
        FIXTURE_NOW,
      ),
    ).toBe('ไม่ทราบเวลาอัปเดต');
  });

  it('labels old and status-unknown reports without claiming they are live', () => {
    expect(freshnessBadge(byId('traffy:construction-04'), FIXTURE_NOW)).toBe(
      'ข้อมูลเก่า',
    );
    expect(freshnessBadge(byId('traffy:road-03'), FIXTURE_NOW)).toBe(
      'ไม่ทราบสถานะล่าสุด',
    );
    expect(
      freshnessBadge(byId('longdo:flood-01'), FIXTURE_NOW),
    ).toBeUndefined();
    // An "active" report older than 24 h is still shown as old data.
    expect(
      freshnessBadge(
        { ...byId('longdo:flood-01'), updatedAt: '2026-09-24T00:00:00Z' },
        FIXTURE_NOW,
      ),
    ).toBe('ข้อมูลเก่า');
  });

  it('describes route relation as proximity, never certainty or safety', () => {
    const [primary, alternative] = analyzeRoutes(
      mockRoutes,
      incidents,
      FIXTURE_NOW,
    );
    const labels = [...primary!.matches, ...alternative!.matches].map((match) =>
      routeMatchSpokenLabel(match, FIXTURE_NOW),
    );
    for (const label of labels) {
      expect(label).toMatch(/^มีรายงาน/);
      expect(label).toContain('ใกล้เส้นทางประมาณ');
      expect(label).not.toMatch(/ปลอดภัย|แน่นอน|เรียลไทม์|บนถนนเส้นนี้/);
    }
    expect(labels[0]).toContain('Longdo/iTIC');
    expect(routeProgressLabel(primary!.matches[0]!)).toBe('ข้างหน้า 1.3 กม.');
    expect(labels.some((label) => label.includes('อาจอยู่บนถนนคู่ขนาน'))).toBe(
      true,
    );
  });
});
