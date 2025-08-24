import { test, expect } from '@playwright/test';

test.describe('Comprehensive GPU Testing Suite', () => {
  
  test('should extract comprehensive GPU information from chrome://gpu', async ({ page }) => {
    console.log('🔍 Extracting comprehensive GPU information from chrome://gpu...');
    
    // Navigate and wait for page to be ready using proper Playwright practices
    await page.goto('chrome://gpu');
    await page.waitForLoadState('networkidle');
    
    // Wait for the visible GPU info to be populated (avoiding hidden duplicates)
    await page.locator('h3').filter({ hasText: 'Graphics Feature Status' }).first().waitFor({ timeout: 10000 });
    
    console.log('✅ Successfully accessed chrome://gpu');
    
    // Comprehensive GPU data structure
    const gpuData = {
      graphicsFeatures: [],
      versionInfo: {},
      driverInfo: {},
      dawnInfo: {},
      problems: [],
      status: {},
      capabilities: [],
      backends: []
    };
    
    // 1. Extract Graphics Feature Status using Playwright best practices
    try {
      const featureStatusSection = page.locator('h3').filter({ hasText: 'Graphics Feature Status' }).and(page.locator(':visible')).locator('..').first();
      const featureTexts = await featureStatusSection.locator('ul li').allTextContents();
      
      for (const featureText of featureTexts) {
        if (featureText?.trim()) {
          const cleanText = featureText.trim();
          gpuData.graphicsFeatures.push(cleanText);
          
          // Parse specific features
          if (cleanText.includes('WebGPU:')) {
            if (cleanText.includes('Hardware accelerated')) {
              gpuData.status.webgpu = 'Hardware accelerated';
            } else if (cleanText.includes('Software only')) {
              gpuData.status.webgpu = 'Software only';
            } else if (cleanText.includes('Disabled')) {
              gpuData.status.webgpu = 'Disabled';
            }
          }
          
          if (cleanText.includes('Hardware accelerated')) {
            gpuData.status.hardwareAccelerated = true;
          }
          
          // Detect graphics backend
          if (cleanText.includes('Metal')) gpuData.status.graphicsBackend = 'Metal';
          else if (cleanText.includes('Vulkan')) gpuData.status.graphicsBackend = 'Vulkan';
          else if (cleanText.includes('OpenGL')) gpuData.status.graphicsBackend = 'OpenGL';
          else if (cleanText.includes('DirectX')) gpuData.status.graphicsBackend = 'DirectX';
          else if (cleanText.includes('ANGLE')) gpuData.status.graphicsBackend = 'ANGLE';
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract Graphics Feature Status:', error.message);
    }
    
    // 2. Extract Version Information using best practices
    try {
      const versionSection = page.locator('h3').filter({ hasText: 'Version Information' }).locator('..').first();
      const versionRows = await versionSection.locator('table.info-table tr').all();
      
      for (const row of versionRows) {
        const cells = await row.locator('td').allTextContents();
        if (cells.length >= 2 && cells[0]?.trim() && cells[1]?.trim()) {
          const cleanKey = cells[0].trim();
          const cleanValue = cells[1].trim();
          gpuData.versionInfo[cleanKey] = cleanValue;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract Version Information:', error.message);
    }
    
    // 3. Extract Driver Information using best practices
    try {
      const driverSection = page.locator('h3').filter({ hasText: 'Driver Information' }).locator('..').first();
      const driverRows = await driverSection.locator('table.info-table tr').all();
      
      for (const row of driverRows) {
        const cells = await row.locator('td').allTextContents();
        if (cells.length >= 2 && cells[0]?.trim() && cells[1]?.trim()) {
          const cleanKey = cells[0].trim();
          const cleanValue = cells[1].trim();
          
          // Parse specific driver info
          if (cleanKey.includes('Skia Backend')) {
            gpuData.status.skiaBackend = cleanValue;
          }
          if (cleanKey.includes('Display type')) {
            gpuData.status.displayType = cleanValue;
          }
          if (cleanKey.includes('GL implementation parts')) {
            gpuData.status.glImplementation = cleanValue;
          }
          if (cleanKey.includes('ANGLE commit id')) {
            gpuData.status.angleCommit = cleanValue;
          }
          
          // Check for specific backends (avoid duplicates)
          const backendChecks = [
            { name: 'Metal', check: cleanValue.includes('Metal') },
            { name: 'Vulkan', check: cleanValue.includes('Vulkan') },
            { name: 'OpenGL', check: cleanValue.includes('OpenGL') },
            { name: 'DirectX', check: cleanValue.includes('DirectX') },
            { name: 'ANGLE', check: cleanValue.includes('ANGLE') }
          ];
          
          for (const backend of backendChecks) {
            if (backend.check && !gpuData.backends.includes(backend.name)) {
              gpuData.backends.push(backend.name);
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract Driver Information:', error.message);
    }
    
    // 4. Extract Dawn Info (WebGPU specific) using best practices
    try {
      const dawnSection = page.locator('h3').filter({ hasText: 'Dawn Info' }).locator('..').first();
      
      // Look for WebGPU Status
      const webgpuStatusItems = await dawnSection.locator('h4').filter({ hasText: '[WebGPU Status]' }).locator('..').locator('li').allTextContents();
      if (webgpuStatusItems.length > 0) {
        const status = webgpuStatusItems[0]?.trim();
        if (status) {
          gpuData.dawnInfo.webgpuStatus = status;
          if (status === 'Available') {
            gpuData.status.webgpuAvailable = true;
          }
        }
      }
      
      // Look for Adapter Supported Features
      const supportedFeatures = await dawnSection.locator('h4').filter({ hasText: '[Adapter Supported Features]' }).locator('..').locator('li').allTextContents();
      for (const feature of supportedFeatures) {
        if (feature?.trim()) {
          gpuData.capabilities.push(feature.trim());
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract Dawn Info:', error.message);
    }
    
    // 5. Extract Problems Detected using best practices
    try {
      const problemsSection = page.locator('h3').filter({ hasText: 'Problems Detected' }).locator('..').first();
      const problemTexts = await problemsSection.locator('ul li').allTextContents();
      
      for (const problemText of problemTexts) {
        if (problemText?.trim()) {
          gpuData.problems.push(problemText.trim());
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract Problems Detected:', error.message);
    }
    
    // 6. Extract ANGLE Features using best practices
    try {
      const angleSection = page.locator('h3').filter({ hasText: 'ANGLE Features' }).locator('..').first();
      const angleTexts = await angleSection.locator('ul li').allTextContents();
      
      for (const angleText of angleTexts) {
        if (angleText?.trim()) {
          const cleanText = angleText.trim();
          
          // Check for specific ANGLE features
          const backendMatches = cleanText.match(/(Metal|Vulkan|OpenGL|DirectX)/g);
          if (backendMatches) {
            for (const backend of backendMatches) {
              if (!gpuData.backends.includes(backend)) {
                gpuData.backends.push(backend);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract ANGLE Features:', error.message);
    }
    
    // Take a comprehensive screenshot
    await page.screenshot({ path: 'comprehensive-gpu-info.png', fullPage: true });
    console.log('📸 Screenshot saved as comprehensive-gpu-info.png');
    
    // Build comprehensive summary
    const summary = {
      webgpuStatus: gpuData.status.webgpu || 'Not detected',
      hardwareAccelerated: gpuData.status.hardwareAccelerated ? 'Yes' : 'No',
      graphicsBackend: gpuData.status.graphicsBackend || 'Unknown',
      skiaBackend: gpuData.status.skiaBackend || 'Unknown',
      displayType: gpuData.status.displayType || 'Unknown',
      webgpuAvailable: gpuData.status.webgpuAvailable ? 'Yes' : 'No',
      totalFeatures: gpuData.graphicsFeatures.length,
      totalProblems: gpuData.problems.length,
      totalCapabilities: gpuData.capabilities.length,
      totalBackends: gpuData.backends.length,
      chromeVersion: gpuData.versionInfo['Chrome version'] || 'Unknown',
      osInfo: gpuData.versionInfo['Operating system'] || 'Unknown',
      commandLine: gpuData.versionInfo['Command Line'] || 'Unknown'
    };
    
    // Print comprehensive summary
    console.log('🎯 **Comprehensive GPU Status Summary**');
    console.log('=====================================');
    console.log(`🔍 WebGPU Status: ${summary.webgpuStatus}`);
    console.log(`⚡ Hardware Accelerated: ${summary.hardwareAccelerated}`);
    console.log(`🎨 Graphics Backend: ${summary.graphicsBackend}`);
    console.log(`🔄 Skia Backend: ${summary.skiaBackend}`);
    console.log(`📱 Display Type: ${summary.displayType}`);
    console.log(`🚀 WebGPU Available: ${summary.webgpuAvailable}`);
    console.log(`📊 Total GPU Features: ${summary.totalFeatures}`);
    console.log(`⚠️  Total Problems: ${summary.totalProblems}`);
    console.log(`🔧 Total Capabilities: ${summary.totalCapabilities}`);
    console.log(`🎭 Total Backends: ${summary.totalBackends}`);
    console.log(`🌐 Chrome Version: ${summary.chromeVersion}`);
    console.log(`💻 OS: ${summary.osInfo}`);
    console.log(`⚙️  Command Line: ${summary.commandLine.substring(0, 100)}...`);
    
    // Show key graphics features
    if (gpuData.graphicsFeatures.length > 0) {
      console.log('\n🎨 **Key Graphics Features:**');
      gpuData.graphicsFeatures.forEach(feature => {
        if (feature.includes('WebGPU') || feature.includes('WebGL') || feature.includes('Hardware accelerated')) {
          console.log(`   ✅ ${feature}`);
        }
      });
    }
    
    // Show WebGPU-specific info from Dawn
    if (gpuData.dawnInfo.webgpuStatus) {
      console.log(`\n🚀 **WebGPU Status:** ${gpuData.dawnInfo.webgpuStatus}`);
    }
    
    if (gpuData.capabilities.length > 0) {
      console.log(`\n🔧 **WebGPU Supported Features:** ${gpuData.capabilities.length} features`);
      gpuData.capabilities.slice(0, 5).forEach(feature => {
        console.log(`   • ${feature}`);
      });
      if (gpuData.capabilities.length > 5) {
        console.log(`   ... and ${gpuData.capabilities.length - 5} more`);
      }
    }
    
    // Show detected backends
    if (gpuData.backends.length > 0) {
      console.log(`\n🎭 **Detected Graphics Backends:** ${gpuData.backends.join(', ')}`);
    }
    
    // Basic expectations with proper Playwright assertions
    await expect(page.locator('h3').filter({ hasText: 'Graphics Feature Status' }).first()).toBeVisible();
    expect(gpuData.graphicsFeatures.length).toBeGreaterThan(0);
    expect(gpuData.status.hardwareAccelerated).toBe(true);
    expect(gpuData.status.graphicsBackend).toBeTruthy();
    
    console.log('✅ All GPU information extracted successfully!');
  });
  
  test('should test WebGPU rendering functionality', async ({ page }) => {
    console.log('🚀 Testing WebGPU rendering functionality...');
    
    try {
      // Navigate to a real WebGPU application
      console.log('🌐 Navigating to WebGPU water example...');
      await page.goto('https://wgpu.rs/examples/?backend=webgpu&example=water');
      
      // Wait for the page to load and rendering to start
      await page.waitForLoadState('networkidle');
      
      // Wait for the canvas to be available and visible
      const canvas = page.locator('canvas');
      await canvas.waitFor({ state: 'visible', timeout: 15000 });
      
      console.log('✅ Canvas is visible, waiting for rendering to start...');
      
      // Small delay to let rendering start and stabilize
      await page.waitForTimeout(3000);
      
      // Check if WebGPU is actually working by examining the canvas
      const canvasInfo = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { exists: false };
        
        return {
          exists: true,
          width: canvas.width,
          height: canvas.height,
          hasWebGPUContext: !!canvas.getContext('webgpu')
        };
      });
      
      console.log('🎨 **Canvas Information:**');
      console.log(`   Exists: ${canvasInfo.exists ? '✅ Yes' : '❌ No'}`);
      console.log(`   Dimensions: ${canvasInfo.width} x ${canvasInfo.height}`);
      console.log(`   WebGPU Context: ${canvasInfo.hasWebGPUContext ? '✅ Available' : '❌ Not Available'}`);
      
      // Test WebGL and 2D contexts on separate canvas elements (not the one used by WebGPU)
      const contextAvailability = await page.evaluate(() => {
        // Create separate test canvases
        const webglCanvas = document.createElement('canvas');
        const canvas2d = document.createElement('canvas');
        
        // Set reasonable dimensions
        webglCanvas.width = 100;
        webglCanvas.height = 100;
        canvas2d.width = 100;
        canvas2d.height = 100;
        
        return {
          hasWebGL: !!webglCanvas.getContext('webgl'),
          has2D: !!canvas2d.getContext('2d'),
          webglVendor: null,
          webglRenderer: null
        };
      });
      
      // Get WebGL details if available
      if (contextAvailability.hasWebGL) {
        const webglDetails = await page.evaluate(() => {
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 100;
          testCanvas.height = 100;
          const gl = testCanvas.getContext('webgl');
          
          if (!gl) return null;
          
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          
          return {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            extensions: gl.getSupportedExtensions().length
          };
        });
        
        if (webglDetails) {
          contextAvailability.webglVendor = webglDetails.vendor;
          contextAvailability.webglRenderer = webglDetails.renderer;
        }
      }
      
      console.log('🔧 **Context Availability (Separate Test):**');
      console.log(`   WebGL Context: ${contextAvailability.hasWebGL ? '✅ Available' : '❌ Not Available'}`);
      console.log(`   2D Context: ${contextAvailability.has2D ? '✅ Available' : '❌ Not Available'}`);
      
      if (contextAvailability.hasWebGL && contextAvailability.webglVendor) {
        console.log('🎨 **WebGL Details:**');
        console.log(`   Vendor: ${contextAvailability.webglVendor}`);
        console.log(`   Renderer: ${contextAvailability.webglRenderer}`);
      }
      
      // Take screenshot of the canvas
      console.log('📸 Taking canvas screenshot...');
      const canvasScreenshot = await canvas.screenshot();
      
      // Check if the screenshot has meaningful content (not just blank/white)
      const screenshotSize = canvasScreenshot.length;
      console.log(`📊 Screenshot size: ${screenshotSize} bytes`);
      
      // Basic validation: screenshot should be substantial
      expect(screenshotSize).toBeGreaterThan(1000);
      console.log('✅ Screenshot size validation passed');
      
      // Check if the canvas is actually rendering (not just a static image)
      // Wait a bit more and take another screenshot to see if it's animated
      await page.waitForTimeout(2000);
      const secondScreenshot = await canvas.screenshot();
      
      // Compare screenshots to see if there's animation/rendering happening
      const screenshotsIdentical = Buffer.compare(canvasScreenshot, secondScreenshot) === 0;
      console.log(`🔄 Screenshots identical: ${screenshotsIdentical ? '❌ Static (no rendering)' : '✅ Dynamic (rendering detected)'}`);
      
      // If screenshots are identical, the canvas might not be actively rendering
      if (screenshotsIdentical) {
        console.log('⚠️  Canvas appears to be static - WebGPU might not be actively rendering');
      } else {
        console.log('✅ Canvas is actively rendering - WebGPU is working!');
      }
      
      // Check for any WebGPU-related errors in the console
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait a bit more to catch any delayed errors
      await page.waitForTimeout(2000);
      
      if (consoleErrors.length > 0) {
        console.log('⚠️  **Console Errors Detected:**');
        consoleErrors.forEach(error => {
          if (error.includes('WebGPU') || error.includes('wgpu') || error.includes('GPU')) {
            console.log(`   🚨 ${error}`);
          }
        });
      } else {
        console.log('✅ No WebGPU-related console errors detected');
      }
      
      // Check if the page shows WebGPU backend information
      const backendInfo = await page.evaluate(() => {
        // Look for any text indicating WebGPU backend
        const bodyText = document.body.textContent || '';
        const webgpuIndicators = [
          bodyText.includes('WebGPU'),
          bodyText.includes('wgpu'),
          bodyText.includes('Dawn'),
          bodyText.includes('GPU')
        ];
        
        return {
          hasWebGPUText: webgpuIndicators.some(Boolean),
          indicators: webgpuIndicators
        };
      });
      
      console.log('🔍 **Page Content Analysis:**');
      console.log(`   WebGPU-related text found: ${backendInfo.hasWebGPUText ? '✅ Yes' : '❌ No'}`);
      
      // Final WebGPU availability assessment
      const webgpuWorking = canvasInfo.hasWebGPUContext && !screenshotsIdentical && screenshotSize > 1000;
      
      console.log('\n🎯 **WebGPU Rendering Assessment:**');
      console.log('=====================================');
      console.log(`🚀 WebGPU Context: ${canvasInfo.hasWebGPUContext ? '✅ Available' : '❌ Not Available'}`);
      console.log(`🎨 Active Rendering: ${!screenshotsIdentical ? '✅ Detected' : '❌ Not Detected'}`);
      console.log(`📊 Content Quality: ${screenshotSize > 1000 ? '✅ Good' : '❌ Poor'}`);
      console.log(`🔍 Overall Status: ${webgpuWorking ? '✅ WebGPU is Working!' : '❌ WebGPU Not Working'}`);
      
      // Expectations
      expect(canvasInfo.exists).toBe(true);
      expect(canvasInfo.width).toBeGreaterThan(0);
      expect(canvasInfo.height).toBeGreaterThan(0);
      expect(screenshotSize).toBeGreaterThan(1000);
      
      // If WebGPU context is available, it should be working
      if (canvasInfo.hasWebGPUContext) {
        expect(webgpuWorking).toBe(true);
      }
      
      console.log('✅ WebGPU rendering test completed!');
      
    } catch (error) {
      console.log('❌ Error testing WebGPU rendering:', error.message);
      
      // Take a screenshot of the failed state for debugging
      try {
        await page.screenshot({ path: 'webgpu-test-failure.png', fullPage: true });
        console.log('📸 Failure screenshot saved as webgpu-test-failure.png');
      } catch (screenshotError) {
        console.log('⚠️  Could not save failure screenshot:', screenshotError.message);
      }
      
      throw error;
    }
  });
  
  test('should verify GPU acceleration and performance', async ({ page }) => {
    console.log('⚡ Verifying GPU acceleration and performance...');
    
    // Navigate to chrome://gpu for acceleration status
    await page.goto('chrome://gpu');
    await page.waitForLoadState('networkidle');
    
    // Wait for GPU info to load (avoiding hidden duplicates)
    await page.locator('h3').filter({ hasText: 'Graphics Feature Status' }).first().waitFor({ timeout: 10000 });
    
    // Extract acceleration status using best practices
    const accelerationStatus = {
      hardwareAccelerated: false,
      softwareOnly: false,
      rasterization: false,
      canvas: false,
      webgl: false,
      videoDecode: false,
      videoEncode: false,
      compositing: false,
      backend: null
    };
    
    // Extract Graphics Feature Status
    try {
      const featureStatusSection = page.locator('h3').filter({ hasText: 'Graphics Feature Status' }).and(page.locator(':visible')).locator('..').first();
      const featureTexts = await featureStatusSection.locator('ul li').allTextContents();
      
      for (const featureText of featureTexts) {
        if (featureText?.trim()) {
          const cleanText = featureText.trim();
          
          // Check for hardware acceleration indicators
          if (cleanText.includes('Hardware accelerated')) {
            accelerationStatus.hardwareAccelerated = true;
          }
          if (cleanText.includes('Software only')) {
            accelerationStatus.softwareOnly = true;
          }
          if (cleanText.includes('Rasterization') && cleanText.includes('Hardware accelerated')) {
            accelerationStatus.rasterization = true;
          }
          if (cleanText.includes('Canvas') && cleanText.includes('Hardware accelerated')) {
            accelerationStatus.canvas = true;
          }
          if (cleanText.includes('WebGL') && cleanText.includes('Hardware accelerated')) {
            accelerationStatus.webgl = true;
          }
          if (cleanText.includes('Video Decode') && cleanText.includes('Hardware accelerated')) {
            accelerationStatus.videoDecode = true;
          }
          if (cleanText.includes('Video Encode') && cleanText.includes('Hardware accelerated')) {
            accelerationStatus.videoEncode = true;
          }
          if (cleanText.includes('Compositing') && cleanText.includes('Hardware accelerated')) {
            accelerationStatus.compositing = true;
          }
          
          // Detect graphics backend
          if (cleanText.includes('Metal')) {
            accelerationStatus.backend = 'Metal';
          } else if (cleanText.includes('Vulkan')) {
            accelerationStatus.backend = 'Vulkan';
          } else if (cleanText.includes('OpenGL')) {
            accelerationStatus.backend = 'OpenGL';
          } else if (cleanText.includes('DirectX')) {
            accelerationStatus.backend = 'DirectX';
          } else if (cleanText.includes('ANGLE')) {
            accelerationStatus.backend = 'ANGLE';
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not extract Graphics Feature Status:', error.message);
    }
    
    // Take screenshot
    await page.screenshot({ path: 'gpu-acceleration-verification.png', fullPage: true });
    console.log('📸 Screenshot saved as gpu-acceleration-verification.png');
    
    // Print acceleration summary
    console.log('📊 **GPU Acceleration Summary:**');
    console.log('=====================================');
    console.log(`🎯 Hardware Acceleration: ${accelerationStatus.hardwareAccelerated ? '✅ Active' : '❌ Inactive'}`);
    console.log(`⚠️  Software Rendering: ${accelerationStatus.softwareOnly ? 'Active' : 'Disabled'}`);
    console.log(`🎨 Graphics Backend: ${accelerationStatus.backend || '❌ Unknown'}`);
    console.log(`📱 Rasterization: ${accelerationStatus.rasterization ? '✅ Active' : '❌ Inactive'}`);
    console.log(`🎭 Canvas: ${accelerationStatus.canvas ? '✅ Accelerated' : '❌ Not Accelerated'}`);
    console.log(`🌐 WebGL: ${accelerationStatus.webgl ? '✅ Supported' : '❌ Not Supported'}`);
    console.log(`🎬 Video Decode: ${accelerationStatus.videoDecode ? '✅ Hardware' : '❌ Software'}`);
    console.log(`🎬 Video Encode: ${accelerationStatus.videoEncode ? '✅ Hardware' : '❌ Software'}`);
    console.log(`🔄 Compositing: ${accelerationStatus.compositing ? '✅ Active' : '❌ Inactive'}`);
    
    // Proper Playwright assertions
    await expect(page.locator('h3').filter({ hasText: 'Graphics Feature Status' }).first()).toBeVisible();
    expect(accelerationStatus.hardwareAccelerated).toBe(true);
    expect(accelerationStatus.softwareOnly).toBe(false);
    expect(accelerationStatus.rasterization).toBe(true);
    expect(accelerationStatus.canvas).toBe(true);
    expect(accelerationStatus.backend).toBeTruthy();
    
    console.log('✅ GPU acceleration verification completed!');
  });
});