import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_VERSION,
  RELEASES_API,
  checkForUpdate,
  compareVersions,
  installerNameFor,
  normalizeVersion,
  pickDownload,
  statusFromRelease,
  type GithubRelease,
} from "./update.ts";

const sample: GithubRelease = {
  tag_name: "v0.2.5",
  html_url: "https://github.com/TheOmnom/primblocks/releases/tag/v0.2.5",
  assets: [
    { name: "PrimBlocks-Setup.exe", browser_download_url: "https://example.com/setup.exe" },
    { name: "PrimBlocks-mac.dmg", browser_download_url: "https://example.com/mac.dmg" },
    { name: "PrimBlocks-linux.AppImage", browser_download_url: "https://example.com/linux.AppImage" },
  ],
};

describe("version compare", () => {
  it("strips the v prefix", () => {
    assert.equal(normalizeVersion("v0.2.5"), "0.2.5");
    assert.equal(normalizeVersion("  V1.0.0 "), "1.0.0");
  });

  it("orders dotted versions", () => {
    assert.equal(compareVersions("0.2.5", "0.2.5"), 0);
    assert.equal(compareVersions("v0.3.0", "0.2.5"), 1);
    assert.equal(compareVersions("0.2.0", "0.2.5"), -1);
    assert.equal(compareVersions("0.2.10", "0.2.9"), 1);
  });
});

describe("statusFromRelease", () => {
  it("shows current when GitHub matches", () => {
    const s = statusFromRelease("0.2.5", sample);
    assert.equal(s.kind, "current");
    if (s.kind === "current") assert.equal(s.latest, "0.2.5");
  });

  it("flags an update when GitHub is ahead", () => {
    const s = statusFromRelease("0.2.0", sample, undefined, "Win32", "Windows");
    assert.equal(s.kind, "available");
    if (s.kind === "available") {
      assert.equal(s.latest, "0.2.5");
      assert.equal(s.downloadUrl, "https://example.com/setup.exe");
    }
  });

  it("does not nag when we are ahead of GitHub", () => {
    const s = statusFromRelease("0.9.0", sample);
    assert.equal(s.kind, "current");
  });

  it("degrades when GitHub is quiet", () => {
    const s = statusFromRelease("0.2.5", null, "No GitHub release yet.");
    assert.equal(s.kind, "unknown");
  });
});

describe("installer pick", () => {
  it("maps OS to the file people actually download", () => {
    assert.equal(installerNameFor("Win32", "Windows NT"), "PrimBlocks-Setup.exe");
    assert.equal(installerNameFor("MacIntel", "Macintosh"), "PrimBlocks-mac.dmg");
    assert.equal(installerNameFor("Linux x86_64", "X11"), "PrimBlocks-linux.AppImage");
    assert.equal(pickDownload(sample.assets, "Linux", ""), "https://example.com/linux.AppImage");
  });
});

describe("checkForUpdate", () => {
  it("treats 404 as no release", async () => {
    const s = await checkForUpdate({
      current: "0.2.5",
      fetch: async () => new Response("{}", { status: 404 }),
    });
    assert.equal(s.kind, "unknown");
  });

  it("reads a latest payload", async () => {
    const s = await checkForUpdate({
      current: "0.2.0",
      platform: "Win32",
      userAgent: "Windows",
      fetch: async () => new Response(JSON.stringify(sample), { status: 200 }),
    });
    assert.equal(s.kind, "available");
    if (s.kind === "available") assert.equal(s.latest, "0.2.5");
  });

  it("hits the real GitHub latest endpoint", async () => {
    const s = await checkForUpdate({ current: APP_VERSION });
    assert.ok(s.kind === "current" || s.kind === "available" || s.kind === "unknown", s.kind);
    if (s.kind === "current") {
      assert.equal(s.latest, APP_VERSION);
    }
    if (s.kind === "available") {
      assert.equal(compareVersions(s.latest, APP_VERSION) > 0, true);
    }
    assert.ok(RELEASES_API.includes("TheOmnom/primblocks"));
  });
});
