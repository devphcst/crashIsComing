/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // 레거시 /type/W*** 공유 URL → /type/M***로 308(permanent).
    // 축 B/W → B/M 전환으로 W 시작 코드가 더 이상 유효하지 않다.
    // generateStaticParams는 소문자만 생성 → 소/대문자 둘 다 커버.
    const legacy = [
      "wehi",
      "weha",
      "weti",
      "weta",
      "wohi",
      "woha",
      "woti",
      "wota",
    ];
    const entries = [];
    for (const w of legacy) {
      const m = `m${w.slice(1)}`;
      entries.push({
        source: `/type/${w}`,
        destination: `/type/${m}`,
        permanent: true,
      });
      entries.push({
        source: `/type/${w.toUpperCase()}`,
        destination: `/type/${m.toUpperCase()}`,
        permanent: true,
      });
    }
    return entries;
  },
};

export default nextConfig;
