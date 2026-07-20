/**
 * 맞아요/틀려요 1인 1회 — 기기 단 차단 (localStorage).
 * 서버(Apps Script correctUids/wrongUids) 검증의 보조 장치로,
 * 네트워크 왕복 전에 즉시 중복 투표를 막는다.
 */
const KEY = (pinId: string) => `ktk-voted:${pinId}`;

export function hasVoted(pinId: string): boolean {
  try {
    return localStorage.getItem(KEY(pinId)) === "1";
  } catch {
    return false;
  }
}

export function markVoted(pinId: string): void {
  try {
    localStorage.setItem(KEY(pinId), "1");
  } catch {
    /* ignore */
  }
}
