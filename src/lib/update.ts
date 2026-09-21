/** Product version — keep in lockstep with package.json. */
export const APP_VERSION = "0.2.9";

export const GITHUB_REPO = "TheOmnom/primblocks";
export const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

export type ReleaseAsset = { name: string; browser_download_url: string };

export type GithubRelease = {
  tag_name: string;
  html_url: string;
  assets?: ReleaseAsset[];
};

export type UpdateStatus =
  | { kind: "loading"; current: string }
  | { kind: "current"; current: string; latest: string }
  | { kind: "available"; current: string; latest: string; pageUrl: string; downloadUrl: string }
  | { kind: "unknown"; current: string; reason: string };

export function normalizeVersion(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/^v/i, "");
}

/** a > b → 1, a < b → -1, equal → 0 */
export function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a)
    .split(/[.+-]/)
    .map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
  const pb = normalizeVersion(b)
    .split(/[.+-]/)
    .map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d > 0) return 1;
    if (d < 0) return -1;
  }
  return 0;
}

export function installerNameFor(platform: string, ua: string): string {
  const p = platform.toLowerCase();
  const u = ua.toLowerCase();
  if (p.includes("win") || u.includes("windows")) return "PrimBlocks-Setup.exe";
  if (p.includes("mac") || u.includes("mac os") || u.includes("macintosh")) return "PrimBlocks-mac.dmg";
  return "PrimBlocks-linux.AppImage";
}

export function pickDownload(assets: ReleaseAsset[] | undefined, platform: string, ua: string): string | null {
  const want = installerNameFor(platform, ua);
  const hit = (assets ?? []).find((a) => a.name === want);
  return hit?.browser_download_url ?? null;
}

export function statusFromRelease(
  current: string,
  release: GithubRelease | null,
  reason?: string,
  platform = "linux",
  ua = "",
): UpdateStatus {
  if (reason && !release) {
    return { kind: "unknown", current, reason };
  }
  if (!release?.tag_name) {
    return { kind: "unknown", current, reason: reason || "No GitHub release yet." };
  }
  const latest = normalizeVersion(release.tag_name);
  const pageUrl = release.html_url || RELEASES_PAGE;
  const downloadUrl = pickDownload(release.assets, platform, ua) || pageUrl;
  if (compareVersions(latest, current) > 0) {
    return { kind: "available", current, latest, pageUrl, downloadUrl };
  }
  return { kind: "current", current, latest };
}

export async function checkForUpdate(opts?: {
  fetch?: typeof fetch;
  current?: string;
  platform?: string;
  userAgent?: string;
  signal?: AbortSignal;
}): Promise<UpdateStatus> {
  const current = opts?.current ?? APP_VERSION;
  const fetchFn = opts?.fetch ?? fetch;
  const platform = opts?.platform ?? (typeof navigator !== "undefined" ? navigator.platform : "linux");
  const ua = opts?.userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  try {
    const res = await fetchFn(RELEASES_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `PrimBlocks/${APP_VERSION}`,
      },
      signal: opts?.signal,
    });
    if (res.status === 404) {
      return statusFromRelease(current, null, "No GitHub release yet.", platform, ua);
    }
    if (!res.ok) {
      return statusFromRelease(current, null, `GitHub returned ${res.status}. Try again in a minute.`, platform, ua);
    }
    const body = (await res.json()) as GithubRelease;
    return statusFromRelease(current, body, undefined, platform, ua);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not reach GitHub.";
    return statusFromRelease(current, null, msg, platform, ua);
  }
}
