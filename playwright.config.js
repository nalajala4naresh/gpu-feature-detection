import { defineConfig, devices } from "@playwright/test";

// Chromium GPU flags for Linux
const chromiumGpuOnLinuxFlags = [
  "--use-angle=vulkan",                  // ANGLE Vulkan backend
  "--enable-features=WebGPU,Vulkan",    // Enable WebGPU and Vulkan explicitly
  "--disable-vulkan-surface",           // Disable Vulkan surface fallback
  "--enable-unsafe-webgpu",             // Allow experimental WebGPU features
  "--ignore-gpu-blocklist",             // Ignore Chromium GPU blacklist
  "--disable-gpu-driver-bug-workarounds", // Prevent software fallback
];

export default defineConfig({
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],

        channel: "chrome",  // Use Playwright bundled Chromium

        launchOptions: {
          headless: true,
          args: [
            "--headless=new",  // modern headless mode for GPU
            ...(process.platform === "linux" ? chromiumGpuOnLinuxFlags : []),
          ],
        },
      },
    },
  ],
});
