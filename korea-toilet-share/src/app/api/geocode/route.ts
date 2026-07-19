import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface GeocodeResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Kakao Local REST API 프록시 (T-103) — REST 키는 서버 환경 변수로만 사용.
 * 주소 검색 + 키워드 검색 결과를 병합해 반환한다.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "MISSING_QUERY" }, { status: 400 });

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return NextResponse.json({ error: "NO_KAKAO_KEY" }, { status: 503 });

  const headers = { Authorization: `KakaoAK ${key}` };
  const enc = encodeURIComponent(q);

  try {
    const [addrRes, kwRes] = await Promise.all([
      fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${enc}&size=5`, { headers }),
      fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${enc}&size=5`, { headers }),
    ]);

    const results: GeocodeResult[] = [];
    const seen = new Set<string>();

    if (addrRes.ok) {
      const data = await addrRes.json();
      for (const d of data.documents ?? []) {
        const address = d.road_address?.address_name ?? d.address_name;
        const name = d.road_address?.building_name || address;
        const keyStr = `${d.y},${d.x}`;
        if (address && !seen.has(keyStr)) {
          seen.add(keyStr);
          results.push({ name, address, lat: Number(d.y), lng: Number(d.x) });
        }
      }
    }
    if (kwRes.ok) {
      const data = await kwRes.json();
      for (const d of data.documents ?? []) {
        const keyStr = `${d.y},${d.x}`;
        if (!seen.has(keyStr)) {
          seen.add(keyStr);
          results.push({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat: Number(d.y),
            lng: Number(d.x),
          });
        }
      }
    }

    return NextResponse.json({ results: results.slice(0, 8) });
  } catch {
    return NextResponse.json({ error: "GEOCODE_FAILED" }, { status: 502 });
  }
}
