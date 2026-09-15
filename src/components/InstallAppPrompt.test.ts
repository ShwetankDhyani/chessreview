import { describe, expect, it } from "vitest";
import {
  INSTALL_PROMPT_SNOOZE_MS,
  isInstallSnoozed,
  shouldShowInstallPrompt,
} from "./InstallAppPrompt";

describe("shouldShowInstallPrompt", () => {
  it("hides when already installed", () => {
    expect(
      shouldShowInstallPrompt({
        dismissedAt: null,
        standalone: true,
        canInstall: true,
        ios: false,
        mobile: true,
      })
    ).toBe(false);
  });

  it("shows on mobile when Chrome can install", () => {
    expect(
      shouldShowInstallPrompt({
        dismissedAt: null,
        standalone: false,
        canInstall: true,
        ios: false,
        mobile: true,
      })
    ).toBe(true);
  });

  it("shows on iOS Safari even without beforeinstallprompt", () => {
    expect(
      shouldShowInstallPrompt({
        dismissedAt: null,
        standalone: false,
        canInstall: false,
        ios: true,
        mobile: true,
      })
    ).toBe(true);
  });

  it("respects snooze", () => {
    const now = Date.now();
    expect(
      shouldShowInstallPrompt({
        dismissedAt: String(now - 1000),
        standalone: false,
        canInstall: true,
        ios: false,
        mobile: true,
      })
    ).toBe(false);
  });

  it("force overrides snooze but not standalone", () => {
    expect(
      shouldShowInstallPrompt({
        dismissedAt: String(Date.now()),
        standalone: false,
        canInstall: false,
        ios: false,
        mobile: false,
        force: true,
      })
    ).toBe(true);
    expect(
      shouldShowInstallPrompt({
        dismissedAt: null,
        standalone: true,
        canInstall: true,
        ios: true,
        mobile: true,
        force: true,
      })
    ).toBe(false);
  });
});

describe("isInstallSnoozed", () => {
  it("expires after the snooze window", () => {
    const now = 1_700_000_000_000;
    expect(isInstallSnoozed(String(now - INSTALL_PROMPT_SNOOZE_MS - 1), now)).toBe(
      false
    );
    expect(isInstallSnoozed(String(now - 1000), now)).toBe(true);
  });
});
