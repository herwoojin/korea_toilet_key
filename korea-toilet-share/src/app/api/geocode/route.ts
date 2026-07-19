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
 * - ?q=검색어          : 주소 검색 + 키워드 검색 병합 (Kakao 키 필요)
 * - ?lat=..&lng=..     : 좌표 → 주소 역변환 (Kakao 키 없으면 Nominatim 폴백)
 */
export async function GET(req: NextRequest) {
  const key = process.env.KAKAO_REST_API_KEY;
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  // ── 역지오코딩 (지도 클릭 → 주소) ──
  if (lat && lng) {
    try {
      if (key) {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${encodeURIComponent(lng)}&y=${encodeURIComponent(lat)}`,
          { headers: { Authorization: `KakaoAK ${key}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const doc = data.documents?.[0];
          if (doc) {
            const address =
              doc.road_address?.address_name ?? doc.address?.address_name ?? "";
            return NextResponse.json({
              address,
              buildingName: doc.road_address?.building_name || null,
            });
          }
        }
      }
      // Kakao 키가 없거나 실패 시 — OSM Nominatim 폴백 (usage policy: UA 필수)
      const nmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=ko`,
        { headers: { "User-Agent": "korea-toilet-share/1.0 (dev)" } }
      );
      if (nmRes.ok) {
        const data = await nmRes.json();
        return NextResponse.json({
          address: (data.display_name as string) ?? "",
          buildingName: null,
        });
      }
      return NextResponse.json({ address: "", buildingName: null });
    } catch {
      return NextResponse.json({ address: "", buildingName: null });
    }
  }

  // ── 주소/키워드 검색 ──
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "MISSING_QUERY" }, { status: 400 });
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
