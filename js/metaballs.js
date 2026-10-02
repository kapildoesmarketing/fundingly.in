/* ==========================================================================
   Fundingly.in — 3D WebGL Raymarched Metaballs Canvas Engine
   Designed by Kapil Pidhwani
   Tailored Action Blue Color Palette (#0066cc / #0a84ff)
   ========================================================================== */

(function () {
  'use strict';

  let scene, camera, renderer, material, mesh, clock;
  let targetMousePosition, mousePosition, cursorSphere3D;
  let THEME_PRESETS = {};

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isLowPowerDevice = (typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 4);
  const pixelRatio = isMobile ? 1.0 : Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 1.5);

  const currentSettings = {
    sphereCount: isMobile ? 4 : 6,
    ambientIntensity: 0.70,
    diffuseIntensity: 0.35,
    specularIntensity: 0.18,
    specularPower: 48.0,
    fresnelPower: 3.0,
    backgroundColor: null,
    sphereColor: null,
    shadowColor: null,
    lightColor: null,
    lightPosition: null,
    smoothness: 0.65,
    contrast: 1.0,
    fogDensity: 0.0,
    cursorGlowIntensity: 0.08,
    cursorGlowRadius: 1.8,
    cursorGlowColor: null,
    animationSpeed: 0.75,
    movementScale: 1.15,
    mergeDistance: 1.35,
    cursorRadiusMin: 0.06,
    cursorRadiusMax: 0.32
  };

  function initMetaballs() {
    const container = document.getElementById("hero-metaballs");
    if (!container) return;

    if (!window.THREE) {
      let attempts = 0;
      const retryTimer = setInterval(() => {
        attempts++;
        if (window.THREE) {
          clearInterval(retryTimer);
          initMetaballs();
        } else if (attempts > 40) {
          clearInterval(retryTimer);
          console.warn("[FundinglyMetaballs] Three.js library loading timeout.");
        }
      }, 75);
      return;
    }

    const THREE = window.THREE;
    targetMousePosition = new THREE.Vector2(-999.0, -999.0);
    mousePosition = new THREE.Vector2(-999.0, -999.0);
    cursorSphere3D = new THREE.Vector3(-9999.0, -9999.0, 0);

    // Option 1: Frosted Liquid Glass (Light Mode) & Smoked Obsidian Crystal (Dark Mode)
    THEME_PRESETS = {
      dark: {
        sphereCount: isMobile ? 4 : 6,
        ambientIntensity: 0.70,
        diffuseIntensity: 0.38,
        specularIntensity: 0.32,
        specularPower: 64.0,
        fresnelPower: 2.2,
        backgroundColor: new THREE.Color(0x090a0c),
        sphereColor: new THREE.Color(0x191d26), // Smoked Obsidian Crystal
        shadowColor: new THREE.Color(0x090b0f), // Deep ambient shadow
        lightColor: new THREE.Color(0xffffff),
        lightPosition: new THREE.Vector3(0.85, 1.2, 1.0),
        smoothness: 0.65,
        contrast: 1.0,
        fogDensity: 0.0,
        cursorGlowIntensity: 0.10,
        cursorGlowRadius: 1.8,
        cursorGlowColor: new THREE.Color(0x222a38)
      },
      light: {
        sphereCount: isMobile ? 4 : 6,
        ambientIntensity: 0.75,
        diffuseIntensity: 0.42,
        specularIntensity: 0.35,
        specularPower: 64.0,
        fresnelPower: 2.2,
        backgroundColor: new THREE.Color(0xffffff),
        sphereColor: new THREE.Color(0xf0f3f8), // Frosted Pearl Glass (clean visible 3D body on white canvas)
        shadowColor: new THREE.Color(0xd0d9e6), // Crisp soft slate refractive shadow
        lightColor: new THREE.Color(0xffffff),
        lightPosition: new THREE.Vector3(0.85, 1.2, 1.0),
        smoothness: 0.65,
        contrast: 1.0,
        fogDensity: 0.0,
        cursorGlowIntensity: 0.08,
        cursorGlowRadius: 1.8,
        cursorGlowColor: new THREE.Color(0xdce5f2)
      }
    };

    const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
    const initialPreset = THEME_PRESETS[activeTheme] || THEME_PRESETS.light;
    Object.assign(currentSettings, initialPreset);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    clock = new THREE.Clock();

    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile && !isLowPowerDevice,
      alpha: true,
      powerPreference: isMobile ? "default" : "high-performance",
      preserveDrawingBuffer: false,
      premultipliedAlpha: false
    });

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    if (THREE.LinearSRGBColorSpace) {
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    } else if (THREE.LinearEncoding) {
      renderer.outputEncoding = THREE.LinearEncoding;
    }

    container.innerHTML = "";
    const canvas = renderer.domElement;
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 0;
      pointer-events: none;
    `;
    container.appendChild(canvas);

    material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uActualResolution: { value: new THREE.Vector2(width * pixelRatio, height * pixelRatio) },
        uPixelRatio: { value: pixelRatio },
        uMousePosition: { value: new THREE.Vector2(-999.0, -999.0) },
        uCursorSphere: { value: new THREE.Vector3(-9999.0, -9999.0, 0) },
        uCursorRadius: { value: currentSettings.cursorRadiusMin },
        uSphereCount: { value: currentSettings.sphereCount },
        uMergeDistance: { value: currentSettings.mergeDistance },
        uSmoothness: { value: currentSettings.smoothness },
        uAmbientIntensity: { value: currentSettings.ambientIntensity },
        uDiffuseIntensity: { value: currentSettings.diffuseIntensity },
        uSpecularIntensity: { value: currentSettings.specularIntensity },
        uSpecularPower: { value: currentSettings.specularPower },
        uFresnelPower: { value: currentSettings.fresnelPower },
        uBackgroundColor: { value: new THREE.Color().copy(currentSettings.backgroundColor) },
        uSphereColor: { value: new THREE.Color().copy(currentSettings.sphereColor) },
        uShadowColor: { value: new THREE.Color().copy(currentSettings.shadowColor) },
        uLightColor: { value: new THREE.Color().copy(currentSettings.lightColor) },
        uLightPosition: { value: new THREE.Vector3().copy(currentSettings.lightPosition) },
        uContrast: { value: currentSettings.contrast },
        uFogDensity: { value: currentSettings.fogDensity },
        uCursorGlowIntensity: { value: currentSettings.cursorGlowIntensity },
        uCursorGlowRadius: { value: currentSettings.cursorGlowRadius },
        uCursorGlowColor: { value: new THREE.Color().copy(currentSettings.cursorGlowColor) },
        uAnimationSpeed: { value: currentSettings.animationSpeed },
        uMovementScale: { value: currentSettings.movementScale },
        uIsMobile: { value: isMobile ? 1.0 : 0.0 },
        uIsLowPower: { value: isLowPowerDevice ? 1.0 : 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uActualResolution;
        uniform float uPixelRatio;
        uniform vec2 uMousePosition;
        uniform vec3 uCursorSphere;
        uniform float uCursorRadius;
        uniform int uSphereCount;
        uniform float uMergeDistance;
        uniform float uSmoothness;
        uniform float uAmbientIntensity;
        uniform float uDiffuseIntensity;
        uniform float uSpecularIntensity;
        uniform float uSpecularPower;
        uniform float uFresnelPower;
        uniform vec3 uBackgroundColor;
        uniform vec3 uSphereColor;
        uniform vec3 uShadowColor;
        uniform vec3 uLightColor;
        uniform vec3 uLightPosition;
        uniform float uContrast;
        uniform float uFogDensity;
        uniform float uCursorGlowIntensity;
        uniform float uCursorGlowRadius;
        uniform vec3 uCursorGlowColor;
        uniform float uAnimationSpeed;
        uniform float uMovementScale;
        uniform float uIsMobile;
        uniform float uIsLowPower;

        varying vec2 vUv;

        const float PI = 3.14159265359;
        const float EPSILON = 0.001;
        const float MAX_DIST = 100.0;

        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * k * 0.25;
        }

        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        vec3 screenToWorld(vec2 normalizedPos) {
          vec2 uv = normalizedPos * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;
          return vec3(uv * 2.0, 0.0);
        }

        float sceneSDF(vec3 pos) {
          float result = MAX_DIST;

          // Hero metaballs live along the outer perimeter framing
          vec3 topLeftPos = screenToWorld(vec2(0.06, 0.82));
          float topLeft = sdSphere(pos - topLeftPos, 0.36);

          vec3 smallTopLeftPos = screenToWorld(vec2(0.03, 0.65));
          float smallTopLeft = sdSphere(pos - smallTopLeftPos, 0.22);

          vec3 bottomLeftPos = screenToWorld(vec2(0.03, 0.12));
          float bottomLeft = sdSphere(pos - bottomLeftPos, 0.42);

          vec3 smallBottomLeftPos = screenToWorld(vec2(0.06, 0.24));
          float smallBottomLeft = sdSphere(pos - smallBottomLeftPos, 0.24);

          vec3 topRightPos = screenToWorld(vec2(0.94, 0.82));
          float topRight = sdSphere(pos - topRightPos, 0.36);

          vec3 smallTopRightPos = screenToWorld(vec2(0.97, 0.65));
          float smallTopRight = sdSphere(pos - smallTopRightPos, 0.22);

          vec3 bottomRightPos = screenToWorld(vec2(0.97, 0.12));
          float bottomRight = sdSphere(pos - bottomRightPos, 0.42);

          vec3 smallBottomRightPos = screenToWorld(vec2(0.94, 0.24));
          float smallBottomRight = sdSphere(pos - smallBottomRightPos, 0.24);

          float t = uTime * uAnimationSpeed;

          vec3 leftClusterCenter = screenToWorld(vec2(0.05, 0.48));
          vec3 rightClusterCenter = screenToWorld(vec2(0.95, 0.48));

          int maxIter = uIsMobile > 0.5 ? 4 : (uIsLowPower > 0.5 ? 4 : min(uSphereCount, 6));
          for (int i = 0; i < 6; i++) {
            if (i >= uSphereCount || i >= maxIter) break;

            float fi = float(i);
            float speed = 0.42 + fi * 0.12;
            float radius = 0.14 + mod(fi, 3.0) * 0.05;

            bool isLeft = mod(fi, 2.0) < 1.0;
            vec3 clusterCenter = isLeft ? leftClusterCenter : rightClusterCenter;

            vec3 offset = clusterCenter + vec3(
              sin(t * speed + fi * 1.5) * (0.16 + mod(fi, 2.0) * 0.08),
              cos(t * (speed * 0.88) + fi * 1.8) * (0.22 + mod(fi, 2.0) * 0.10),
              sin(t * 0.4 + fi * 2.0) * 0.2
            );

            vec3 toCursor = uCursorSphere - offset;
            float cursorDist = length(toCursor);
            if (cursorDist < uMergeDistance && cursorDist > 0.0) {
              float attraction = (1.0 - cursorDist / uMergeDistance) * 0.35;
              offset += normalize(toCursor) * attraction;
            }

            float movingSphere = sdSphere(pos - offset, radius);

            float blend = 0.06;
            if (cursorDist < uMergeDistance) {
              float influence = 1.0 - (cursorDist / uMergeDistance);
              blend = mix(0.06, uSmoothness, influence * influence);
            }

            result = smin(result, movingSphere, blend);
          }

          // Merge perimeter corner spheres
          float topLeftGroup = smin(topLeft, smallTopLeft, 0.45);
          float bottomLeftGroup = smin(bottomLeft, smallBottomLeft, 0.45);
          float leftSide = smin(topLeftGroup, bottomLeftGroup, 0.35);

          float topRightGroup = smin(topRight, smallTopRight, 0.45);
          float bottomRightGroup = smin(bottomRight, smallBottomRight, 0.45);
          float rightSide = smin(topRightGroup, bottomRightGroup, 0.35);

          float frameGroup = smin(leftSide, rightSide, 0.30);
          result = smin(result, frameGroup, 0.40);

          // Cursor sphere interaction
          if (uCursorSphere.x > -100.0) {
            float cursorBall = sdSphere(pos - uCursorSphere, uCursorRadius);
            result = smin(result, cursorBall, uSmoothness);
          }

          return result;
        }

        vec3 calcNormal(vec3 p) {
          float eps = uIsLowPower > 0.5 ? 0.003 : 0.001;
          vec2 h = vec2(eps, 0.0);
          return normalize(vec3(
            sceneSDF(p + h.xyy) - sceneSDF(p - h.xyy),
            sceneSDF(p + h.yxy) - sceneSDF(p - h.yxy),
            sceneSDF(p + h.yyx) - sceneSDF(p - h.yyx)
          ));
        }

        float ambientOcclusion(vec3 p, vec3 n) {
          float step = 0.06;
          float ao = 0.0;
          float dist;
          for (int i = 1; i <= 3; i++) {
            dist = step * float(i);
            ao += max(0.0, (dist - sceneSDF(p + n * dist)) / dist);
          }
          return clamp(1.0 - ao * 0.4, 0.0, 1.0);
        }

        float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
          float res = 1.0;
          float t = mint;
          for (int i = 0; i < 12; i++) {
            if (t >= maxt) break;
            float h = sceneSDF(ro + rd * t);
            if (h < 0.001) return 0.0;
            res = min(res, k * h / t);
            t += clamp(h, 0.02, 0.15);
          }
          return clamp(res, 0.0, 1.0);
        }

        float rayMarch(vec3 ro, vec3 rd) {
          float t = 0.0;
          int maxSteps = uIsMobile > 0.5 ? 28 : (uIsLowPower > 0.5 ? 32 : 48);
          float maxDist = 20.0;

          for (int i = 0; i < 48; i++) {
            if (i >= maxSteps) break;
            vec3 p = ro + rd * t;
            float d = sceneSDF(p);
            if (d < EPSILON) return t;
            if (t > maxDist) break;
            t += d * 0.85;
          }
          return -1.0;
        }

        vec3 lighting(vec3 p, vec3 rd, float t) {
          if (t < 0.0) return vec3(0.0);

          vec3 normal = calcNormal(p);
          vec3 viewDir = -rd;
          vec3 mascotColor = uSphereColor;

          // Subtle ambient shadow tone (adaptive white in light mode, obsidian in dark mode)
          vec3 shadowColor = uShadowColor;
          vec3 lightDir = normalize(uLightPosition);
          
          // Soft wrap lighting (keeps color pure and non-blown)
          float wrapLight = clamp(dot(normal, lightDir) * 0.4 + 0.6, 0.0, 1.0);
          vec3 shadedColor = mix(shadowColor, mascotColor, wrapLight);

          // Subtle facing illumination towards camera
          float NdotV = max(dot(normal, viewDir), 0.0);
          shadedColor = mix(shadedColor, mascotColor, pow(NdotV, 1.2) * 0.4);

          // Pinpoint crisp specular gloss (not blinding white wash)
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), uSpecularPower) * uSpecularIntensity;
          vec3 specular = vec3(1.0) * spec;

          // Refractive liquid glass edge rim
          float fresnel = pow(1.0 - NdotV, uFresnelPower);
          vec3 fresnelRim = mix(mascotColor, vec3(1.0), 0.70) * fresnel * 0.28;

          // Cursor proximity subtle highlight
          float distToCursor = length(p - uCursorSphere);
          if (distToCursor < uCursorRadius + 0.4) {
            float highlight = 1.0 - smoothstep(0.0, uCursorRadius + 0.4, distToCursor);
            specular += vec3(1.0) * highlight * 0.12;
          }

          vec3 finalColor = shadedColor + specular + fresnelRim;
          return clamp(finalColor, 0.0, 1.0);
        }

        float calculateCursorGlow(vec3 worldPos) {
          float dist = length(worldPos.xy - uCursorSphere.xy);
          float glow = 1.0 - smoothstep(0.0, uCursorGlowRadius, dist);
          glow = pow(glow, 2.0);
          return glow * uCursorGlowIntensity;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - uActualResolution.xy) / uActualResolution.xy;
          uv.x *= uResolution.x / uResolution.y;

          vec3 ro = vec3(uv.x * 2.0, uv.y * 2.0, -1.0);
          vec3 rd = vec3(0.0, 0.0, 1.0);

          float t = rayMarch(ro, rd);
          vec3 p = ro + rd * t;
          vec3 color = lighting(p, rd, t);

          float cursorGlow = calculateCursorGlow(ro);
          vec3 glowContribution = uCursorGlowColor * cursorGlow;

          if (t > 0.0) {
            gl_FragColor = vec4(color, 1.0);
          } else {
            if (cursorGlow > 0.01) {
              gl_FragColor = vec4(glowContribution, cursorGlow * 0.5);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            }
          }
        }
      `,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    setTheme(activeTheme);
    setupEventListeners();
    animate();
  }

  function onPointerMove(clientX, clientY) {
    if (!currentSettings) return;
    const nx = Math.max(0, Math.min(1, clientX / window.innerWidth));
    const ny = Math.max(0, Math.min(1, 1.0 - clientY / window.innerHeight));
    if (mousePosition.x < -100) {
      mousePosition.set(nx, ny);
    }
    targetMousePosition.set(nx, ny);

    const aspect = window.innerWidth / (window.innerHeight || 1);
    const worldX = (nx * 2.0 - 1.0) * aspect * 2.0;
    const worldY = (ny * 2.0 - 1.0) * 2.0;

    const fixedPositions = [
      new THREE.Vector3((0.06 * 2.0 - 1.0) * aspect * 2.0, (0.82 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.03 * 2.0 - 1.0) * aspect * 2.0, (0.65 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.03 * 2.0 - 1.0) * aspect * 2.0, (0.12 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.06 * 2.0 - 1.0) * aspect * 2.0, (0.24 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.94 * 2.0 - 1.0) * aspect * 2.0, (0.82 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.97 * 2.0 - 1.0) * aspect * 2.0, (0.65 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.97 * 2.0 - 1.0) * aspect * 2.0, (0.12 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.94 * 2.0 - 1.0) * aspect * 2.0, (0.24 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.05 * 2.0 - 1.0) * aspect * 2.0, (0.48 * 2.0 - 1.0) * 2.0, 0),
      new THREE.Vector3((0.95 * 2.0 - 1.0) * aspect * 2.0, (0.48 * 2.0 - 1.0) * 2.0, 0)
    ];

    let minDist = 999.0;
    for (let i = 0; i < fixedPositions.length; i++) {
      const d = Math.hypot(worldX - fixedPositions[i].x, worldY - fixedPositions[i].y);
      if (d < minDist) minDist = d;
    }

    const proximityFactor = Math.max(0, 1.0 - minDist / 1.6);
    const dynamicRadius = currentSettings.cursorRadiusMin + proximityFactor * (currentSettings.cursorRadiusMax - currentSettings.cursorRadiusMin);

    cursorSphere3D.set(worldX, worldY, 0);
    if (material && material.uniforms) {
      material.uniforms.uCursorSphere.value.copy(cursorSphere3D);
      material.uniforms.uCursorRadius.value = dynamicRadius;
    }
  }

  function setupEventListeners() {
    window.addEventListener("mousemove", (e) => {
      onPointerMove(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (!renderer || !material) return;
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.left = -1;
      camera.right = 1;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
      material.uniforms.uActualResolution.value.set(width * pixelRatio, height * pixelRatio);
    });
  }

  let isAnimationRunning = false;
  let isContainerVisible = true;

  function animate() {
    if (document.hidden || !isContainerVisible) {
      isAnimationRunning = false;
      return;
    }
    isAnimationRunning = true;
    requestAnimationFrame(animate);

    if (!material || !renderer || !scene || !camera) return;

    const elapsedTime = clock.getElapsedTime();
    material.uniforms.uTime.value = elapsedTime;

    if (targetMousePosition && targetMousePosition.x > -10.0) {
      mousePosition.lerp(targetMousePosition, 0.08);
      material.uniforms.uMousePosition.value.copy(mousePosition);
    }

    renderer.render(scene, camera);
  }

  // Deisgned by Kapil Pidhwani: Background tab sleep & scroll throttling to preserve mobile battery & GPU thermals
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && isContainerVisible && !isAnimationRunning) {
        animate();
      }
    });

    if (typeof IntersectionObserver !== 'undefined') {
      const container = document.getElementById("hero-metaballs");
      if (container) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            isContainerVisible = entry.isIntersecting;
            if (isContainerVisible && !document.hidden && !isAnimationRunning) {
              animate();
            }
          });
        }, { threshold: 0.05 });
        observer.observe(container);
      }
    }
  }

  function setTheme(themeName) {
    if (!THEME_PRESETS || !THEME_PRESETS[themeName]) return;
    const preset = THEME_PRESETS[themeName];
    Object.assign(currentSettings, preset);

    if (material && material.uniforms) {
      material.uniforms.uAmbientIntensity.value = preset.ambientIntensity;
      material.uniforms.uDiffuseIntensity.value = preset.diffuseIntensity;
      material.uniforms.uSpecularIntensity.value = preset.specularIntensity;
      material.uniforms.uSpecularPower.value = preset.specularPower;
      material.uniforms.uFresnelPower.value = preset.fresnelPower;
      material.uniforms.uContrast.value = preset.contrast;
      material.uniforms.uFogDensity.value = preset.fogDensity;
      material.uniforms.uCursorGlowIntensity.value = preset.cursorGlowIntensity;
      material.uniforms.uCursorGlowRadius.value = preset.cursorGlowRadius;

      material.uniforms.uBackgroundColor.value.copy(preset.backgroundColor);
      material.uniforms.uSphereColor.value.copy(preset.sphereColor);
      if (preset.shadowColor && material.uniforms.uShadowColor) {
        material.uniforms.uShadowColor.value.copy(preset.shadowColor);
      }
      material.uniforms.uLightColor.value.copy(preset.lightColor);
      material.uniforms.uLightPosition.value.copy(preset.lightPosition);
      material.uniforms.uCursorGlowColor.value.copy(preset.cursorGlowColor);
    }
  }

  // Auto-listen to data-theme attribute mutations on <html>
  if (typeof MutationObserver !== 'undefined') {
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
          setTheme(newTheme);
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  window.FundinglyMetaballs = {
    setTheme: setTheme,
    initMetaballs: initMetaballs
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMetaballs);
  } else {
    initMetaballs();
  }
})();
