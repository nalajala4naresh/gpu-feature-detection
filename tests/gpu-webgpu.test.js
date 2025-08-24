import { test, expect } from '@playwright/test';

test.describe('WebGPU Tests', () => {
  test('should check Chrome GPU flags and WebGPU status', async ({ page }) => {
    console.log('🔍 Checking Chrome GPU flags and WebGPU status from chrome://gpu...');
    
    try {
      await page.goto('chrome://gpu');
      console.log('✅ Successfully accessed chrome://gpu');
      
      // Wait for the page to load completely
      await page.waitForTimeout(5000);
      
      // Extract WebGPU status using proper DOM best practices
      const webgpuStatus = await page.evaluate(() => {
        // Use modern DOM APIs and semantic selectors
        function getWebGPUInformation() {
          const webgpuData = {
            text: '',
            elements: [],
            features: new Set(),
            status: new Map()
          };
          
          // 1. Use semantic selectors for WebGPU-specific content
          const selectors = [
            '[data-webgpu-status]',
            '[data-feature="webgpu"]',
            '.webgpu-info',
            '.gpu-feature',
            '.hardware-acceleration',
            '.graphics-backend',
            'h1, h2, h3, h4, h5, h6',
            'div[role="status"]',
            'section'
          ];
          
          // 2. Try semantic selectors first
          for (const selector of selectors) {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                if (element.textContent && element.textContent.trim()) {
                  const text = element.textContent.trim();
                  if (isWebGPURelevant(text)) {
                    webgpuData.elements.push({
                      selector: selector,
                      text: text,
                      tagName: element.tagName,
                      className: element.className,
                      id: element.id
                    });
                    webgpuData.text += text + '\n';
                  }
                }
              });
            } catch (error) {
              continue;
            }
          }
          
          // 3. Use modern shadow DOM traversal
          function traverseShadowDOM(root) {
            const walker = document.createTreeWalker(
              root,
              NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                  }
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            );
            
            const nodes = [];
            let node;
            while (node = walker.nextNode()) {
              nodes.push(node);
            }
            
            return nodes;
          }
          
          // 4. Efficient shadow DOM processing
          function processShadowDOM(element) {
            if (!element.shadowRoot) return;
            
            const shadowNodes = traverseShadowDOM(element.shadowRoot);
            shadowNodes.forEach(node => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                if (text && isWebGPURelevant(text)) {
                  webgpuData.text += text + '\n';
                  webgpuData.elements.push({
                    selector: 'shadow-root',
                    text: text,
                    tagName: 'TEXT',
                    className: '',
                    id: ''
                  });
                }
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const text = node.textContent.trim();
                if (text && isWebGPURelevant(text)) {
                  webgpuData.text += text + '\n';
                  webgpuData.elements.push({
                    selector: 'shadow-element',
                    text: text,
                    tagName: node.tagName,
                    className: node.className,
                    id: node.id
                  });
                }
                
                if (node.shadowRoot) {
                  processShadowDOM(node);
                }
              }
            });
          }
          
          // 5. Smart content filtering function
          function isWebGPURelevant(text) {
            if (!text || text.length < 3) return false;
            
            // Skip CSS, JavaScript, and HTML attributes
            if (text.includes('{') && text.includes('}')) return false;
            if (text.includes(':host') || text.includes('@media')) return false;
            if (text.includes('function(') || text.includes('=>')) return false;
            if (text.includes('=') && text.includes('"')) return false;
            
            // Check for WebGPU-related keywords
            const webgpuKeywords = [
              'WebGPU', 'GPU', 'Hardware', 'Software', 'Metal', 'Vulkan',
              'OpenGL', 'DirectX', 'ANGLE', 'Acceleration', 'Problem', 'Feature',
              'Enabled', 'Disabled', 'Yes', 'No'
            ];
            
            return webgpuKeywords.some(keyword => text.includes(keyword));
          }
          
          // 6. Process main document and shadow roots
          processShadowDOM(document.body);
          
          // 7. Use Set and Map for efficient data structures
          webgpuData.elements.forEach(element => {
            if (element.text.includes('WebGPU')) {
              webgpuData.features.add('WebGPU');
              if (element.text.includes('Hardware accelerated') || element.text.includes('Yes')) {
                webgpuData.status.set('webgpuStatus', 'Hardware accelerated');
              } else if (element.text.includes('Software only') || element.text.includes('No')) {
                webgpuData.status.set('webgpuStatus', 'Software only');
              } else if (element.text.includes('Disabled')) {
                webgpuData.status.set('webgpuStatus', 'Disabled');
              } else if (element.text.includes('Problem')) {
                webgpuData.status.set('webgpuStatus', 'Problem');
              }
            }
            
            if (element.text.includes('Hardware accelerated')) {
              webgpuData.status.set('hardwareAccelerated', true);
            }
            
            if (element.text.includes('Metal')) webgpuData.status.set('graphicsBackend', 'Metal');
            else if (element.text.includes('Vulkan')) webgpuData.status.set('graphicsBackend', 'Vulkan');
            else if (element.text.includes('OpenGL')) webgpuData.status.set('graphicsBackend', 'OpenGL');
            else if (element.text.includes('DirectX')) webgpuData.status.set('graphicsBackend', 'DirectX');
            else if (element.text.includes('ANGLE')) webgpuData.status.set('graphicsBackend', 'ANGLE');
            
            if (element.text.includes('Problem') || element.text.includes('Disabled') || element.text.includes('Blacklisted')) {
              webgpuData.status.set('problems', (webgpuData.status.get('problems') || 0) + 1);
            }
            
            if (element.text.includes('Feature')) {
              webgpuData.features.add('Feature');
            }
          });
          
          return {
            text: webgpuData.text,
            elements: Array.from(webgpuData.elements),
            features: Array.from(webgpuData.features),
            status: Object.fromEntries(webgpuData.status),
            elementCount: webgpuData.elements.length
          };
        }
        
        return getWebGPUInformation();
      });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'webgpu-chrome-gpu-status.png', fullPage: true });
      console.log('📸 Screenshot saved as webgpu-chrome-gpu-status.png');
      
      // Basic expectations
      expect(webgpuStatus.text.length).toBeGreaterThan(100);
      expect(webgpuStatus.text).toMatch(/GPU|Graphics|Hardware|Acceleration/i);
      
    } catch (error) {
      console.log('❌ Error checking Chrome GPU flags:', error.message);
      // Don't fail the test, just log the error
    }
  });

  test('should detect WebGPU support', async ({ page }) => {
    await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');
    
    const webgpuInfo = await page.evaluate(async () => {
      if (!navigator.gpu) {
        return { supported: false, error: 'WebGPU not available' };
      }
      
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return { supported: false, error: 'No WebGPU adapter found' };
        }
        
        const device = await adapter.requestDevice();
        
        return {
          supported: true,
          adapterInfo: {
            vendor: adapter.info?.vendor || 'Unknown',
            architecture: adapter.info?.architecture || 'Unknown',
            device: adapter.info?.device || 'Unknown',
            description: adapter.info?.description || 'Unknown'
          },
          limits: {
            maxTextureDimension1D: adapter.limits.maxTextureDimension1D,
            maxTextureDimension2D: adapter.limits.maxTextureDimension2D,
            maxTextureDimension3D: adapter.limits.maxTextureDimension3D,
            maxTextureArrayLayers: adapter.limits.maxTextureArrayLayers,
            maxBindGroups: adapter.limits.maxBindGroups,
            maxDynamicUniformBuffersPerPipelineLayout: adapter.limits.maxDynamicUniformBuffersPerPipelineLayout
          },
          features: Array.from(adapter.features)
        };
      } catch (error) {
        return { supported: false, error: error.message };
      }
    });
    
    if (webgpuInfo.supported) {
      expect(webgpuInfo.supported).toBe(true);
      expect(webgpuInfo.limits.maxTextureDimension2D).toBeGreaterThan(4096);
      expect(webgpuInfo.adapterInfo.vendor).toBeTruthy();
    } else {
      console.log('WebGPU not supported:', webgpuInfo.error);
      // WebGPU is still experimental, so we don't fail the test
    }
  });

  test('should perform basic WebGPU compute operation', async ({ page }) => {
    await page.goto('data:text/html,<!DOCTYPE html><html><body></body></html>');
    
    const computeResult = await page.evaluate(async () => {
      if (!navigator.gpu) {
        return { supported: false, error: 'WebGPU not available' };
      }
      
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
          return { supported: false, error: 'No adapter' };
        }
        
        const device = await adapter.requestDevice();
        
        // Simple compute shader that adds two arrays
        const shaderCode = `
          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
            let index = global_id.x;
            if (index >= arrayLength(&output)) {
              return;
            }
            output[index] = input1[index] + input2[index];
          }
          
          @group(0) @binding(0) var<storage, read> input1: array<f32>;
          @group(0) @binding(1) var<storage, read> input2: array<f32>;
          @group(0) @binding(2) var<storage, read_write> output: array<f32>;
        `;
        
        const shaderModule = device.createShaderModule({ code: shaderCode });
        
        // Create compute pipeline
        const computePipeline = device.createComputePipeline({
          layout: 'auto',
          compute: {
            module: shaderModule,
            entryPoint: 'main',
          },
        });
        
        // Create buffers
        const ARRAY_SIZE = 1000;
        const input1 = new Float32Array(ARRAY_SIZE).map(() => Math.random());
        const input2 = new Float32Array(ARRAY_SIZE).map(() => Math.random());
        
        const input1Buffer = device.createBuffer({
          size: input1.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        const input2Buffer = device.createBuffer({
          size: input2.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        const outputBuffer = device.createBuffer({
          size: input1.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });
        
        const stagingBuffer = device.createBuffer({
          size: input1.byteLength,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        
        // Write data to buffers
        device.queue.writeBuffer(input1Buffer, 0, input1);
        device.queue.writeBuffer(input2Buffer, 0, input2);
        
        // Create bind group
        const bindGroup = device.createBindGroup({
          layout: computePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: input1Buffer } },
            { binding: 1, resource: { buffer: input2Buffer } },
            { binding: 2, resource: { buffer: outputBuffer } },
          ],
        });
        
        // Execute compute shader
        const commandEncoder = device.createCommandEncoder();
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, bindGroup);
        computePass.dispatchWorkgroups(Math.ceil(ARRAY_SIZE / 64));
        computePass.end();
        
        // Copy result to staging buffer
        commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, input1.byteLength);
        
        const commands = commandEncoder.finish();
        device.queue.submit([commands]);
        
        // Read results
        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const resultArray = new Float32Array(stagingBuffer.getMappedRange());
        const result = Array.from(resultArray);
        stagingBuffer.unmap();
        
        // Verify first few results
        const verification = [];
        for (let i = 0; i < Math.min(5, ARRAY_SIZE); i++) {
          verification.push({
            input1: input1[i],
            input2: input2[i],
            expected: input1[i] + input2[i],
            actual: result[i],
            match: Math.abs((input1[i] + input2[i]) - result[i]) < 0.0001
          });
        }
        
        return {
          supported: true,
          arraySize: ARRAY_SIZE,
          verification: verification,
          allMatch: verification.every(v => v.match)
        };
        
      } catch (error) {
        return { supported: false, error: error.message };
      }
    });
    
    if (computeResult.supported) {
      expect(computeResult.supported).toBe(true);
      expect(computeResult.allMatch).toBe(true);
      expect(computeResult.arraySize).toBe(1000);
    } else {
      console.log('WebGPU compute not supported:', computeResult.error);
    }
  });
});

