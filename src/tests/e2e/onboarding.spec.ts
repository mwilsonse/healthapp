import { expect, test } from "@playwright/test";

test("renders onboarding data-entry sections", async ({ page }) => {
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", { name: "Exercise setup" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profile and constraints" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Baseline measurement" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Equipment" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Exercise preferences" })).toBeVisible();
});
