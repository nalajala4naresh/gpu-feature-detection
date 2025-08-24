import { defineConfig, devices } from "@playwright/test";

// Linux-specific WebGPU flags
const linuxWebGPUFlags = [
  "--use-angle=vulkan",
  "--enable-features=WebGPU,Vulkan",
  "--disable-vulkan-surface",
  "--enable-unsafe-webgpu",
  "--ignore-gpu-blocklist",
  "--disable-gpu-driver-bug-workarounds",
];

// macOS-specific WebGPU flags
const macWebGPUFlags = [
  "--use-angle=metal",                    // Use Metal backend on macOS
  "--enable-features=WebGPU,WebGPUDeveloperFeatures", // Enable WebGPU with developer features
  "--enable-unsafe-webgpu",               // Allow experimental WebGPU
  "--ignore-gpu-blocklist",               // Ignore GPU blacklist
  "--disable-gpu-driver-bug-workarounds", // Prevent software fallback
  "--enable-gpu",                         // Ensure GPU acceleration
  "--no-sandbox",                         // Disable sandbox for testing
  "--disable-dev-shm-usage",             // Disable shared memory usage
];

// Windows-specific WebGPU flags (if needed)
const windowsWebGPUFlags = [
  "--use-angle=d3d11",                    // DirectX backend
  "--enable-features=WebGPU",
  "--enable-unsafe-webgpu",
  "--ignore-gpu-blocklist",
  "--disable-gpu-driver-bug-workarounds",
];

// Get platform-specific flags
function getPlatformWebGPUFlags() {
  switch (process.platform) {
    case "linux":
      return linuxWebGPUFlags;
    case "darwin": // macOS
      return macWebGPUFlags;
    case "win32":
      return windowsWebGPUFlags;
    default:
      return [
        "--enable-features=WebGPU",
        "--enable-unsafe-webgpu",
        "--ignore-gpu-blocklist",
      ];
  }
}

export default defineConfig({
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        executablePath: process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined,
        launchOptions: {
          args: [
            ...getPlatformWebGPUFlags(),
            "--enable-webgpu",
            "--enable-webgpu-developer-features",
            "--enable-unsafe-webgpu-developer-features",
          ],
        },
      },
    },
  ],
});
