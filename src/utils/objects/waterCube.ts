import {
    Mesh,
    Color,
    BoxGeometry,
    ShaderMaterial,
    Renderer,
    Scene,
    Camera,
    DoubleSide
} from 'three';
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { Refractor } from 'three/examples/jsm/objects/Refractor.js';
// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'

interface MyReflector extends Reflector {
    //原生的.d.ts中没有这个函数的声明，故此补充
    onBeforeRender: (renderer: Renderer, scene: Scene, camera: Camera) => void;
}
interface MyRefractor extends Refractor {
    //原生的.d.ts中没有这个函数的声明，故此补充
    onBeforeRender: (renderer: Renderer, scene: Scene, camera: Camera) => void;
}

const textureMatrix = new THREE.Matrix4();
const textureWidth = 512;
const textureHeight = 512;
const clipBias = 0.01;

interface InitWaterOptions {
    uLowColor?: number,
    uHighColor?: number,
    uOpacity?: number,
    uRealLevel: number,
    uNeedLevel: number,
    reflectivity?: number    //反射系数
    noiseRatio?:number,
    uOffset?:number
}

class MyWaterCube extends Mesh {
    isWater: boolean;

    constructor(geometry: BoxGeometry, options: InitWaterOptions) {

        super(geometry);

        this.isWater = true;
        const scope = this;

        const reflector = new Reflector(geometry, {
            textureWidth: textureWidth,
            textureHeight: textureHeight,
            clipBias: clipBias
        });

        const refractor = new Refractor(geometry, {
            textureWidth: textureWidth,
            textureHeight: textureHeight,
            clipBias: clipBias
        });

        reflector.matrixAutoUpdate = false;
        refractor.matrixAutoUpdate = false;

        const params = {
            uLowColor: options.uLowColor || 0x708fa4,
            uHighColor: options.uHighColor || 0x95d5ff,
            uOpacity: options.uOpacity ?? 1.0,
            uRealLevel: options.uRealLevel,
            uNeedLevel: options.uNeedLevel,
            reflectivity: options.reflectivity ?? 0.02,
            noiseRatio: options.noiseRatio ?? 0.666025403784438,
            uOffset: options.uOffset ?? 0.02,
        }
        console.log('uRealLevel', params.uRealLevel);
        console.log('uNeedLevel', params.uNeedLevel);

        const uniforms = {
            iTime: { value: 0 },
            uLowColor: {
                value: new Color(params.uLowColor)
            },
            uHighColor: {
                value: new Color(params.uHighColor)
            },
            uOpacity: {
                value: params.uOpacity
            },
            uRealLevel: {
                value: params.uRealLevel
            },
            uNeedLevel: {
                value: params.uNeedLevel
            },
            //shadertoy
            iResolution: {
                type: 'v2',
                value: new THREE.Vector3()
            },
            //reflector
            tReflectionMap: {
                type: 't',
                value: reflector.getRenderTarget().texture
            },
            tRefractionMap: {
                type: 't',
                value: refractor.getRenderTarget().texture
            },
            reflectivity: {
                type: 'f',
                value: params.reflectivity
            },
            noiseRatio: {
                type: 'f',
                value: params.noiseRatio
            },
            uOffset: {
                type: 'f',
                value: params.uOffset
            },
            textureMatrix: {
                type: 'm4',
                value: textureMatrix
            },
        };

        const vertexShader = /* GLSL */ `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uRealLevel;
        uniform float uNeedLevel;

        varying vec3 vToEye;
        uniform mat4 textureMatrix;
        varying vec4 vCoord;
        #include <common>
        #include <logdepthbuf_pars_vertex>

        void main() {
            vUv = uv;
            //reflector
            vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
            vToEye = cameraPosition - worldPosition.xyz;
            vCoord = textureMatrix * vec4( position, 1.0 );

            vPosition = position;
            float realLvel = uRealLevel / 2.;
            // float move = step(realLvel - .001, position.z) * (uRealLevel - uNeedLevel);
            float move = step(.001, position.z) * (uRealLevel - uNeedLevel);

            vec4 modelPosition = modelMatrix * vec4(position.x, position.y, position.z - move, 1.0);
            gl_Position = projectionMatrix * viewMatrix * modelPosition;

            #include <logdepthbuf_vertex>
        }
        `;

        const fragmentShader = /* GLSL */ `
            #include <common>
            #include <logdepthbuf_pars_fragment>
            uniform vec3 uLowColor;
            uniform vec3 uHighColor;
            uniform float uOpacity;
            uniform float iTime;
            uniform vec3 iResolution;
            varying vec3 vPosition;
            varying vec2 vUv;
            uniform sampler2D tReflectionMap;
            uniform sampler2D tRefractionMap;

            // -------------------shadertoy-----------------------
            vec4 permute2(vec4 t) {
                return t * (t * 34.0 + 133.0);
            }

            // Gradient set is a normalized expanded rhombic dodecahedron
            vec3 grad(float hash) {

                // Random vertex of a cube, +/- 1 each
                vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;

                // Random edge of the three edges connected to that vertex
                // Also a cuboctahedral vertex
                // And corresponds to the face of its dual, the rhombic dodecahedron
                vec3 cuboct = cube;
                cuboct[int(hash / 16.0)] = 0.0;

                // In a funky way, pick one of the four points on the rhombic face
                float type = mod(floor(hash / 8.0), 2.0);
                vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));

                // Expand it so that the new edges are the same length
                // as the existing ones
                vec3 grad = cuboct * 1.22474487139 + rhomb;

                // To make all gradients the same length, we only need to shorten the
                // second type of vector. We also put in the whole noise scale constant.
                // The compiler should reduce it into the existing floats. I think.
                grad *= (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;

                return grad;
            }

            // BCC lattice split up into 2 cube lattices
            vec4 os2NoiseWithDerivativesPart(vec3 X) {
                vec3 b = floor(X);
                vec4 i4 = vec4(X - b, 2.5);

                // Pick between each pair of oppposite corners in the cube.
                vec3 v1 = b + floor(dot(i4, vec4(.25)));
                vec3 v2 = b + vec3(1, 0, 0) + vec3(-1, 1, 1) * floor(dot(i4, vec4(-.25, .25, .25, .35)));
                vec3 v3 = b + vec3(0, 1, 0) + vec3(1, -1, 1) * floor(dot(i4, vec4(.25, -.25, .25, .35)));
                vec3 v4 = b + vec3(0, 0, 1) + vec3(1, 1, -1) * floor(dot(i4, vec4(.25, .25, -.25, .35)));

                // Gradient hashes for the four vertices in this half-lattice.
                vec4 hashes = permute2(mod(vec4(v1.x, v2.x, v3.x, v4.x), 289.0));
                hashes = permute2(mod(hashes + vec4(v1.y, v2.y, v3.y, v4.y), 289.0));
                hashes = mod(permute2(mod(hashes + vec4(v1.z, v2.z, v3.z, v4.z), 289.0)), 48.0);

                // Gradient extrapolations & kernel function
                vec3 d1 = X - v1;
                vec3 d2 = X - v2;
                vec3 d3 = X - v3;
                vec3 d4 = X - v4;
                vec4 a = max(0.75 - vec4(dot(d1, d1), dot(d2, d2), dot(d3, d3), dot(d4, d4)), 0.0);
                vec4 aa = a * a;
                vec4 aaaa = aa * aa;
                vec3 g1 = grad(hashes.x);
                vec3 g2 = grad(hashes.y);
                vec3 g3 = grad(hashes.z);
                vec3 g4 = grad(hashes.w);
                vec4 extrapolations = vec4(dot(d1, g1), dot(d2, g2), dot(d3, g3), dot(d4, g4));

                // Derivatives of the noise
                vec3 derivative = -8.0 * mat4x3(d1, d2, d3, d4) * (aa * a * extrapolations) + mat4x3(g1, g2, g3, g4) * aaaa;

                // Return it all as a vec4
                return vec4(derivative, dot(aaaa, extrapolations));
            }

            // Gives X and Y a triangular alignment, and lets Z move up the main diagonal.
            // Might be good for terrain, or a time varying X/Y plane. Z repeats.
            vec4 os2NoiseWithDerivatives_ImproveXY(vec3 X) {

                // Not a skew transform.
                mat3 orthonormalMap = mat3(0.788675134594813, -0.211324865405187, -0.577350269189626, -0.211324865405187, 0.788675134594813, -0.577350269189626, 0.577350269189626, 0.577350269189626, 0.577350269189626);

                X = orthonormalMap * X;
                vec4 result = os2NoiseWithDerivativesPart(X) + os2NoiseWithDerivativesPart(X + 144.5);

                return vec4(result.xyz * orthonormalMap, result.w);
            }

            // #define PI 3.14
            #define E 2.71828
            uniform float noiseRatio;         //波纹变化频率
            uniform float uOffset;         //扭曲程度
            uniform float uRealLevel;

            uniform float reflectivity;
            varying vec3 vToEye;
            varying vec4 vCoord;
            #define downToLevel -0.5

            void main() {
                #include <logdepthbuf_fragment>
                float realLvel = uRealLevel / 2.;
                float highOpacity = step(-(realLvel - 0.001), -vPosition.z);   //高于highLevel的返回0，其余返回1
                //================================ shadertoy start(类似游泳池水面) ====================================
                vec2 fragCoord = vec2(vUv.x * iResolution.x, vUv.y * iResolution.y);

                // Normalized pixel coordinates (from 0 to 1 on largest axis)
                vec2 uv = fragCoord / max(iResolution.x, iResolution.y) * 8.0;

                // Initial input point
                vec3 X = vec3(uv, mod(iTime, 578.0) * noiseRatio);

                // Evaluate noise once
                vec4 noiseResult = os2NoiseWithDerivatives_ImproveXY(X);

                // Evaluate noise again with the derivative warping the domain
                // Might be able to approximate this by fitting to a curve instead
                noiseResult = os2NoiseWithDerivatives_ImproveXY(X - noiseResult.xyz / 16.0);
                float value = noiseResult.w;

                // Time varying pixel color
                float lightRatio = .8;
                vec3 mixColor = mix(uHighColor, uLowColor, .5);
                // vec3 col = mixColor * (lightRatio + .5 * value);
                vec3 col = uLowColor + uHighColor * (lightRatio + .5 * value);

                // Output to screen
                vec4 shaderToy_color_top = vec4(col, uOpacity);

                // summary
                // vec4 lower_color = vec4(uLowColor, uOpacity);
                vec4 lower_color = vec4(mixColor, uOpacity);
                // gl_FragColor = shaderToy_color_top;
                gl_FragColor = shaderToy_color_top * (1. - highOpacity) + lower_color * highOpacity;

                //模拟扭曲偏移，乱写的，模拟的，并不符合物理实际
                vec2 offset = uOffset * cos( shaderToy_color_top.rg * 3.14159 );
                //图片扭曲
                vec3 coord = vCoord.xyz / vCoord.w;
                vec3 toEye = normalize(vToEye);
                vec3 normal = normalize(col);
                vec2 uv_texture = coord.xy + coord.z * normal.xz * 0.05;
                float theta = max(dot(toEye, normal), 0.0);
                float reflectance = reflectivity + (1.0 - reflectivity) * pow((1.0 - theta), 5.0);
                vec4 reflectColor = texture2D(tReflectionMap, vec2(1.0 - uv_texture.x, uv_texture.y) + offset);
                vec4 refractColor = texture2D(tRefractionMap, uv_texture + + offset);


                //整体折射、反射
                // gl_FragColor = gl_FragColor * .5 + mix(refractColor, reflectColor, reflectance);
                //自定义水深折射、反射
                // float Z_RealRatio = min(1., (max(0., vPosition.z / realLvel + downToLevel)));
                // gl_FragColor = (1. - highOpacity) * (shaderToy_color_top + mix( refractColor, reflectColor, reflectance )) + mix(lower_color, shaderToy_color_top + mix( refractColor, reflectColor, reflectance ), Z_RealRatio) * highOpacity;
                //只保留顶部折射、反射
                gl_FragColor = (1. - highOpacity) * (shaderToy_color_top + mix( refractColor, reflectColor, reflectance )) + lower_color * highOpacity;

                //============================ shadertoy end ======================================

            }
        `;

        const material = new ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            side: DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: true,
            blending: THREE.NormalBlending, // 设置混合模式
        });

        // const gui = new GUI();
        // gui.add(params, 'uNeedLevel').min(0).max(20).step(0.1).onChange(val => {
        //     material.uniforms.uNeedLevel.value = val;
        // });
        // gui.addColor(params, 'uLowColor').onFinishChange(val => {
        //     material.uniforms.uLowColor.value = new THREE.Color(val)
        // })
        // gui.addColor(params, 'uHighColor').onFinishChange(val => {
        //     material.uniforms.uHighColor.value = new THREE.Color(val)
        // })

        material.uniforms.iResolution.value.set(geometry.parameters.width, geometry.parameters.height, geometry.parameters.depth);
        scope.material = material

        function updateTextureMatrix(camera: Camera) {
            textureMatrix.set(
                0.5, 0.0, 0.0, 0.5,
                0.0, 0.5, 0.0, 0.5,
                0.0, 0.0, 0.5, 0.5,
                0.0, 0.0, 0.0, 1.0
            );

            textureMatrix.multiply(camera.projectionMatrix);
            textureMatrix.multiply(camera.matrixWorldInverse);
            textureMatrix.multiply(scope.matrixWorld);

        }

        scope.onBeforeRender = function (renderer, scene, camera) {

            updateTextureMatrix(camera);

            scope.visible = false;

            reflector.matrixWorld.copy(scope.matrixWorld);
            refractor.matrixWorld.copy(scope.matrixWorld);

            (reflector as MyReflector).onBeforeRender(renderer, scene, camera);
            (refractor as MyRefractor).onBeforeRender(renderer, scene, camera);

            scope.visible = true;

        };

    }

}

export { MyWaterCube };
