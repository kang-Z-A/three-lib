import * as THREE from 'three'
import {
    Lensflare,
    LensflareElement,
} from "three/examples/jsm/objects/Lensflare.js";
import { Sky } from 'three/addons/objects/Sky.js';
import SunCalc from 'suncalc'
await import('suncalc')
declare global {
    interface Window {
        SunCalc: typeof SunCalc; // 声明 Suncalc 的类型
    }
}
async function useSun() {
    let sky: Sky, sun: THREE.Vector3;
    // 太阳高度
    const distance = 500;
    let sunX = 2000;  // 初始x坐标
    let sunY = 2000;  // 初始y坐标
    const dirColor: THREE.Color = new THREE.Color('#fdd885')

    // 默认经纬度，上海普陀区
    const latitude = 121.3912291, longitude = 31.2513263;

    const currentTime = new Date();
    currentTime.setHours(6, 0, 0, 0);

    let timeInterval = 120000; // 时间间隔（毫秒）

    function initSkyLights(scene: THREE.Scene) {
        const directionalLight_sun = new THREE.DirectionalLight(0xffffff, 1)  //平行光
        //平行光_sun
        directionalLight_sun.position.set(sunX, sunY, distance)
        directionalLight_sun.name = 'directionalLight_sun'
        directionalLight_sun.castShadow = true
        directionalLight_sun.shadow.mapSize.width = Math.pow(2, 13);
        directionalLight_sun.shadow.bias = -0.00005;
        directionalLight_sun.shadow.mapSize.height = Math.pow(2, 13);

        const d_sun = 1000
        directionalLight_sun.shadow.camera.left = -d_sun
        directionalLight_sun.shadow.camera.right = d_sun
        directionalLight_sun.shadow.camera.top = d_sun
        directionalLight_sun.shadow.camera.bottom = -d_sun

        directionalLight_sun.shadow.camera.far = 8000
        directionalLight_sun.shadow.camera.near = 10


        //点光源
        const pointLight = new THREE.PointLight(dirColor, 0.2, 1500, 0)
        pointLight.position.set(sunX, sunY, distance)
        pointLight.name = 'pointLight_sun'

        //半球光
        const hemisphereLight = new THREE.HemisphereLight(0xb1e1ff, "#1e1e1e", 0.4)  //半球光
        hemisphereLight.color.setHSL(0.6, 1, 0.6)
        hemisphereLight.groundColor.setHSL(0.095, 1, 0.75)
        hemisphereLight.position.set(0, 50, 0)

        let env = getEnvFromScene(scene)
        env.add(directionalLight_sun)
        env.add(hemisphereLight)
        env.add(pointLight)
        addLight(pointLight)
    }


    function initSky(scene: THREE.Scene) {
        // Add Sky
        sky = new Sky();
        sky.scale.setScalar(450000);
        let env = getEnvFromScene(scene)
        env.add(sky);

        sun = new THREE.Vector3();

        const effectController = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 2,
            azimuth: 180,
            exposure: 0.3
        };

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);

        // renderer.toneMappingExposure = effectController.exposure;   //色调映射的曝光级别
    }

    function updateSunPosition(scene: THREE.Scene) {
        const utcTime = new Date(currentTime.getTime() - (currentTime.getTimezoneOffset() * 60000))
        // const sunTime = SunCalc.getTimes(utcTime, latitude, longitude)

        const sunPosition = window.SunCalc.getPosition(utcTime, latitude, longitude);
        // console.log('currentTime', currentTime);
        // console.log('utcTime', utcTime);
        // console.log('sunTime', sunTime);
        // console.log('sunPosition', sunPosition);

        //转化为弧度
        const sunAltitude = sunPosition.altitude * (180 / Math.PI);
        const sunAzimuth = sunPosition.azimuth * (180 / Math.PI);


        const theta = (90 - sunAltitude) * (Math.PI / 180);
        const phi = (-sunAzimuth + 180) * (Math.PI / 180); // 考虑太阳在地平线以下的情况

        const x = 1000 * Math.sin(theta) * Math.cos(phi);
        const y = 1000 * Math.cos(theta);
        const z = 1000 * Math.sin(theta) * Math.sin(phi);

        // 时间推移
        currentTime.setTime(currentTime.getTime() + timeInterval);

        // 因为太阳是从底部出来，所以数据去反就好了;
        const pointLight = scene.getObjectByName('pointLight_sun');
        const directionalLight = scene.getObjectByName('directionalLight_sun');
        if (!pointLight || !directionalLight) return
        pointLight.position.set(-x, -y, -z);
        directionalLight.position.set(-x, -y, -z);

        const sunVector = new THREE.Vector3(-x, -y, -z);
        const uniforms = sky.material.uniforms;
        uniforms['sunPosition'].value.copy(sunVector);
    }

    return {
        initSkyLights,
        initSky,
        updateSunPosition
    }
}

//光晕
function addLight(light: THREE.PointLight) {
    const lensflare = new Lensflare()
    const textureLoader = new THREE.TextureLoader()
    const textureFlare0 = textureLoader.load('/images/lensflare0.png')
    const textureFlare3 = textureLoader.load('/images/lensflare3.png')
    lensflare.addElement(new LensflareElement(textureFlare0, 250, 0, light.color))
    lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6))
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7))
    lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9))
    lensflare.addElement(new LensflareElement(textureFlare3, 70, 1))
    light.add(lensflare)
}

function getEnvFromScene(scene: THREE.Scene) {
    let env = scene.getObjectByName('env')
    if (!env) {
        env = new THREE.Group()
        env.name = 'env'
        scene.add(env)
    }
    return env
}

export default useSun