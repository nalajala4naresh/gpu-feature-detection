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
        extensions: gl.getSupportedExtensions(),
        limits: {
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
          maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
          maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
          maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
        }
      };
      
      // WebGL 2 specific limits
      if (features.webgl2) {
        const gl2 = canvas.getContext('webgl2');
        features.webgl2Limits = {
          maxColorAttachments: gl2.getParameter(gl2.MAX_COLOR_ATTACHMENTS),
          maxDrawBuffers: gl2.getParameter(gl2.MAX_DRAW_BUFFERS),
          max3DTextureSize: gl2.getParameter(gl2.MAX_3D_TEXTURE_SIZE),
          maxArrayTextureLayers: gl2.getParameter(gl2.MAX_ARRAY_TEXTURE_LAYERS)
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
      
      return features;
    });
    
    console.log('GPU Feature Detection:', JSON.stringify(featureDetection, null, 2));
    
    expect(featureDetection.webgl).toBe(true);
    expect(featureDetection.limits.maxTextureSize).toBeGreaterThanOrEqual(4096);
    expect(featureDetection.extensions.length).toBeGreaterThan(10);
    
    // On G5 instances, should have good GPU capabilities
    if (featureDetection.renderer) {
      expect(featureDetection.renderer.renderer).toMatch(/NVIDIA|GeForce|Tesla|Quadro/i);
    }
    
    if (featureDetection.webgl2) {
      expect(featureDetection.webgl2Limits.maxColorAttachments).toBeGreaterThanOrEqual(4);
      expect(featureDetection.webgl2Limits.max3DTextureSize).toBeGreaterThanOrEqual(256);
    }
  });

  // Only run WebGPU tests on Chromium since it's experimental
  test.skip(({ browserName }) => browserName !== 'chromium', 'WebGPU test for Chromium only');
  
  test('should check WebGPU adapter capabilities', async ({ page }) => {
    await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');
    
    const webgpuCapabilities = await page.evaluate(async () => {
      if (!navigator.gpu) {
        return { supported: false, reason: 'navigator.gpu not available' };
      }
      
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return { supported: false, reason: 'No adapter available' };
        }
        
        return {
          supported: true,
          info: adapter.info,
          features: Array.from(adapter.features),
          limits: Object.fromEntries(
            Object.entries(adapter.limits).map(([key, value]) => [key, value])
          )
        };
      } catch (error) {
        return { supported: false, reason: error.message };
      }
    });
    
    console.log('WebGPU Capabilities:', JSON.stringify(webgpuCapabilities, null, 2));
    
    // WebGPU is experimental, so we don't require it to work
    if (webgpuCapabilities.supported) {
      expect(webgpuCapabilities.supported).toBe(true);
      expect(webgpuCapabilities.limits).toBeTruthy();
    } else {
      console.log('WebGPU not supported:', webgpuCapabilities.reason);
    }
  });
});
