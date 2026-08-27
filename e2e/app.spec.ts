import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "sample.css");

async function uploadFixture(page: Page): Promise<void> {
  await page.goto("/");
  await page.locator("#file-input").setInputFiles(FIXTURE);
  await expect(page.locator(".color-bar")).toHaveCount(3);
}

test.describe("uploading a file", () => {
  test("populates the palette with the detected colors", async ({ page }) => {
    await uploadFixture(page);

    const bars = page.locator(".color-bar");
    await expect(bars).toHaveCount(3);

    const hexLabels = await bars.locator(".hex-label").allTextContents();
    expect(hexLabels.map((h) => h.toLowerCase())).toEqual(["#ff0000", "#0000ff", "#000000"]);

    // File view should show the raw text plus inline swatches for each occurrence.
    await expect(page.locator(".file-content")).toContainText("background: #ff0000");
    await expect(page.locator(".occurrence")).toHaveCount(4); // 2x #ff0000, 1x #0000ff, 1x #000000
    await expect(page.locator(".inline-swatch").first()).toBeVisible();
  });
});

test.describe("color info popup", () => {
  test("opens from the palette and shows the nearest color name", async ({ page }) => {
    await uploadFixture(page);

    const redBar = page.locator('.color-bar[data-entry-id]').first();
    await redBar.locator(".info-toggle").click();

    const modal = page.locator(".info-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator(".info-modal-header strong")).toHaveText("#ff0000");
    await expect(modal.locator(".info-name")).toHaveText("Red");
  });

  test("opens from clicking an occurrence in the file view", async ({ page }) => {
    await uploadFixture(page);

    // Clicking an occurrence in the file view scrolls to (and highlights) the
    // matching palette bar rather than opening Info directly, so open Info
    // from the palette bar it points at.
    const occurrence = page.locator(".occurrence").first();
    const entryId = await occurrence.getAttribute("data-entry-id");
    await occurrence.click();

    const bar = page.locator(`.color-bar[data-entry-id="${entryId}"]`);
    await bar.locator(".info-toggle").click();

    await expect(page.locator(".info-modal")).toBeVisible();
  });

  test("closes with Escape", async ({ page }) => {
    await uploadFixture(page);

    await page.locator(".color-bar").first().locator(".info-toggle").click();
    await expect(page.locator(".info-modal")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".info-modal")).toHaveCount(0);
  });
});

test.describe("editing a color", () => {
  test("updates file occurrences and the palette swatch border via the Info popup", async ({ page }) => {
    await uploadFixture(page);

    const redBar = page.locator(".color-bar").first();
    await expect(redBar).not.toHaveClass(/edited/);

    await redBar.locator(".info-toggle").click();
    const modal = page.locator(".info-modal");
    await expect(modal).toBeVisible();

    // Pick the first tint's "use this color" action to edit the color.
    const useBtn = modal.locator(".info-swatch-use").first();
    const newHex = await useBtn.getAttribute("data-hex");
    expect(newHex).toBeTruthy();
    await useBtn.click();

    // Editing re-renders and closes/keeps modal? The app keeps state; modal
    // root re-renders against the same entry, so it should still be open
    // but now reflecting the new color.
    await expect(modal.locator(".info-modal-header strong")).toHaveText(newHex!);

    await page.keyboard.press("Escape");

    // Palette swatch gets the "edited" styling (green border, per issue #5/#6).
    await expect(redBar).toHaveClass(/edited/);
    await expect(redBar.locator(".hex-label")).toHaveText(newHex!);

    // Both original occurrences of #ff0000 in the file view are updated and
    // marked as edited (green text, per issue #6).
    const editedOccurrences = page.locator(".occurrence.edited");
    await expect(editedOccurrences).toHaveCount(2);
    await expect(page.locator(".file-content")).not.toContainText("#ff0000");
  });

  test("can be reverted back to the original color", async ({ page }) => {
    await uploadFixture(page);

    const redBar = page.locator(".color-bar").first();
    await redBar.locator(".info-toggle").click();
    const useBtn = page.locator(".info-swatch-use").first();
    await useBtn.click();
    await page.keyboard.press("Escape");

    await expect(redBar).toHaveClass(/edited/);
    await redBar.locator(".revert-color").click();

    await expect(redBar).not.toHaveClass(/edited/);
    await expect(redBar.locator(".hex-label")).toHaveText("#ff0000");
  });
});

test.describe("favorites", () => {
  test("starring a color shows it in the favorites popup, and Use applies it", async ({ page }) => {
    await uploadFixture(page);

    const redBar = page.locator(".color-bar").first();
    const blueBar = page.locator(".color-bar").nth(1);

    page.once("dialog", (dialog) => dialog.accept("My Red"));
    await redBar.locator(".favorite-toggle").click();

    await expect(page.locator("#favorites-toggle-btn")).toContainText("Favorites (1)");

    // Select the blue bar as the target for "Use". Click the hex label
    // specifically: clicking the bar's center can land on the color-picker
    // input or a control button, both of which are excluded from selection.
    await blueBar.locator(".hex-label").click();
    await expect(blueBar).toHaveClass(/selected/);

    await page.locator("#favorites-toggle-btn").click();
    const favoritesModal = page.locator(".favorites-modal");
    await expect(favoritesModal).toBeVisible();

    const favItem = favoritesModal.locator(".favorites-item");
    await expect(favItem).toHaveCount(1);
    await expect(favItem.locator(".favorites-name")).toHaveText("My Red");
    await expect(favItem.locator(".favorites-hex")).toHaveText("#ff0000");

    await favItem.locator(".favorites-use").click();

    await expect(blueBar).toHaveClass(/edited/);
    await expect(blueBar.locator(".hex-label")).toHaveText("#ff0000");
  });
});
