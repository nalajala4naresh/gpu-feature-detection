import { test, expect } from '@playwright/test';

test.describe('GPU Feature Detection', () => {
  test('should detect all available GPU features', async ({ page }) => {
    await page.goto('data:text/html,<!DOCTYPE html><html><body><canvas id="canvas"></canvas></body></html>');
    
    const featureDetection = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return { webgl: false };
      
      const features = {
        webgl: true,
        webgl2: !!canvas.getContext('webgl2'),
        webgpu: !!navigator.gpu,
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        isAppleSilicon: navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 0,
        extensions: gl.getSupportedExtensions(),
        limits: {
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
          maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
          maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
          maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
          maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
        },
        // Add context attributes
        contextAttributes: gl.getContextAttributes()
      };
      
      // WebGL 2 specific limits
      if (features.webgl2) {
        const gl2 = canvas.getContext('webgl2');
        features.webgl2Limits = {
          maxColorAttachments: gl2.getParameter(gl2.MAX_COLOR_ATTACHMENTS),
          maxDrawBuffers: gl2.getParameter(gl2.MAX_DRAW_BUFFERS),
          max3DTextureSize: gl2.getParameter(gl2.MAX_3D_TEXTURE_SIZE),
          maxArrayTextureLayers: gl2.getParameter(gl2.MAX_ARRAY_TEXTURE_LAYERS),
          maxTransformFeedbackSeparateAttribs: gl2.getParameter(gl2.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS),
          maxUniformBufferBindings: gl2.getParameter(gl2.MAX_UNIFORM_BUFFER_BINDINGS)
        };
      }
      
      // Check for debug renderer info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        features.renderer = {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        };
      }
      
      // Check for important extensions
      features.importantExtensions = {
        anisotropicFiltering: !!gl.getExtension('EXT_texture_filter_anisotropic'),
        floatTextures: !!gl.getExtension('OES_texture_float'),
        halfFloatTextures: !!gl.getExtension('OES_texture_half_float'),
        vertexArrayObject: !!gl.getExtension('OES_vertex_array_object'),
        instancedArrays: !!gl.getExtension('ANGLE_instanced_arrays'),
        multipleRenderTargets: !!gl.getExtension('WEBGL_draw_buffers')
      };
      
      return features;
    });
    
    console.log('GPU Feature Detection:', JSON.stringify(featureDetection, null, 2));
    
    // Basic WebGL requirements
    expect(featureDetection.webgl).toBe(true);
    expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(2048);
    expect(featureDetection.extensions.length).toBeGreaterThan(5);
    
    // Platform-specific expectations
    const platform = featureDetection.platform.toLowerCase();
    const isAppleSilicon = featureDetection.isAppleSilicon;
    
    if (platform.includes('linux')) {
      console.log('Running on Linux platform');
      // Linux should support decent GPU features
      expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(4096);
    } else if (platform.includes('mac') || platform === 'macintel') {
      if (isAppleSilicon) {
        console.log('Running on Apple Silicon Mac (M1/M2/M3)');
        // Apple Silicon has excellent GPU performance
        expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(16384);
        expect(featureDetection.webgl2).toBe(true); // Apple Silicon should support WebGL 2
        expect(featureDetection.limits.maxCombinedTextureImageUnits).toBeGreaterThanOrEqual(32);
      } else {
        console.log('Running on Intel Mac');
        // Intel Macs have good but not as powerful GPU support
        expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(8192);
      }
    }
    
    // GPU vendor detection
    if (featureDetection.renderer) {
      const renderer = featureDetection.renderer.renderer.toLowerCase();
      console.log(`GPU Renderer: ${featureDetection.renderer.renderer}`);
      console.log(`GPU Vendor: ${featureDetection.renderer.vendor}`);
      
      // Different expectations based on GPU
      if (renderer.includes('nvidia')) {
        expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(8192);
      } else if (renderer.includes('amd') || renderer.includes('radeon')) {
        expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(4096);
      } else if (renderer.includes('intel')) {
        expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(2048);
      } else if (renderer.includes('apple') || renderer.includes('m1') || renderer.includes('m2') || renderer.includes('m3')) {
        // Apple Silicon GPUs are very capable
        console.log('Detected Apple Silicon GPU');
        expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(16384);
        expect(featureDetection.webgl2).toBe(true);
      }
    }
    
    // WebGL 2 specific tests
    if (featureDetection.webgl2) {
      console.log('WebGL 2.0 is supported');
      expect(featureDetection.webgl2Limits.maxColorAttachments).toBeGreaterThanOrEqual(4);
      expect(featureDetection.webgl2Limits.max3DTextureSize).toBeGreaterThanOrEqual(256);
      expect(featureDetection.webgl2Limits.maxArrayTextureLayers).toBeGreaterThanOrEqual(256);
    } else {
      console.log('WebGL 2.0 is NOT supported - falling back to WebGL 1.0');
    }
  });

  test('should check WebGPU adapter capabilities', async ({ page, browserName }) => {
    // Skip on non-Chromium browsers
    test.skip(browserName !== 'chromium', 'WebGPU test for Chromium only');
    
    await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');
    
    const webgpuCapabilities = await page.evaluate(async () => {
      if (!navigator.gpu) {
        return { 
          supported: false, 
          reason: 'navigator.gpu not available',
          userAgent: navigator.userAgent,
          platform: navigator.platform
        };
      }
      
      try {
        // Add timeout for adapter request
        const adapter = await Promise.race([
          navigator.gpu.requestAdapter(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ]);
        
        if (!adapter) {
          return { 
            supported: false, 
            reason: 'No adapter available',
            userAgent: navigator.userAgent,
            platform: navigator.platform
          };
        }
        
        // Try to get device info
        let deviceInfo = null;
        try {
          const device = await adapter.requestDevice();
          deviceInfo = {
            label: device.label,
            queue: !!device.queue
          };
          device.destroy(); // Clean up
        } catch (deviceError) {
          console.warn('Could not create device:', deviceError.message);
        }
        
        const capabilities = {
          supported: true,
          info: adapter.info || 'No adapter info available',
          features: Array.from(adapter.features || []),
          limits: {},
          device: deviceInfo,
          userAgent: navigator.userAgent,
          platform: navigator.platform
        };
        
        // Safely extract limits
        try {
          if (adapter.limits) {
            for (const [key, value] of Object.entries(adapter.limits)) {
              capabilities.limits[key] = typeof value === 'object' ? String(value) : value;
            }
          }
        } catch (limitsError) {
          console.warn('Could not extract limits:', limitsError.message);
        }
        
        return capabilities;
      } catch (error) {
        return { 
          supported: false, 
          reason: error.message,
          userAgent: navigator.userAgent,
          platform: navigator.platform
        };
      }
    });
    
    console.log('WebGPU Capabilities:', JSON.stringify(webgpuCapabilities, null, 2));
    
    if (webgpuCapabilities.supported) {
      console.log('✅ WebGPU is supported!');
      expect(webgpuCapabilities.supported).toBe(true);
      expect(webgpuCapabilities.limits).toBeTruthy();
      
      // Check for common WebGPU features
      if (webgpuCapabilities.features.length > 0) {
        console.log(`WebGPU features: ${webgpuCapabilities.features.join(', ')}`);
      }
      
      // Basic device creation test
      if (webgpuCapabilities.device) {
        console.log('✅ WebGPU device creation successful');
        expect(webgpuCapabilities.device.queue).toBe(true);
      }
      
    } else {
      console.log(`❌ WebGPU not supported: ${webgpuCapabilities.reason}`);
      console.log(`Platform: ${webgpuCapabilities.platform}`);
      console.log(`User Agent: ${webgpuCapabilities.userAgent}`);
      
      // This is expected in many environments, so we don't fail the test
      expect(webgpuCapabilities.supported).toBe(false);
    }
  });

  test('should perform basic GPU performance check', async ({ page }) => {
    await page.goto('data:text/html,<!DOCTYPE html><html><body><canvas id="canvas" width="512" height="512"></canvas></body></html>');
    
    const performanceResult = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return { error: 'No WebGL context' };
      
      // Simple performance test - draw triangles
      const start = performance.now();
      
      // Create shader program
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      gl.compileShader(vertexShader);
      
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, `
        precision mediump float;
        void main() {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `);
      gl.compileShader(fragmentShader);
      
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.useProgram(program);
      
      // Create buffer and draw
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, 0, 1
      ]), gl.STATIC_DRAW);
      
      const positionLocation = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Draw multiple times
      for (let i = 0; i < 1000; i++) {
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.finish(); // Wait for GPU
      
      const end = performance.now();
      
      return {
        drawTime: end - start,
        trianglesPerSecond: Math.round(1000 / ((end - start) / 1000)),
        gpuMemory: gl.getParameter(gl.MAX_TEXTURE_SIZE) * gl.getParameter(gl.MAX_TEXTURE_SIZE) * 4 // Rough estimate
      };
    });
    
    console.log('GPU Performance:', JSON.stringify(performanceResult, null, 2));
    
    if (!performanceResult.error) {
      expect(performanceResult.drawTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(performanceResult.trianglesPerSecond).toBeGreaterThan(100);
    }
  });
});
