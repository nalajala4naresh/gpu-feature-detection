import { defineConfig, devices } from "@playwright/test"

// Source: <https://developer.chrome.com/blog/supercharge-web-ai-testing>
const chromiumGpuOnLinuxFlags = [
  "--use-angle=vulkan",
  "--enable-features=Vulkan",
  "--disable-vulkan-surface",
  "--enable-unsafe-webgpu",
]

export default defineConfig({
  // other irrelevant settings omitted
	use: {
		trace: "retain-on-failure"
	},
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // To enable the new headless mode; see <https://github.com/microsoft/playwright/releases/tag/v1.49.0>
        channel: "chromium",
        launchOptions: {
          args: [
            "--no-sandbox",
            ...(process.platform === "linux" ? chromiumGpuOnLinuxFlags : []),
          ],
        },
      },
    },
  ],
})
