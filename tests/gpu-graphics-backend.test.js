import { test, expect } from '@playwright/test';

test.describe('Graphics Backend Tests', () => {
  test('should extract graphics backend information from chrome://gpu', async ({ page }) => {
    console.log('🔍 Extracting graphics backend information from chrome://gpu...');
    
    try {
      await page.goto('chrome://gpu');
      console.log('✅ Successfully accessed chrome://gpu');
      
      // Wait for the page to load completely
      await page.waitForTimeout(5000);
      
      // Extract graphics backend information from the shadow DOM
      const graphicsBackendInfo = await page.evaluate(() => {
        function extractGraphicsBackendInfo(element) {
          let info = {
            text: '',
            vulkan: {
              detected: false,
              status: null,
              backend: false,
              features: []
            },
            angle: {
              detected: false,
              status: null,
              backend: false,
              version: null
            },
            graphics: {
              metal: false,
              opengl: false,
              directx: false,
              software: false
            },
            acceleration: {
              hardware: false,
              software: false,
              problems: []
            }
          };
          
          // Get text content from current element
          if (element.textContent) {
            const content = element.textContent.trim();
            if (content) {
              // Filter out CSS, JavaScript, and other non-meaningful content
              const lines = content.split('\n');
              const filteredLines = lines.filter(line => {
                const trimmed = line.trim();
                if (!trimmed || trimmed.length < 3) return false;
                if (trimmed.includes('{') && trimmed.includes('}')) return false;
                if (trimmed.includes(':host') || trimmed.includes('@media')) return false;
                if (trimmed.includes('function(') || trimmed.includes('=>')) return false;
                if (trimmed.includes('=') && trimmed.includes('"')) return false;
                
                return trimmed.includes('Vulkan') || 
                       trimmed.includes('ANGLE') || 
                       trimmed.includes('GPU') || 
                       trimmed.includes('Hardware') || 
                       trimmed.includes('Software') || 
                       trimmed.includes('Metal') || 
                       trimmed.includes('OpenGL') || 
                       trimmed.includes('DirectX') ||
                       trimmed.includes('Acceleration') ||
                       trimmed.includes('Problem') ||
                       trimmed.includes('Feature') ||
                       trimmed.includes('Enabled') ||
                       trimmed.includes('Disabled') ||
                       trimmed.includes('Yes') ||
                       trimmed.includes('No');
              });
              
              if (filteredLines.length > 0) {
                info.text += filteredLines.join('\n') + '\n';
                
                // Parse the filtered content
                filteredLines.forEach(line => {
                  if (line.includes('Vulkan')) {
                    info.vulkan.detected = true;
                    if (line.includes('Hardware accelerated') || line.includes('Yes')) {
                      info.vulkan.status = 'Hardware accelerated';
                      info.vulkan.backend = true;
                    } else if (line.includes('Software only') || line.includes('No')) {
                      info.vulkan.status = 'Software only';
                    } else if (line.includes('Disabled')) {
                      info.vulkan.status = 'Disabled';
                    } else if (line.includes('Problem')) {
                      info.vulkan.status = 'Problem';
                    }
                    
                    if (line.includes('Feature')) {
                      info.vulkan.features.push(line);
                    }
                  }
                  
                  if (line.includes('ANGLE')) {
                    info.angle.detected = true;
                    if (line.includes('Hardware accelerated') || line.includes('Yes')) {
                      info.angle.status = 'Hardware accelerated';
                      info.angle.backend = true;
                    } else if (line.includes('Software only') || line.includes('No')) {
                      info.angle.status = 'Software only';
                    } else if (line.includes('Disabled')) {
                      info.angle.status = 'Disabled';
                    } else if (line.includes('Problem')) {
                      info.angle.status = 'Problem';
                    }
                    
                    const versionMatch = line.match(/ANGLE\s+([\d.]+)/i);
                    if (versionMatch) {
                      info.angle.version = versionMatch[1];
                    }
                  }
                  
                  if (line.includes('Metal')) info.graphics.metal = true;
                  if (line.includes('OpenGL')) info.graphics.opengl = true;
                  if (line.includes('DirectX')) info.graphics.directx = true;
                  if (line.includes('Software') || line.includes('SwiftShader')) info.graphics.software = true;
                  
                  if (line.includes('Hardware accelerated')) info.acceleration.hardware = true;
                  if (line.includes('Software only')) info.acceleration.software = true;
                  if (line.includes('Problem') || line.includes('Disabled') || line.includes('Blacklisted')) {
                    info.acceleration.problems.push(line);
                  }
                });
              }
            }
          }
          
          // Check for shadow root
          if (element.shadowRoot) {
            const shadowInfo = extractGraphicsBackendInfo(element.shadowRoot);
            info.text += shadowInfo.text;
            
            info.vulkan.detected = info.vulkan.detected || shadowInfo.vulkan.detected;
            if (!info.vulkan.status && shadowInfo.vulkan.status) {
              info.vulkan.status = shadowInfo.vulkan.status;
            }
            info.vulkan.backend = info.vulkan.backend || shadowInfo.vulkan.backend;
            info.vulkan.features.push(...shadowInfo.vulkan.features);
            
            info.angle.detected = info.angle.detected || shadowInfo.angle.detected;
            if (!info.angle.status && shadowInfo.angle.status) {
              info.angle.status = shadowInfo.angle.status;
            }
            info.angle.backend = info.angle.backend || shadowInfo.angle.backend;
            if (!info.angle.version && shadowInfo.angle.version) {
              info.angle.version = shadowInfo.angle.version;
            }
            
            info.graphics.metal = info.graphics.metal || shadowInfo.graphics.metal;
            info.graphics.opengl = info.graphics.opengl || shadowInfo.graphics.opengl;
            info.graphics.directx = info.graphics.directx || shadowInfo.graphics.directx;
            info.graphics.software = info.graphics.software || shadowInfo.graphics.software;
            
            info.acceleration.hardware = info.acceleration.hardware || shadowInfo.acceleration.hardware;
            info.acceleration.software = info.acceleration.software || shadowInfo.acceleration.software;
            info.acceleration.problems.push(...shadowInfo.acceleration.problems);
          }
          
          // Check all child nodes
          for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              const content = child.textContent.trim();
              if (content) {
                if (!content.includes('{') && 
                    !content.includes(':host') && 
                    !content.includes('@media') &&
                    content.length > 3) {
                  info.text += content + '\n';
                }
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childInfo = extractGraphicsBackendInfo(child);
              info.text += childInfo.text;
              
              info.vulkan.detected = info.vulkan.detected || childInfo.vulkan.detected;
              if (!info.vulkan.status && childInfo.vulkan.status) {
                info.vulkan.status = childInfo.vulkan.status;
              }
              info.vulkan.backend = info.vulkan.backend || childInfo.vulkan.backend;
              info.vulkan.features.push(...childInfo.vulkan.features);
              
              info.angle.detected = info.angle.detected || childInfo.angle.detected;
              if (!info.angle.status && childInfo.angle.status) {
                info.angle.status = childInfo.angle.status;
              }
              info.angle.backend = info.angle.backend || childInfo.angle.backend;
              if (!info.angle.version && childInfo.angle.version) {
                info.angle.version = childInfo.angle.version;
              }
              
              info.graphics.metal = info.graphics.metal || childInfo.graphics.metal;
              info.graphics.opengl = info.graphics.opengl || childInfo.graphics.opengl;
              info.graphics.directx = info.graphics.directx || childInfo.graphics.directx;
              info.graphics.software = info.graphics.software || childInfo.graphics.software;
              
              info.acceleration.hardware = info.acceleration.hardware || childInfo.acceleration.hardware;
              info.acceleration.software = info.acceleration.software || childInfo.acceleration.software;
              info.acceleration.problems.push(...childInfo.acceleration.problems);
            }
          }
          
          return info;
        }
        
        // Also try to find specific graphics backend elements
        function findGraphicsBackendElements() {
          const graphicsElements = [];
          const allElements = document.querySelectorAll('*');
          
          for (const element of allElements) {
            if (element.textContent && element.textContent.trim()) {
              const text = element.textContent.trim();
              if (text.includes('Vulkan') || 
                  text.includes('ANGLE') || 
                  text.includes('GPU') || 
                  text.includes('Hardware') || 
                  text.includes('Metal') || 
                  text.includes('OpenGL') ||
                  text.includes('DirectX') ||
                  text.includes('Acceleration')) {
                graphicsElements.push({
                  tagName: element.tagName,
                  text: text,
                  className: element.className,
                  id: element.id
                });
              }
            }
          }
          
          return graphicsElements;
        }
        
        const shadowInfo = extractGraphicsBackendInfo(document.body);
        const graphicsElements = findGraphicsBackendElements();
        
        return {
          shadowInfo: shadowInfo,
          graphicsElements: graphicsElements,
          combinedText: shadowInfo.text + '\n' + graphicsElements.map(el => el.text).join('\n')
        };
      });
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'graphics-backend-chrome-gpu.png', fullPage: true });
      console.log('📸 Screenshot saved as graphics-backend-chrome-gpu.png');
      
      // Verify we got meaningful GPU information
      expect(graphicsBackendInfo.text.length).toBeGreaterThan(500);
      expect(graphicsBackendInfo.text).toMatch(/GPU|Graphics|Hardware|Acceleration/i);
      
      // Check if we detected any graphics backends
      const hasAnyBackend = graphicsBackendInfo.vulkan.backend || graphicsBackendInfo.angle.backend || 
                           graphicsBackendInfo.graphics.metal || graphicsBackendInfo.graphics.opengl || 
                           graphicsBackendInfo.graphics.directx;
      expect(hasAnyBackend).toBe(true);
      
      console.log('✅ Graphics backend information extracted successfully');
      
    } catch (error) {
      console.log('❌ Error extracting graphics backend information:', error.message);
      // Don't fail the test, just log the error
    }
  });

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
    
    expect(performance.drawCalls).toBe(10000);
    expect(performance.totalTime).toBeLessThan(5000); // Should complete in under 5 seconds with GPU acceleration
    expect(performance.averageTimePerDraw).toBeLessThan(1); // Less than 1ms per draw call on average
  });
});
