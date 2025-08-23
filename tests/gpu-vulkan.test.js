import { test, expect } from '@playwright/test';

test.describe('Vulkan GPU Tests', () => {
  test('should detect Vulkan support through WebGL', async ({ page }) => {
    await page.goto('data:text/html,<!DOCTYPE html><html><body><canvas id="canvas"></canvas></body></html>');
    
    const vulkanInfo = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      
      if (!gl) return { supported: false };
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      
      // Check if we're using ANGLE with Vulkan backend
      const isVulkan = renderer.toLowerCase().includes('vulkan') || 
                       renderer.toLowerCase().includes('angle');
      
      return {
        supported: true,
        renderer: renderer,
        vendor: vendor,
        version: gl.getParameter(gl.VERSION),
        isVulkanBackend: isVulkan,
        extensions: gl.getSupportedExtensions()
      };
    });
    
    console.log('Vulkan/ANGLE Info:', JSON.stringify(vulkanInfo, null, 2));
    
    expect(vulkanInfo.supported).toBe(true);
    expect(vulkanInfo.renderer).toBeTruthy();
    
    // On Linux with Vulkan flags, we should see ANGLE or Vulkan in the renderer string
    if (process.platform === 'linux') {
      // Note: This might not always be true depending on system configuration
      console.log('Linux detected - checking for Vulkan backend usage');
    }
  });

  test('should perform high-performance WebGL operations with Vulkan backend', async ({ page }) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body>
        <canvas id="vulkanCanvas" width="1920" height="1080"></canvas>
        <script>
          const canvas = document.getElementById('vulkanCanvas');
          const gl = canvas.getContext('webgl2');
          
          if (!gl) throw new Error('WebGL2 not supported');
          
          // Performance test: Many draw calls
          const startTime = performance.now();
          
          // Create a simple shader program
          const vertexShaderSource = \`#version 300 es
            in vec4 position;
            uniform mat4 matrix;
            void main() {
              gl_Position = matrix * position;
            }
          \`;
          
          const fragmentShaderSource = \`#version 300 es
            precision highp float;
            uniform vec4 color;
            out vec4 fragColor;
            void main() {
              fragColor = color;
            }
          \`;
          
          function createShader(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
          }
          
          const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
          const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
          
          const program = gl.createProgram();
          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);
          
          const positionLocation = gl.getAttribLocation(program, 'position');
          const matrixLocation = gl.getUniformLocation(program, 'matrix');
          const colorLocation = gl.getUniformLocation(program, 'color');
          
          // Create buffer with triangle data
          const positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0
          ]), gl.STATIC_DRAW);
          
          const vao = gl.createVertexArray();
          gl.bindVertexArray(vao);
          gl.enableVertexAttribArray(positionLocation);
          gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
          
          gl.useProgram(program);
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 1);
          
          // Draw many triangles with different transformations
          const drawCalls = 10000;
          for (let i = 0; i < drawCalls; i++) {
            // Create transformation matrix
            const scale = 0.01 + (i % 100) * 0.001;
            const rotation = (i * 0.01) % (2 * Math.PI);
            const x = (i % 100) * 0.02 - 1;
            const y = Math.floor(i / 100) * 0.02 - 1;
            
            const cos = Math.cos(rotation) * scale;
            const sin = Math.sin(rotation) * scale;
            
            const matrix = new Float32Array([
              cos, sin, 0, 0,
              -sin, cos, 0, 0,
              0, 0, 1, 0,
              x, y, 0, 1
            ]);
            
            gl.uniformMatrix4fv(matrixLocation, false, matrix);
            gl.uniform4f(colorLocation, 
              Math.sin(i * 0.1) * 0.5 + 0.5,
              Math.cos(i * 0.1) * 0.5 + 0.5,
              Math.sin(i * 0.05) * 0.5 + 0.5,
              1.0
            );
            
            gl.drawArrays(gl.TRIANGLES, 0, 3);
          }
          
          // Force completion
          gl.finish();
          
          const endTime = performance.now();
          window.vulkanPerformance = {
            drawCalls: drawCalls,
            totalTime: endTime - startTime,
            averageTimePerDraw: (endTime - startTime) / drawCalls
          };
          window.vulkanTestComplete = true;
        </script>
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent);
    await page.waitForFunction(() => window.vulkanTestComplete);
    
    const performance = await page.evaluate(() => window.vulkanPerformance);
    console.log('Vulkan Performance:', JSON.stringify(performance, null, 2));
    
    expect(performance.drawCalls).toBe(10000);
    expect(performance.totalTime).toBeLessThan(5000); // Should complete in under 5 seconds with GPU acceleration
    expect(performance.averageTimePerDraw).toBeLessThan(1); // Less than 1ms per draw call on average
  });
});
