import {
    Mesh,
    Color,
    // PlaneGeometry,
    ShaderMaterial,
    TextureLoader,
    DoubleSide,
    BufferGeometry,
    Clock
} from 'three';
import Img1 from './imgs/water_noise.png'
import Img2 from './imgs/water_wave.png'
import Img3 from './imgs/water_static.png'

export interface InitWaterOptions {
    color?: number,
    opacity?: number,
    speed?:number,
    scale?:number,
    type:2
}

class MyWater extends Mesh {
    isWater: boolean;

    constructor(geometry: BufferGeometry, options?: Omit<InitWaterOptions, 'type'>) {

        super(geometry);

        this.isWater = true;
        const scope = this;

        const texture1 = new TextureLoader().load(Img1)
        const texture2 = new TextureLoader().load(Img2)
        const texture3 = new TextureLoader().load(Img3)

        const params = {
            color: options?.color ?? 0x1d7b90,
            opacity: options?.opacity ?? 1.0,
            speed:options?.speed ?? 0.8,
            scale:options?.scale ?? 0.8
        }

        const uniforms = {
            uTime: { value: 0 },
            uColor: {
                value: new Color(params.color)
            },
            uOpacity: {
                value: params.opacity
            },
            uSpeed:{
                value:params.speed
            },
            uScale:{
                value:params.scale
            },
            texture1:{
                value:texture1
            },
            texture2:{
                value:texture2
            },
            texture3:{
                value:texture3
            },
        };

        const vertexShader = /* GLSL */ `
        varying vec2 vUv;
        #include <common>
        #include <logdepthbuf_pars_vertex>
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            #include <logdepthbuf_vertex>
        }
        `;


        const fragmentShader = /* GLSL */ `
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uSpeed;
            uniform float uScale;

            uniform sampler2D texture1;
            uniform sampler2D texture2;
            uniform sampler2D texture3;

            float avg(vec4 color) {
                return (color.r + color.g + color.b) / 3.0;
            }

            
            #include <common>
            #include <logdepthbuf_pars_fragment>
            void main() {
                #include <logdepthbuf_fragment>
                // Flow Speed, increase to make the water flow faster.
                // float speed = 0.8;

                // Water Scale, scales the water, not the background.
                float scale = 0.8;
                scale = uScale;

                // Water opacity, higher opacity means the water reflects more light.
                float opacity = 0.5;

                // Normalized pixel coordinates (from 0 to 1)
                // vec2 uv = (fragCoord/iResolution.xy);
                vec2 scaledUv = vUv * scale;

                // Water layers, layered on top of eachother to produce the reflective effect
                // Add 0.1 to both uv vectors to avoid the layers stacking perfectly and creating a huge unnatural highlight
                vec4 water1 = texture(texture2, scaledUv + vec2(mod(uTime * 0.02 * uSpeed - 0.1, 1. - scale)));
                vec4 water2 = texture(texture2, scaledUv.xy + vec2(mod(uTime * uSpeed * vec2(-0.02, -0.02) + 0.1, 1. - scale)));

                // Water highlights
                vec4 highlights1 = texture(texture3, scaledUv.xy + vec2(mod(uTime * uSpeed / vec2(-10, 100), 1. - scale)));
                vec4 highlights2 = texture(texture3, scaledUv.xy + vec2(mod(uTime * uSpeed / vec2(10, 100), 1. - scale)));

                // Average the colors of the water layers (convert from 1 channel to 4 channel
                water1.rgb = vec3(avg(water1));
                water2.rgb = vec3(avg(water2));

                // Average and smooth the colors of the highlight layers
                highlights1.rgb = vec3(avg(highlights1) / 1.5);
                highlights2.rgb = vec3(avg(highlights2) / 1.5);

                float alpha = opacity;

                if(avg(water1 + water2) > 0.3) {
                    alpha = 0.0;
                    // alpha = 5.0 * opacity;
                }

                if(avg(water1 + water2 + highlights1 + highlights2) > 2.) {
                // if(avg(water1 + water2 + highlights1 + highlights2) > 0.75) {
                    alpha = 5.0 * opacity;
                    // alpha = 1.0 * opacity;
                    // alpha = 0.0;
                }

                    // alpha = 0.0;
                // alpha = 5.0 * opacity;
                // Output to screen
                float fractX = fract((water1 + water2).x);
                float fractY = fract((water1 + water2).y);
                float fractZ = fract((water1 + water2).z);
                // gl_FragColor = (water1 + water2) * alpha ;
                // gl_FragColor = (water1 + water2) * alpha + vec4(uColor, 1.);
                // gl_FragColor = vec4(fractX, fractY, fractZ, 1.) * alpha + vec4(uColor, 1.);
                // gl_FragColor = vec4(vec3(fractX, fractY, fractZ) * alpha + uColor, uOpacity);
                gl_FragColor = vec4(vec3(1. - fractX, 1. - fractY, 1. - fractZ) * alpha + uColor, uOpacity);
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

        const clock = new Clock()
        this.onBeforeRender = (_renderer, _scene, _camera) => {
            const delta = clock.getElapsedTime()
            material.uniforms.uTime.value = delta
        }

        scope.material = material
    }

}

export { MyWater };
