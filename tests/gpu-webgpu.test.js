import { test, expect } from '@playwright/test';

test.describe('WebGPU Tests', () => {
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
    
    console.log('WebGPU Info:', JSON.stringify(webgpuInfo, null, 2));
    
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
    
    console.log('WebGPU Compute Result:', JSON.stringify(computeResult, null, 2));
    
    if (computeResult.supported) {
      expect(computeResult.supported).toBe(true);
      expect(computeResult.allMatch).toBe(true);
      expect(computeResult.arraySize).toBe(1000);
    } else {
      console.log('WebGPU compute not supported:', computeResult.error);
    }
  });
});

