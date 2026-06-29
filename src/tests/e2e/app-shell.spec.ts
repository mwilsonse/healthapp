import { expect, test } from "@playwright/test";

test("renders the Today shell", async ({ page }) => {
  await page.goto("/today");

  await expect(page.getByRole("heading", { name: "Workout pending" })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
});
