import {
    Mesh,
    Color,
    // PlaneGeometry,
    ShaderMaterial,
    DoubleSide,
    BufferGeometry
} from 'three';

interface InitWaterOptions {
    uWaresFrequency?: number,
    uScale?: number,
    uNoiseFrequency?: number,
    uNoiseScale?: number,
    uXzScale?: number,
    uLowColor?: number,
    uHighColor?: number,
    uOpacity?: number,
}

class MyWater extends Mesh {
    isWater: boolean;

    constructor(geometry: BufferGeometry, options: InitWaterOptions) {

        super(geometry);

        this.isWater = true;
        const scope = this;

        const params = {
            uWaresFrequency: options.uWaresFrequency || 1.0,
            uScale: options.uScale || 0.1,
            uNoiseFrequency: options.uNoiseFrequency || 2.0,
            uNoiseScale: options.uNoiseScale || 0.45,
            uXzScale: options.uXzScale || 1.0,
            uLowColor: options.uLowColor || 0x708fa4,
            uHighColor: options.uHighColor || 0x95d5ff,
            uOpacity: options.uOpacity || 1.0
        }

        const uniforms = {
            uTime: { value: 0 },
            // uStrength: { value: 1 },
            uWaresFrequency: {
                value: params.uWaresFrequency
            },
            uScale: {
                value: params.uScale
            },
            uNoiseFrequency: {
                value: params.uNoiseFrequency
            },
            uNoiseScale: {
                value: params.uNoiseScale
            },
            uXzScale: {
                value: params.uXzScale
            },
            uLowColor: {
                value: new Color(params.uLowColor)
            },
            uHighColor: {
                value: new Color(params.uHighColor)
            },
            uOpacity: {
                value: params.uOpacity
            }
        };

        const vertexShader = /* GLSL */ `
        uniform float uTime;
        uniform float uWaresFrequency;
        uniform float uScale;
        uniform float uNoiseFrequency;
        uniform float uNoiseScale;
        uniform float uXzScale;
        varying float vElevation;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        
        float random (vec2 st) {
            return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);
        }
        // 旋转函数
        vec2 rotate(vec2 uv, float rotation, vec2 mid)
        {
            return vec2(
            cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
            cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
            );
        }
        
        // 2d噪声函数
        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f*f*(3.0-2.0*f);
            return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
        }
        // 随机函数
        vec4 permute(vec4 x)
        {
            return mod(((x*34.0)+1.0)*x, 289.0);
        }
        vec2 fade(vec2 t)
        {
            return t*t*t*(t*(t*6.0-15.0)+10.0);
        }
        float cnoise(vec2 P)
        {
            vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
            vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
            Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
            vec4 ix = Pi.xzxz;
            vec4 iy = Pi.yyww;
            vec4 fx = Pf.xzxz;
            vec4 fy = Pf.yyww;
            vec4 i = permute(permute(ix) + iy);
            vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
            vec4 gy = abs(gx) - 0.5;
            vec4 tx = floor(gx + 0.5);
            gx = gx - tx;
            vec2 g00 = vec2(gx.x,gy.x);
            vec2 g10 = vec2(gx.y,gy.y);
            vec2 g01 = vec2(gx.z,gy.z);
            vec2 g11 = vec2(gx.w,gy.w);
            vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
            g00 *= norm.x;
            g01 *= norm.y;
            g10 *= norm.z;
            g11 *= norm.w;
            float n00 = dot(g00, vec2(fx.x, fy.x));
            float n10 = dot(g10, vec2(fx.y, fy.y));
            float n01 = dot(g01, vec2(fx.z, fy.z));
            float n11 = dot(g11, vec2(fx.w, fy.w));
            vec2 fade_xy = fade(Pf.xy);
            vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
            float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
            return 2.3 * n_xy;
        }
        
        void main() {
            vec4 modelPosition = modelMatrix * vec4(position,1.0);
            // 波浪高度
            float elevation = sin(modelPosition.x * uWaresFrequency) * sin(modelPosition.z * uWaresFrequency * uXzScale);
            elevation += cnoise(vec2(modelPosition.xz*uNoiseFrequency+uTime))
            *uNoiseScale;
            elevation *= uScale;
            // 传到片元着色器
            vElevation = elevation;
            modelPosition.y += elevation;
            gl_Position = projectionMatrix * viewMatrix * modelPosition;
            #include <logdepthbuf_vertex>
        }
        `;


        const fragmentShader = /* GLSL */ `
            #include <common>
            #include <logdepthbuf_pars_fragment>
            varying float vElevation;
            uniform vec3 uLowColor;
            uniform vec3 uHighColor;
            uniform float uOpacity;
            void main(){
                #include <logdepthbuf_fragment>
                float a = (vElevation + 1.0) / 2.0;
                // 混合颜色
                vec3 color = mix(uLowColor,uHighColor,a);
                gl_FragColor = vec4(color,uOpacity);
            }
        `;

        const material = new ShaderMaterial({
            // extensions: {
            //     derivatives: "#extension GL_OES_standard_derivatives : enable",
            // },
            uniforms,
            vertexShader,
            fragmentShader,
            side: DoubleSide,
            transparent: true
            // wireframe: true,
        });

        scope.material = material
    }

}

export { MyWater };
