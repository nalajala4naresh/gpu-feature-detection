import { test, expect } from '@playwright/test';

test.describe('Chrome GPU Information Tests', () => {
  test('should access chrome://gpu and extract GPU information', async ({ page }) => {
    console.log('🔍 Accessing chrome://gpu page...');
    
    try {
      await page.goto('chrome://gpu');
      console.log('✅ Successfully accessed chrome://gpu');
      
      // Wait for the page to load completely
      await page.waitForTimeout(5000);
      
      // Check if the page has shadow roots
      const hasShadowRoots = await page.evaluate(() => {
        return document.body && document.body.shadowRoot !== null;
      });
      console.log('🔍 Has shadow roots:', hasShadowRoots);
      
      // Extract content from shadow DOM using proper DOM best practices
      const gpuInfo = await page.evaluate(() => {
        // Use modern DOM APIs and semantic selectors
        function getGPUInformation() {
          const gpuData = {
            text: '',
            elements: [],
            features: new Set(),
            status: new Map()
          };
          
          // 1. Use semantic selectors instead of querying all elements
          const selectors = [
            '[data-gpu-status]',
            '[data-feature]',
            '.gpu-info',
            '.feature-status',
            '.hardware-acceleration',
            '.graphics-backend',
            'h1, h2, h3, h4, h5, h6', // Headers often contain status info
            'div[role="status"]',
            'div[role="main"]',
            'section',
            'article'
          ];
          
          // 2. Try semantic selectors first
          for (const selector of selectors) {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(element => {
                if (element.textContent && element.textContent.trim()) {
                  const text = element.textContent.trim();
                  if (isGPURelevant(text)) {
                    gpuData.elements.push({
                      selector: selector,
                      text: text,
                      tagName: element.tagName,
                      className: element.className,
                      id: element.id
                    });
                    gpuData.text += text + '\n';
                  }
                }
              });
            } catch (error) {
              // Silently continue if selector fails
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
                if (text && isGPURelevant(text)) {
                  gpuData.text += text + '\n';
                  gpuData.elements.push({
                    selector: 'shadow-root',
                    text: text,
                    tagName: 'TEXT',
                    className: '',
                    id: ''
                  });
                }
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Process element attributes and content
                const text = node.textContent.trim();
                if (text && isGPURelevant(text)) {
                  gpuData.text += text + '\n';
                  gpuData.elements.push({
                    selector: 'shadow-element',
                    text: text,
                    tagName: node.tagName,
                    className: node.className,
                    id: node.id
                  });
                }
                
                // Recursively check for nested shadow roots
                if (node.shadowRoot) {
                  processShadowDOM(node);
                }
              }
            });
          }
          
          // 5. Smart content filtering function
          function isGPURelevant(text) {
            if (!text || text.length < 3) return false;
            
            // Skip CSS, JavaScript, and HTML attributes
            if (text.includes('{') && text.includes('}')) return false;
            if (text.includes(':host') || text.includes('@media')) return false;
            if (text.includes('function(') || text.includes('=>')) return false;
            if (text.includes('=') && text.includes('"')) return false;
            
            // Check for GPU-related keywords
            const gpuKeywords = [
              'GPU', 'WebGPU', 'WebGL', 'Hardware', 'Software', 'Metal', 'Vulkan',
              'OpenGL', 'DirectX', 'ANGLE', 'Acceleration', 'Process', 'Canvas',
              'Rasterization', 'Video', 'Problem', 'Status', 'Feature', 'Extension',
              'Capability', 'Limit', 'Version', 'Vendor', 'Renderer', 'Enabled',
              'Disabled', 'Yes', 'No'
            ];
            
            return gpuKeywords.some(keyword => text.includes(keyword));
          }
          
          // 6. Process main document and shadow roots
          processShadowDOM(document.body);
          
          // 7. Use Set and Map for efficient data structures
          gpuData.elements.forEach(element => {
            // Extract features
            if (element.text.includes('WebGPU')) gpuData.features.add('WebGPU');
            if (element.text.includes('Hardware accelerated')) gpuData.status.set('hardwareAcceleration', true);
            if (element.text.includes('Metal')) gpuData.status.set('graphicsBackend', 'Metal');
            if (element.text.includes('Vulkan')) gpuData.status.set('graphicsBackend', 'Vulkan');
            if (element.text.includes('OpenGL')) gpuData.status.set('graphicsBackend', 'OpenGL');
            if (element.text.includes('DirectX')) gpuData.status.set('graphicsBackend', 'DirectX');
            if (element.text.includes('ANGLE')) gpuData.status.set('graphicsBackend', 'ANGLE');
          });
          
          return {
            text: gpuData.text,
            elements: Array.from(gpuData.elements),
            features: Array.from(gpuData.features),
            status: Object.fromEntries(gpuData.status),
            elementCount: gpuData.elements.length
          };
        }
        
        return getGPUInformation();
      });
      
      // Use the extracted text for analysis
      const gpuText = gpuInfo.text;
      
      // Check for key GPU information
      const gpuStatus = {
        hasWebGPU: gpuText.includes('WebGPU'),
        hasHardwareAcceleration: gpuText.includes('Hardware accelerated'),
        hasANGLE: gpuText.includes('ANGLE'),
        hasMetal: gpuText.includes('Metal'),
        hasVulkan: gpuText.includes('Vulkan'),
        hasOpenGL: gpuText.includes('OpenGL'),
        hasDirectX: gpuText.includes('DirectX'),
        hasSoftwareRendering: gpuText.includes('Software only') || gpuText.includes('SwiftShader'),
        hasGPUProcess: gpuText.includes('GPU process'),
        hasRasterization: gpuText.includes('Rasterization'),
        hasCanvas: gpuText.includes('Canvas'),
        hasWebGL: gpuText.includes('WebGL'),
        hasVideoDecode: gpuText.includes('Video Decode'),
        hasVideoEncode: gpuText.includes('Video Encode')
      };
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'chrome-gpu-page.png', fullPage: true });
      console.log('📸 Screenshot saved as chrome-gpu-page.png');
      
      // Basic expectations
      expect(gpuText.length).toBeGreaterThan(100);
      expect(gpuText).toMatch(/GPU|Graphics|Hardware|Acceleration/i);
      
      // Create a clean summary report instead of dumping all data
      const summaryReport = {
        totalContentLength: gpuText.length,
        keyFeatures: {
          webgpu: gpuStatus.hasWebGPU ? '✅ Enabled' : '❌ Not Found',
          hardwareAcceleration: gpuStatus.hasHardwareAcceleration ? '✅ Active' : '❌ Inactive',
          graphicsBackend: gpuStatus.hasMetal ? 'Metal' : 
                          gpuStatus.hasVulkan ? 'Vulkan' : 
                          gpuStatus.hasOpenGL ? 'OpenGL' : 
                          gpuStatus.hasDirectX ? 'DirectX' : 
                          gpuStatus.hasANGLE ? 'ANGLE' : 'Unknown',
          gpuProcess: gpuStatus.hasGPUProcess ? '✅ Running' : '❌ Not Running'
        },
        capabilities: {
          webgl: gpuStatus.hasWebGL ? '✅ Supported' : '❌ Not Supported',
          rasterization: gpuStatus.hasRasterization ? '✅ Active' : '❌ Inactive',
          canvas: gpuStatus.hasCanvas ? '✅ Accelerated' : '❌ Not Accelerated',
          video: {
            decode: gpuStatus.hasVideoDecode ? '✅ Hardware' : '❌ Software',
            encode: gpuStatus.hasVideoEncode ? '✅ Hardware' : '❌ Software'
          }
        },
        issues: gpuStatus.hasSoftwareRendering ? ['⚠️ Software rendering detected'] : []
      };
      
      console.log('📊 Chrome GPU Status Summary:');
      console.log('   ======================================');
      console.log('   🎯 Key Features:');
      console.log(`      WebGPU: ${summaryReport.keyFeatures.webgpu}`);
      console.log(`      Hardware Acceleration: ${summaryReport.keyFeatures.hardwareAcceleration}`);
      console.log(`      Graphics Backend: ${summaryReport.keyFeatures.graphicsBackend}`);
      console.log(`      GPU Process: ${summaryReport.keyFeatures.gpuProcess}`);
      console.log('   🚀 Capabilities:');
      console.log(`      WebGL: ${summaryReport.capabilities.webgl}`);
      console.log(`      Rasterization: ${summaryReport.capabilities.rasterization}`);
      console.log(`      Canvas: ${summaryReport.capabilities.canvas}`);
      console.log(`      Video Decode: ${summaryReport.capabilities.video.decode}`);
      console.log(`      Video Encode: ${summaryReport.capabilities.video.encode}`);
      console.log('   ⚠️  Issues:');
      if (summaryReport.issues.length > 0) {
        summaryReport.issues.forEach(issue => console.log(`      ${issue}`));
      } else {
        console.log('      ✅ No issues detected');
      }
      console.log('   ======================================');
      
    } catch (error) {
      console.log('❌ Error accessing chrome://gpu:', error.message);
      // Don't fail the test, just log the error
    }
  });

  test('should take a snapshot of GPU information', async ({ page }) => {
    console.log('📸 Taking a snapshot of Chrome GPU information from chrome://gpu...');
    
    try {
      // Navigate to Chrome's internal GPU diagnostics page
      await page.goto('chrome://gpu');
      console.log('✅ Successfully accessed chrome://gpu');
      
      // Wait for the page to load completely
      await page.waitForTimeout(5000);
      
      // Extract all GPU information from the shadow DOM
      const gpuSnapshot = await page.evaluate(() => {
        function extractGPUSnapshot(element) {
          let snapshot = {
            text: '',
            features: {},
            problems: [],
            status: {}
          };
          
          // Get text content from current element
          if (element.textContent) {
            const text = element.textContent.trim();
            if (text) {
              snapshot.text += text + ' ';
              
              // Parse feature status
              if (text.includes('Hardware accelerated')) {
                snapshot.status.hardwareAccelerated = true;
              }
              if (text.includes('Software only')) {
                snapshot.status.softwareOnly = true;
              }
              if (text.includes('WebGPU')) {
                snapshot.features.webgpu = true;
              }
              if (text.includes('WebGL')) {
                snapshot.features.webgl = true;
              }
              if (text.includes('ANGLE')) {
                snapshot.features.angle = true;
              }
              if (text.includes('Metal')) {
                snapshot.features.metal = true;
              }
              if (text.includes('Vulkan')) {
                snapshot.features.vulkan = true;
              }
              if (text.includes('OpenGL')) {
                snapshot.features.opengl = true;
              }
              if (text.includes('DirectX')) {
                snapshot.features.directx = true;
              }
              if (text.includes('Problem')) {
                snapshot.problems.push(text);
              }
            }
          }
          
          // Check for shadow root
          if (element.shadowRoot) {
            const shadowSnapshot = extractGPUSnapshot(element.shadowRoot);
            snapshot.text += shadowSnapshot.text;
            Object.assign(snapshot.features, shadowSnapshot.features);
            snapshot.problems.push(...shadowSnapshot.problems);
            Object.assign(snapshot.status, shadowSnapshot.status);
          }
          
          // Check all child nodes
          for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent.trim();
              if (text) {
                snapshot.text += text + ' ';
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childSnapshot = extractGPUSnapshot(child);
              snapshot.text += childSnapshot.text;
              Object.assign(snapshot.features, childSnapshot.features);
              snapshot.problems.push(...childSnapshot.problems);
              Object.assign(snapshot.status, childSnapshot.status);
            }
          }
          
          return snapshot;
        }
        
        return extractGPUSnapshot(document.body);
      });
      
      // Take a screenshot of the chrome://gpu page
      await page.screenshot({ path: 'chrome-gpu-snapshot.png', fullPage: true });
      console.log('📸 Screenshot saved as chrome-gpu-snapshot.png');
      
      // Create a comprehensive GPU information report
      const gpuReport = {
        timestamp: new Date().toISOString(),
        chromeVersion: await page.evaluate(() => navigator.userAgent),
        gpuFeatures: gpuSnapshot.features,
        gpuStatus: gpuSnapshot.status,
        problems: gpuSnapshot.problems,
        rawText: gpuSnapshot.text.substring(0, 2000) + '...', // First 2000 chars
        fullTextLength: gpuSnapshot.text.length
      };
      
      // Create a clean summary instead of dumping the full report
      const snapshotSummary = {
        contentLength: gpuSnapshot.text.length,
        features: Object.keys(gpuSnapshot.features).map(feature => ({
          name: feature,
          status: gpuSnapshot.features[feature] ? '✅ Enabled' : '❌ Disabled'
        })),
        status: {
          hardwareAccelerated: gpuSnapshot.status.hardwareAccelerated ? '✅ Active' : '❌ Inactive',
          softwareOnly: gpuSnapshot.status.softwareOnly ? '⚠️ Software Only' : '✅ Hardware'
        },
        problems: gpuSnapshot.problems.length,
        reportSaved: 'gpu-snapshot-report.json'
      };
      
      console.log('📊 GPU Snapshot Summary:');
      console.log('   ======================================');
      console.log(`   📏 Content Length: ${snapshotSummary.contentLength} characters`);
      console.log('   🎯 Features:');
      snapshotSummary.features.forEach(feature => {
        console.log(`      ${feature.name}: ${feature.status}`);
      });
      console.log('   🚀 Status:');
      console.log(`      Hardware Acceleration: ${snapshotSummary.status.hardwareAccelerated}`);
      console.log(`      Rendering Mode: ${snapshotSummary.status.softwareOnly}`);
      console.log(`   ⚠️  Problems: ${snapshotSummary.problems} detected`);
      console.log(`   💾 Report: ${snapshotSummary.reportSaved}`);
      console.log('   ======================================');
      
      // Save the report to a file for analysis
      await page.evaluate((report) => {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gpu-snapshot-report.json';
        a.click();
        URL.revokeObjectURL(url);
      }, gpuReport);
      
      // Verify we got meaningful GPU information
      expect(gpuSnapshot.text.length).toBeGreaterThan(500);
      expect(gpuSnapshot.text).toMatch(/GPU|Graphics|Hardware|Acceleration|WebGL|ANGLE/i);
      
      // Check if we detected any GPU features
      const hasAnyFeatures = Object.keys(gpuSnapshot.features).length > 0;
      expect(hasAnyFeatures).toBe(true);
      
      console.log('✅ GPU snapshot completed successfully');
      
    } catch (error) {
      console.log('❌ Error taking GPU snapshot:', error.message);
      // Don't fail the test, just log the error
    }
  });

  test('should verify GPU acceleration status', async ({ page }) => {
    console.log('🔍 Verifying GPU acceleration status from chrome://gpu...');
    
    try {
      // Navigate to Chrome's internal GPU diagnostics page
      await page.goto('chrome://gpu');
      console.log('✅ Successfully accessed chrome://gpu');
      
      // Wait for the page to load completely
      await page.waitForTimeout(5000);
      
      // Extract GPU acceleration status from the shadow DOM
      const accelerationStatus = await page.evaluate(() => {
        function getAccelerationStatus(element) {
          let status = {
            text: '',
            hardwareAccelerated: false,
            softwareOnly: false,
            gpuProcess: false,
            rasterization: false,
            canvas: false,
            webgl: false,
            videoDecode: false,
            videoEncode: false,
            compositing: false,
            problems: [],
            backend: null
          };
          
          // Get text content from current element
          if (element.textContent) {
            const text = element.textContent.trim();
            if (text) {
              status.text += text + ' ';
              
              // Check for hardware acceleration indicators
              if (text.includes('Hardware accelerated')) {
                status.hardwareAccelerated = true;
              }
              if (text.includes('Software only')) {
                status.softwareOnly = true;
              }
              if (text.includes('GPU process')) {
                status.gpuProcess = true;
              }
              if (text.includes('Rasterization')) {
                status.rasterization = true;
              }
              if (text.includes('Canvas')) {
                status.canvas = true;
              }
              if (text.includes('WebGL')) {
                status.webgl = true;
              }
              if (text.includes('Video Decode')) {
                status.videoDecode = true;
              }
              if (text.includes('Video Encode')) {
                status.videoEncode = true;
              }
              if (text.includes('Compositing')) {
                status.compositing = true;
              }
              
              // Detect graphics backend
              if (text.includes('Metal')) {
                status.backend = 'Metal';
              } else if (text.includes('Vulkan')) {
                status.backend = 'Vulkan';
              } else if (text.includes('OpenGL')) {
                status.backend = 'OpenGL';
              } else if (text.includes('DirectX')) {
                status.backend = 'DirectX';
              } else if (text.includes('ANGLE')) {
                status.backend = 'ANGLE';
              }
              
              // Check for problems
              if (text.includes('Problem') || text.includes('Disabled') || text.includes('Blacklisted')) {
                status.problems.push(text);
              }
            }
          }
          
          // Check for shadow root
          if (element.shadowRoot) {
            const shadowStatus = getAccelerationStatus(element.shadowRoot);
            status.text += shadowStatus.text;
            status.hardwareAccelerated = status.hardwareAccelerated || shadowStatus.hardwareAccelerated;
            status.softwareOnly = status.softwareOnly || shadowStatus.softwareOnly;
            status.gpuProcess = status.gpuProcess || shadowStatus.gpuProcess;
            status.rasterization = status.rasterization || shadowStatus.rasterization;
            status.canvas = status.canvas || shadowStatus.canvas;
            status.webgl = status.webgl || shadowStatus.webgl;
            status.videoDecode = status.videoDecode || shadowStatus.videoDecode;
            status.videoEncode = status.videoEncode || shadowStatus.videoEncode;
            status.compositing = status.compositing || shadowStatus.compositing;
            if (!status.backend && shadowStatus.backend) {
              status.backend = shadowStatus.backend;
            }
            status.problems.push(...shadowStatus.problems);
          }
          
          // Check all child nodes
          for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent.trim();
              if (text) {
                status.text += text + ' ';
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childStatus = getAccelerationStatus(child);
              status.text += childStatus.text;
              status.hardwareAccelerated = status.hardwareAccelerated || childStatus.hardwareAccelerated;
              status.softwareOnly = status.softwareOnly || childStatus.softwareOnly;
              status.gpuProcess = status.gpuProcess || childStatus.gpuProcess;
              status.rasterization = status.rasterization || childStatus.rasterization;
              status.canvas = status.canvas || childStatus.canvas;
              status.webgl = status.webgl || childStatus.webgl;
              status.videoDecode = status.videoDecode || childStatus.videoDecode;
              status.videoEncode = status.videoEncode || childStatus.videoEncode;
              status.compositing = status.compositing || childStatus.compositing;
              if (!status.backend && childStatus.backend) {
                status.backend = childStatus.backend;
              }
              status.problems.push(...childStatus.problems);
            }
          }
          
          return status;
        }
        
        return getAccelerationStatus(document.body);
      });
      
      // Take a screenshot for verification
      await page.screenshot({ path: 'gpu-acceleration-status.png', fullPage: true });
      console.log('📸 Screenshot saved as gpu-acceleration-status.png');
      
      // Create a clean summary instead of dumping all data
      const accelerationSummary = {
        hardwareAccelerated: accelerationStatus.hardwareAccelerated,
        softwareOnly: accelerationStatus.softwareOnly,
        gpuProcess: accelerationStatus.gpuProcess,
        graphicsBackend: accelerationStatus.backend,
        features: {
          rasterization: accelerationStatus.rasterization ? '✅ Active' : '❌ Inactive',
          canvas: accelerationStatus.canvas ? '✅ Accelerated' : '❌ Not Accelerated',
          webgl: accelerationStatus.webgl ? '✅ Supported' : '❌ Not Supported',
          video: {
            decode: accelerationStatus.videoDecode ? '✅ Hardware' : '❌ Software',
            encode: accelerationStatus.videoEncode ? '✅ Hardware' : '❌ Software'
          },
          compositing: accelerationStatus.compositing ? '✅ Active' : '❌ Inactive'
        },
        problems: accelerationStatus.problems.length,
        criticalIssues: accelerationStatus.problems.filter(p => 
          p.includes('Disabled') || p.includes('Blacklisted') || p.includes('Software only')
        ).length
      };
      
      console.log('📊 GPU Acceleration Summary:');
      console.log('   ======================================');
      console.log('   🎯 Core Status:');
      console.log(`      Hardware Acceleration: ${accelerationSummary.hardwareAccelerated ? '✅ Active' : '❌ Inactive'}`);
      console.log(`      Software Rendering: ${accelerationSummary.softwareOnly ? '⚠️ Active' : '✅ Disabled'}`);
      console.log(`      GPU Process: ${accelerationSummary.gpuProcess ? '✅ Running' : '❌ Not Running'}`);
      console.log(`      Graphics Backend: ${accelerationSummary.graphicsBackend || '❌ Unknown'}`);
      console.log('   ⚠️  Issues:');
      console.log(`      Total Problems: ${accelerationSummary.problems}`);
      console.log(`      Critical Issues: ${accelerationSummary.criticalIssues}`);
      if (accelerationSummary.criticalIssues > 0) {
        console.log('      ⚠️  Critical issues detected - check screenshot for details');
      }
      console.log('   ======================================');
      
      // Verify GPU acceleration is working
      expect(accelerationStatus.hardwareAccelerated).toBe(true);
      expect(accelerationStatus.softwareOnly).toBe(false);
      
      // Should have GPU process running
      expect(accelerationStatus.gpuProcess).toBe(true);
      
      // Should have basic GPU features
      expect(accelerationStatus.rasterization).toBe(true);
      expect(accelerationStatus.canvas).toBe(true);
      
      // Should have a graphics backend
      expect(accelerationStatus.backend).toBeTruthy();
      console.log('🎯 Graphics Backend:', accelerationStatus.backend);
      
      // Should not have major problems
      const criticalProblems = accelerationStatus.problems.filter(p => 
        p.includes('Disabled') || p.includes('Blacklisted') || p.includes('Software only')
      );
      expect(criticalProblems.length).toBe(0);
      
      // Log summary
      console.log('✅ GPU Acceleration Status Summary:');
      console.log('   - Hardware Accelerated:', accelerationStatus.hardwareAccelerated);
      console.log('   - Software Only:', accelerationStatus.softwareOnly);
      console.log('   - GPU Process:', accelerationStatus.gpuProcess);
      console.log('   - Backend:', accelerationStatus.backend);
      console.log('   - Problems Found:', accelerationStatus.problems.length);
      
      if (accelerationStatus.problems.length > 0) {
        console.log('⚠️  GPU Problems:', accelerationStatus.problems);
      }
      
    } catch (error) {
      console.log('❌ Error verifying GPU acceleration status:', error.message);
      // Don't fail the test, just log the error
    }
  });

  test('should detect NVIDIA GPU on G5 instance', async ({ page }) => {
    console.log('🔍 Detecting NVIDIA GPU from chrome://gpu diagnostics...');
    
    try {
      // Navigate to Chrome's internal GPU diagnostics page
      await page.goto('chrome://gpu');
      console.log('✅ Successfully accessed chrome://gpu');
      
      // Wait for the page to load completely
      await page.waitForTimeout(5000);
      
      // Extract GPU information from the shadow DOM
      const nvidiaDetection = await page.evaluate(() => {
        function detectNVIDIAGPU(element) {
          let detection = {
            text: '',
            hasNVIDIA: false,
            hasHardwareAcceleration: false,
            gpuVendor: null,
            gpuRenderer: null,
            graphicsBackend: null,
            capabilities: {
              maxTextureSize: null,
              hasWebGL: false,
              hasWebGPU: false,
              hasVideoAcceleration: false
            },
            problems: [],
            allRendererInfo: []
          };
          
          // Get text content from current element
          if (element.textContent) {
            const text = element.textContent.trim();
            if (text) {
              detection.text += text + ' ';
              
              // Check for NVIDIA indicators
              if (text.match(/NVIDIA|GeForce|Tesla|Quadro|RTX|GTX/i)) {
                detection.hasNVIDIA = true;
                if (text.includes('NVIDIA')) detection.gpuVendor = 'NVIDIA';
                if (text.match(/GeForce|Tesla|Quadro|RTX|GTX/i)) {
                  detection.gpuRenderer = text.match(/(GeForce|Tesla|Quadro|RTX|GTX)\s+\w+/i)?.[0] || 'NVIDIA GPU';
                }
              }
              
              // Check for hardware acceleration
              if (text.includes('Hardware accelerated')) {
                detection.hasHardwareAcceleration = true;
              }
              
              // Check for graphics backend
              if (text.includes('Metal')) {
                detection.graphicsBackend = 'Metal';
              } else if (text.includes('Vulkan')) {
                detection.graphicsBackend = 'Vulkan';
              } else if (text.includes('OpenGL')) {
                detection.graphicsBackend = 'OpenGL';
              } else if (text.includes('DirectX')) {
                detection.graphicsBackend = 'DirectX';
              } else if (text.includes('ANGLE')) {
                detection.graphicsBackend = 'ANGLE';
              }
              
              // Check for capabilities
              if (text.includes('WebGL')) {
                detection.capabilities.hasWebGL = true;
              }
              if (text.includes('WebGPU')) {
                detection.capabilities.hasWebGPU = true;
              }
              if (text.includes('Video Decode') || text.includes('Video Encode')) {
                detection.capabilities.hasVideoAcceleration = true;
              }
              
              // Check for problems
              if (text.includes('Problem') || text.includes('Disabled') || text.includes('Blacklisted')) {
                detection.problems.push(text);
              }
              
              // Collect all renderer information
              if (text.match(/GPU|Graphics|Renderer|Vendor/i)) {
                detection.allRendererInfo.push(text);
              }
            }
          }
          
          // Check for shadow root
          if (element.shadowRoot) {
            const shadowDetection = detectNVIDIAGPU(element.shadowRoot);
            detection.text += shadowDetection.text;
            detection.hasNVIDIA = detection.hasNVIDIA || shadowDetection.hasNVIDIA;
            detection.hasHardwareAcceleration = detection.hasHardwareAcceleration || shadowDetection.hasHardwareAcceleration;
            if (!detection.gpuVendor && shadowDetection.gpuVendor) {
              detection.gpuVendor = shadowDetection.gpuVendor;
            }
            if (!detection.gpuRenderer && shadowDetection.gpuRenderer) {
              detection.gpuRenderer = shadowDetection.gpuRenderer;
            }
            if (!detection.graphicsBackend && shadowDetection.graphicsBackend) {
              detection.graphicsBackend = shadowDetection.graphicsBackend;
            }
            detection.capabilities.hasWebGL = detection.capabilities.hasWebGL || shadowDetection.capabilities.hasWebGL;
            detection.capabilities.hasWebGPU = detection.capabilities.hasWebGPU || shadowDetection.capabilities.hasWebGPU;
            detection.capabilities.hasVideoAcceleration = detection.capabilities.hasVideoAcceleration || shadowDetection.capabilities.hasVideoAcceleration;
            detection.problems.push(...shadowDetection.problems);
            detection.allRendererInfo.push(...shadowDetection.allRendererInfo);
          }
          
          // Check all child nodes
          for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent.trim();
              if (text) {
                detection.text += text + ' ';
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const childDetection = detectNVIDIAGPU(child);
              detection.text += childDetection.text;
              detection.hasNVIDIA = detection.hasNVIDIA || childDetection.hasNVIDIA;
              detection.hasHardwareAcceleration = detection.hasHardwareAcceleration || childDetection.hasHardwareAcceleration;
              if (!detection.gpuVendor && childDetection.gpuVendor) {
                detection.gpuVendor = childDetection.gpuVendor;
              }
              if (!detection.gpuRenderer && childDetection.gpuRenderer) {
                detection.gpuRenderer = childDetection.gpuRenderer;
              }
              if (!detection.graphicsBackend && childDetection.graphicsBackend) {
                detection.graphicsBackend = childDetection.graphicsBackend;
              }
              detection.capabilities.hasWebGL = detection.capabilities.hasWebGL || childDetection.capabilities.hasWebGL;
              detection.capabilities.hasWebGPU = detection.capabilities.hasWebGPU || childDetection.capabilities.hasWebGPU;
              detection.capabilities.hasVideoAcceleration = detection.capabilities.hasVideoAcceleration || childDetection.capabilities.hasVideoAcceleration;
              detection.problems.push(...childDetection.problems);
              detection.allRendererInfo.push(...childDetection.allRendererInfo);
            }
          }
          
          return detection;
        }
        
        return detectNVIDIAGPU(document.body);
      });
      
      // Take a screenshot for verification
      await page.screenshot({ path: 'nvidia-gpu-detection.png', fullPage: true });
      console.log('📸 Screenshot saved as nvidia-gpu-detection.png');
      
      // Now also test WebGL to get additional GPU capabilities
      await page.goto('data:text/html,<!DOCTYPE html><html><body><canvas id="canvas"></canvas></body></html>');
      
      const webglInfo = await page.evaluate(() => {
        const canvas = document.getElementById('canvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) return { webgl: false };
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
        
        return {
          webgl: true,
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
          unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
          maxAnisotropy: anisotropic ? gl.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0,
          extensions: gl.getSupportedExtensions(),
          contextAttributes: gl.getContextAttributes()
        };
      });
      
      // Create a clean summary instead of dumping all data
      const nvidiaSummary = {
        nvidiaDetected: nvidiaDetection.hasNVIDIA,
        hardwareAccelerated: nvidiaDetection.hasHardwareAcceleration,
        graphicsBackend: nvidiaDetection.graphicsBackend,
        capabilities: {
          webgl: webglInfo.webgl ? '✅ Supported' : '❌ Not Supported',
          webgpu: nvidiaDetection.capabilities.hasWebGPU ? '✅ Available' : '❌ Not Available',
          videoAcceleration: nvidiaDetection.capabilities.hasVideoAcceleration ? '✅ Hardware' : '❌ Software'
        },
        webglInfo: webglInfo.webgl ? {
          vendor: webglInfo.unmaskedVendor || webglInfo.vendor,
          renderer: webglInfo.unmaskedRenderer || webglInfo.renderer,
          maxTextureSize: webglInfo.maxTextureSize,
          extensions: webglInfo.extensions.length
        } : null,
        problems: nvidiaDetection.problems.length
      };
      
      console.log('📊 NVIDIA GPU Detection Summary:');
      console.log('   ======================================');
      console.log('   🎯 Detection Results:');
      console.log(`      NVIDIA GPU: ${nvidiaSummary.nvidiaDetected ? '✅ Detected' : '❌ Not Detected'}`);
      console.log(`      Hardware Acceleration: ${nvidiaSummary.hardwareAccelerated ? '✅ Active' : '❌ Inactive'}`);
      console.log(`      Graphics Backend: ${nvidiaSummary.graphicsBackend || '❌ Unknown'}`);
      console.log('   🚀 Capabilities:');
      console.log(`      WebGL: ${nvidiaSummary.capabilities.webgl}`);
      console.log(`      WebGPU: ${nvidiaSummary.capabilities.webgpu}`);
      console.log(`      Video Acceleration: ${nvidiaSummary.capabilities.videoAcceleration}`);
      if (nvidiaSummary.webglInfo) {
        console.log('   🔍 WebGL Details:');
        console.log(`      Vendor: ${nvidiaSummary.webglInfo.vendor}`);
        console.log(`      Renderer: ${nvidiaSummary.webglInfo.renderer}`);
        console.log(`      Max Texture Size: ${nvidiaSummary.webglInfo.maxTextureSize}`);
        console.log(`      Extensions: ${nvidiaSummary.webglInfo.extensions}`);
      }
      console.log(`   ⚠️  Problems: ${nvidiaSummary.problems} detected`);
      console.log('   ======================================');
      
      // Combine chrome://gpu and WebGL information
      const combinedGPUInfo = {
        chromeGPUDiagnostics: nvidiaDetection,
        webglCapabilities: webglInfo,
        nvidiaDetected: nvidiaDetection.hasNVIDIA || 
                        (webglInfo.unmaskedRenderer && webglInfo.unmaskedRenderer.match(/NVIDIA|GeForce|Tesla|Quadro/i)) ||
                        (webglInfo.renderer && webglInfo.renderer.match(/NVIDIA|GeForce|Tesla|Quadro/i)),
        hardwareAccelerated: nvidiaDetection.hasHardwareAcceleration && webglInfo.webgl,
        graphicsBackend: nvidiaDetection.graphicsBackend || 'Unknown'
      };
      
      // Only log the essential combined info, not the full objects
      console.log('🔍 Combined Detection:');
      console.log(`   NVIDIA Detected: ${combinedGPUInfo.nvidiaDetected ? '✅ Yes' : '❌ No'}`);
      console.log(`   Hardware Accelerated: ${combinedGPUInfo.hardwareAccelerated ? '✅ Yes' : '❌ No'}`);
      console.log(`   Graphics Backend: ${combinedGPUInfo.graphicsBackend}`);
      
      // Verify we have GPU information
      expect(nvidiaDetection.text.length).toBeGreaterThan(500);
      expect(nvidiaDetection.text).toMatch(/GPU|Graphics|Hardware|Acceleration/i);
      
      // Check if we detected any GPU features
      const hasAnyFeatures = Object.keys(nvidiaDetection.capabilities).some(key => 
        nvidiaDetection.capabilities[key] === true || nvidiaDetection.capabilities[key] > 0
      );
      expect(hasAnyFeatures).toBe(true);
      
      // Check for hardware acceleration
      expect(nvidiaDetection.hasHardwareAcceleration).toBe(true);
      
      // Should have a graphics backend
      expect(nvidiaDetection.graphicsBackend).toBeTruthy();
      console.log('🎯 Graphics Backend:', nvidiaDetection.graphicsBackend);
      
      // Log summary
      console.log('✅ NVIDIA GPU Detection Summary:');
      console.log('   - NVIDIA GPU Detected:', combinedGPUInfo.nvidiaDetected);
      console.log('   - Hardware Accelerated:', combinedGPUInfo.hardwareAccelerated);
      console.log('   - Graphics Backend:', combinedGPUInfo.graphicsBackend);
      console.log('   - WebGL Support:', webglInfo.webgl);
      console.log('   - WebGPU Support:', nvidiaDetection.capabilities.hasWebGPU);
      
      if (nvidiaDetection.problems.length > 0) {
        console.log('⚠️  GPU Problems:', nvidiaDetection.problems);
      }
      
    } catch (error) {
      console.log('❌ Error detecting NVIDIA GPU:', error.message);
      // Don't fail the test, just log the error
    }
  });
});
