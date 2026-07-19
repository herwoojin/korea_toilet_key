import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Korea Toilet Sharing Service",
    short_name: "Toilet Share",
    description:
      "대한민국 상가·빌딩의 남녀 화장실 위치와 출입 비밀번호를 지도에서 확인하는 신뢰 기반 공유 서비스",
    start_url: "/ko",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563EB",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
