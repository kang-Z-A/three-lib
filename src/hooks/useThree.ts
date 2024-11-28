import * as THREE from 'three'
// import * as THREE_GPU from 'three/webgpu'
// 引入gltf模型加载库GLTFLoader.js
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

//解决线宽无法配置
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
//  引入后处理扩展库
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// 引入渲染器通道RenderPass
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// 引入OutlinePass通道
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
// SMAA抗锯齿通道
// import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
// 引入UnrealBloomPass通道
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
// 伽马校正后处理Shader
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import RainDrop from '../utils/rainDrop';

import Utils from '../utils'
import MyEventBus from '../utils/eventBus'
import PercentInterceptor from '../utils/percent-interceptor'

import Stats from 'three/examples/jsm/libs/stats.module.js'
//引入动画库
import { Group, Tween } from '@tweenjs/tween.js'
import { ManagerBox, MyMixer, MyPostion, StressType, initOptions, TagMap, pointConfig, MyCSS3DObject, importUrlFormat, TagOptions, MyMesh, OrbitControlsOptions } from '../types/common';
import { MyWater } from '../utils/objects/myWater';
import { InitWaterOptions, MyWater as MyWater2 } from '../utils/objects/myWater2';
import { MyWaterCube } from '../utils/objects/waterCube';
import { WaterShaderParams, WaterCubeShaderParams, WaterShaderParams2 } from '../types/waterShaderParams';
import { ref, Ref, shallowRef, ShallowRef, watch } from '@vue/reactivity'

//场外环境之太阳日出日落
import useSun from './useSun'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Water } from 'three/examples/jsm/Addons.js';
// import { WaterMesh } from 'three/addons/objects/WaterMesh.js';

const {
    initSkyLights,
    initSky,
    updateSunPosition
} = await useSun()

function useThree() {
    let renderer: THREE.WebGLRenderer | undefined = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: true,
        preserveDrawingBuffer: true,
    })  // 渲染器
    let scene: ShallowRef<THREE.Scene | undefined> = shallowRef(new THREE.Scene()) // 场景
    let camera: ShallowRef<THREE.PerspectiveCamera | undefined> = shallowRef()

    //是否是指针锁定模式
    let isFirstView = ref(false)
    watch(isFirstView, (newVal) => {
        if (orbitControls.value) {
            if (newVal) {
                console.log('isFirstView', newVal, orbitControls.value!.target);

                disabledOrbitControls(true)
                // camera.value!.lookAt(orbitControls.value!.target)

                listenerAboutPointerLockControlsClick(true)
            } else {
                disabledOrbitControls(false)

                listenerAboutPointerLockControlsClick(false)
            }
        }
    })
    // let mergeRule = ref(Function)
    let mergeRule: Function


    let orbitControls: ShallowRef<OrbitControls | undefined> = shallowRef()
    let pointerLockControls: ShallowRef<PointerLockControls | undefined> = shallowRef()

    let clock: THREE.Clock | undefined // 世界时钟
    const raycasterWhiteList = ref([] as String[])   //射线拾取白名单
    let centerInitCameraPosition = [new THREE.Vector3(), new THREE.Vector3()]

    /**初始化模型后缓存每个模型对应的mixer */
    let mixerMap: Map<string, MyMixer> | undefined = new Map()
    /**自定义渲染器循环执行方法Map */
    let renderMixins: Map<any, Function> | undefined = new Map()
    /**循环渲染中需要自更新的队列 */
    let mixers: ShallowRef<Array<MyMixer> | undefined> = shallowRef([])

    let animationId = 0
    /**是否开启测距模式 */
    let allowMeasure: Ref<boolean> = ref(false)
    /**是否是自定义的连续线段 */
    let isContinue: Ref<boolean> = ref(false)
    /**测距模式下生成的一系列点或线 */
    const measureGroup: (THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap> | THREE.Line | Line2)[] = []
    /**已标记的点按顺序排列 */
    const points: THREE.Vector3[] = []
    let currentLine: THREE.Line | Line2 | undefined
    let textScale: number = 0.01
    /**防止拖拽事件触发点击事件 */
    let beforeX: number, beforeY: number, afterX: number, afterY: number
    let allowFocusAll = ref(true)

    const tweenGroup = new Group()

    /**储存CSS3D对象，主要是为了在循环渲染时让其始终面向相机 */
    const tagMap: TagMap = {
        currentTag: [],
        measure: []
    }

    //全局事件总线
    const eventBus = new MyEventBus().getEventBus()

    //==============进度条相关变量===========
    const percentInterceptor = new PercentInterceptor((percent: number) => {
        Utils.slowlyGenerate2(percent, (percent: number) => {
            // console.log('slowlyGenerate2 callback', percent);
            eventBus.publish('loadPercentage', percent)
        })
    })
    const percentMapProxy = percentInterceptor.percentMapProxy

    const cacheModel = shallowRef([] as THREE.Group<THREE.Object3DEventMap>[] | THREE.Object3D<THREE.Object3DEventMap>[] | undefined)

    //==========init方法相关变量=============
    let canvasId: string
    let highlightColor: number | string = 0x00be55
    let cameraPosition: MyPostion, cameraTarget: MyPostion
    let envMapIntensity = 1.0   //环境贴图亮度
    let raining: boolean = false    //是否下雨场景
    let showSky: boolean = false
    let showHelper: boolean = false
    let allowClick: boolean = true
    let autoSetCamera: boolean = false   //是否自动设置相机使模型位于视角中心
    let DISTANCE = ref(3)   //相机运动时最后距离目标的单位距离
    let useComposer: boolean
    let backgroundAlpha: number = 1.0
    let containerWidth = 0, containerHeight = 0
    let ambientItensity: number
    let stressType: StressType = StressType.STROKE
    let showBackImage = false
    let useDirectLight = true
    let backgroundImgPath: string
    let environmentIntensity: number
    let orbitControlsOptions: OrbitControlsOptions
    let receiveShadow = true
    let lightPosition: MyPostion | undefined
    let bias: number
    let envMap: THREE.Texture

    function init(options: initOptions) {
        let gltfUrls: importUrlFormat[] = [], showDefaultDialog = false
        if (options) {
            canvasId = options.canvasId ?? 'three-canvas'
            gltfUrls = options.gltfUrls
            highlightColor = options.highlightColor || 0x00be55
            stressType = options.stressType || StressType.STROKE
            showDefaultDialog = options.showDefaultDialog ?? false
            cameraPosition = options.cameraPosition ?? { x: 100, y: 100, z: 100 }    //相机位置
            cameraTarget = options.cameraTarget ?? { x: 0, y: 0, z: 0 }    //相机目标点
            raining = options.raining || false
            envMapIntensity = options.envMapIntensity || 1.0
            showSky = options.showSky || false
            showBackImage = options.showBackImage || false
            backgroundImgPath = options.backgroundImgPath ?? ''
            environmentIntensity = options.environmentIntensity ?? 1.0
            useDirectLight = options.useDirectLight ?? true
            bias = options.bias ?? -0.0005
            autoSetCamera = options.autoSetCamera || false
            raycasterWhiteList.value = options.raycasterWhiteList || []
            allowClick = options.allowClick ?? true
            useComposer = options.useComposer ?? false
            backgroundAlpha = options.backgroundAlpha ?? 1.0
            isFirstView.value = options.isFirstView ?? false
            containerWidth = options.containerWidth || window.innerWidth
            containerHeight = options.containerHeight || window.innerHeight
            ambientItensity = options.ambientItensity ?? 2
            mergeRule = options.mergeRule || function () { return false }
            allowFocusAll.value = options.allowFocusAll ?? true
            orbitControlsOptions = options.orbitControlsOptions || {}
            receiveShadow = options.receiveShadow ?? true
            lightPosition = options.lightPosition
        }

        addStyleSheet()
        initRender()
        initManager()
        if (showBackImage) initBackground(false)
        initLight()
        Utils.resetProgress()
        initLoader(gltfUrls, showDefaultDialog)
        initCamera()
        initClock()
        if (showHelper) initHelper()
        if (showStats) initStats()
        initOrbitControls()
        if (useComposer) initComposer()
        if (showSky) initSky(scene.value!)
        if (raining) addRainDrop()
        updateRenderer()
        initEventListener()
    }
    // 初始渲染器
    let initRender = () => {
        //logarithmicDepthBuffer解决缩放过大后模型忽闪忽闪
        // renderer! = new THREE.WebGLRenderer({
        //     antialias: true,
        //     alpha: true,
        //     logarithmicDepthBuffer: true,
        //     preserveDrawingBuffer: true,
        // })

        renderer!.localClippingEnabled = true
        renderer!.setPixelRatio(window.devicePixelRatio);
        renderer!.setSize(containerWidth, containerHeight)
        renderer!.shadowMap.enabled = true // 渲染器阴影渲染
        renderer!.shadowMap.type = THREE.PCFSoftShadowMap // 阴影类型
        let targetDom = document.getElementById(canvasId)
        if (!targetDom) {
            throw new Error(`Cannot find the dom with id '${canvasId}'`)
        }
        targetDom.appendChild(renderer!.domElement)
        //灰色背景
        // useComposer ? renderer!.setClearColor('rgb(7,7,7)', backgroundAlpha) : renderer!.setClearColor('#2d2d2d', backgroundAlpha)   //设置背景色
        //黑色背景
        useComposer ? renderer!.setClearColor('rgb(0, 0, 0)', backgroundAlpha) : renderer!.setClearColor('#2d2d2d', backgroundAlpha)   //设置背景色

        labelRenderer = new CSS3DRenderer();
        // labelRenderer = new CSS2DRenderer();

        labelRenderer.setSize(containerWidth, containerHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        labelRenderer.domElement.style.pointerEvents = 'none';

        targetDom.appendChild(labelRenderer.domElement);
        targetDom = null
    }

    let managerBox: ManagerBox  // 加载器
    let GltfLoader: GLTFLoader
    let DracoManager: DRACOLoader
    let initManager = () => {
        // 加载器公共事件
        let managerEvent = (_name: string, manager: THREE.LoadingManager) => {
            manager.onStart = (_url, _itemsLoaded, _itemsTotal) => {
            }
            manager.onLoad = () => {
            }
            manager.onProgress = (_url, _itemsLoaded, _itemsTotal) => {
            }
            manager.onError = _url => {
                // 兼容未加载完进行路由跳转
                console.error('manager onError');
            }
        }
        // 初始加载器
        managerBox = {
            GLTFManager: new THREE.LoadingManager(),
            DRACOManager: new THREE.LoadingManager(),
        }
        managerEvent('GLTFManager', managerBox.GLTFManager)
        managerEvent('DRACOManager', managerBox.DRACOManager)

        GltfLoader = new GLTFLoader(managerBox.GltfManager)
    }
    // 渲染时钟
    let initClock = () => {
        clock = new THREE.Clock() // 世界时钟
    }

    let stats: Stats, showStats: boolean = true
    let initStats = () => {
        stats = new Stats()
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '0px';
        stats.dom.style.left = (containerWidth - 100) + 'px';
        // stats.showPanel(2)
        document.body.appendChild(stats.dom);
    }
    function initLight() {
        // let intensity = lightPosition.y + 100   // 光照强度
        // const ambientLight = new THREE.AmbientLight(0xffffff, 5) // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, ambientItensity) // 环境光
        // const spotLight = new THREE.SpotLight(0xffffff, intensity, 0, Math.PI / 2, 0.5, 1) // 聚光灯
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2)  //默认平行光

        // 环境光
        ambientLight.name = 'ambientLight'

        //平行光
        directionalLight.shadow.bias = bias
        directionalLight.position.set(lightPosition?.x ?? 200, lightPosition?.y ?? 200, lightPosition?.z ?? -200)
        directionalLight.name = 'directionalLight'
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.width = Math.pow(2, 13);
        directionalLight.shadow.mapSize.height = Math.pow(2, 13);

        const d = 1000
        directionalLight.shadow.camera.left = -d
        directionalLight.shadow.camera.right = d
        directionalLight.shadow.camera.top = d
        directionalLight.shadow.camera.bottom = -d

        directionalLight.shadow.camera.far = 8000
        directionalLight.shadow.camera.near = 10

        scene.value!.add(ambientLight)
        // scene.value!.add(spotLight)

        if (showSky) {
            initSkyLights(scene.value!)
            // } else if (!showBackImage && useDirectLight) {
        } else if (useDirectLight) {
            // 默认平行光,最多一个平行光，不然castshadow计算阴影时对性能有相当大的损耗
            scene.value!.add(directionalLight)
        }
    }
    // 初始相机
    let initCamera = () => {
        camera.value = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000)  // 相机

        let x = 100, y = 100, z = 100, targetX = 0, targetY = 0, targetZ = 0
        if (cameraPosition) {
            x = cameraPosition.x ? cameraPosition.x : 100
            y = cameraPosition.y ? cameraPosition.y : 100
            z = cameraPosition.z ? cameraPosition.z : 100
        }
        if (cameraTarget && isFirstView.value) {
            targetX = cameraTarget.x ? cameraTarget.x : 0
            targetY = cameraTarget.y ? cameraTarget.y : 0
            targetZ = cameraTarget.z ? cameraTarget.z : 0
            const origin = new THREE.Vector3(x, y, z)
            const target = new THREE.Vector3(targetX, targetY, targetZ)
            const direction = new THREE.Vector3()
            direction.subVectors(target, origin).normalize()
            camera.value!.lookAt(direction)
        }

        // camera.value! = new THREE.PerspectiveCamera(35, containerWidth / containerHeight, 0.1, 100000) // 相机
        camera.value!.aspect = containerWidth / containerHeight
        camera.value!.position.set(x, y, z)
        // camera.value!.up.set(0, 1, 0)
        camera.value!.layers.enableAll();

        centerInitCameraPosition[0] = camera.value!.position.clone()
        console.log('initCamera centerInitCameraPosition', centerInitCameraPosition[0]);
    }
    // 加载相机插件
    let eventControllers: AbortController[] = [] //点击事件的控制器
    let initOrbitControls = () => {
        if (!isFirstView.value) useOrbitControls()
        else usePointerLockControls()
    }

    function useOrbitControls() {
        let x = 0, y = 0, z = 0
        if (cameraTarget) {
            x = cameraTarget.x ? cameraTarget.x : 0
            y = cameraTarget.y ? cameraTarget.y : 0
            z = cameraTarget.z ? cameraTarget.z : 0

            centerInitCameraPosition[1] = new THREE.Vector3(x, y, z)
            console.log('useOrbitControls centerInitCameraPosition', centerInitCameraPosition[1]);
        }
        orbitControls.value = new OrbitControls(camera.value!, renderer!.domElement) // 相机控件
        // orbitControls.value = new OrbitControls(camera.value!, renderer!.domElement)
        orbitControls.value!.autoRotate = false // 是否开启相机自动旋转
        // orbitControls.value.autoRotateSpeed  = 1 // 相机旋转速度，默认为2.0
        // orbitControls.value!.panSpeed = zoomDegree // 移动幅度
        // orbitControls.value!.zoomSpeed = zoomDegree // 缩放速度
        orbitControls.value!.rotateSpeed = 0.5
        orbitControls.value!.maxDistance = orbitControlsOptions.maxDistance || 1000
        orbitControls.value!.maxTargetRadius = orbitControlsOptions.maxTargetRadius || 1000

        orbitControls.value.maxPolarAngle = orbitControlsOptions.maxPolarAngle ?? Math.PI / 2 // 能够垂直旋转的角度的上限，默认值为Math.PI
        // orbitControls.value.minPolarAngle = Math.PI / 4 // 能够垂直旋转的角度的上限，默认值为Math.PI
        // orbitControls.value.minPolarAngle = 0
        orbitControls.value!.target = new THREE.Vector3(x, y, z) // 初始相机的所看的位置
        // orbitControls.value.target = new THREE.Vector3(6568, 310, 8831) // 初始相机的所看的位置
        orbitControls.value!.enableDamping = orbitControlsOptions.enableDamping ?? false  // 是否开启阻尼
        orbitControls.value!.dampingFactor = orbitControlsOptions.dampingFactor ?? 0.1   //阻尼系数
        // if (customZoom) orbitControls.value!.enableZoom = false    // 是否开启缩放，这里禁用是因为原生的无法同步target，故手动实现缩放，禁用原生缩放
        orbitControls.value!.enableZoom = true
    }

    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let jump = false
    let down = false
    let prevTime = performance.now();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    let usePointerLockControls = () => {
        let targetDom = document.getElementById(canvasId)
        if (!targetDom) throw new Error(`Cannot find the dom with id '${canvasId}'`)
        pointerLockControls = shallowRef(new PointerLockControls(camera.value!, targetDom)) // 相机控件

        scene.value!.add(pointerLockControls.value!.object)

        const onKeyDown = function (event: KeyboardEvent) {
            switch (event.code) {

                case 'ArrowUp':
                case 'KeyW':
                    moveForward = true;
                    break;

                case 'ArrowLeft':
                case 'KeyA':
                    moveLeft = true;
                    break;

                case 'ArrowDown':
                case 'KeyS':
                    moveBackward = true;
                    break;

                case 'ArrowRight':
                case 'KeyD':
                    moveRight = true;
                    break;

                case 'KeyQ':
                    jump = true
                    break;
                case 'KeyE':
                    down = true
                    break
            }

        }

        const onKeyUp = function (event: KeyboardEvent) {

            switch (event.code) {

                case 'ArrowUp':
                case 'KeyW':
                    moveForward = false;
                    break;

                case 'ArrowLeft':
                case 'KeyA':
                    moveLeft = false;
                    break;

                case 'ArrowDown':
                case 'KeyS':
                    moveBackward = false;
                    break;

                case 'ArrowRight':
                case 'KeyD':
                    moveRight = false;
                    break;
                case 'KeyQ':
                    jump = false
                    break;
                case 'KeyE':
                    down = false
                    break

            }

        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        startPointerLockControls()
        renderer!.setAnimationLoop(animate);
    }
    function startPointerLockControls() {
        // console.log('startPointerLockControls', pointerLockControls.value);
        if (pointerLockControls.value) {
            pointerLockControls.value.lock()
        }
    }
    function exitPointerLockControls() {
        if (pointerLockControls.value) {
            pointerLockControls.value.unlock()
        }
    }
    function listenerAboutPointerLockControlsClick(init: boolean) {
        let targetDom = document.getElementById(canvasId)
        if (!targetDom) throw new Error(`Cannot find the dom with id '${canvasId}'`)
        if (init) {
            targetDom.addEventListener('click', startPointerLockControls)
        } else {
            targetDom.removeEventListener('click', startPointerLockControls)
        }
    }
    let target = new THREE.Vector3(), cameraTarget2 = {
        last: new THREE.Vector3(),
        current: new THREE.Vector3()
    }
    let firstExit = true
    function animate() {
        const time = performance.now();
        // console.log('isLocked', pointerLockControls.value!.isLocked)
        if (pointerLockControls.value!.isLocked === true) {
            firstExit = true
            const delta = (time - prevTime) / 1000;

            velocity.x -= velocity.x * 10.0 * delta;
            velocity.z -= velocity.z * 10.0 * delta;
            velocity.y -= velocity.y * 10.0 * delta;

            direction.z = Number(moveForward) - Number(moveBackward);
            direction.x = Number(moveRight) - Number(moveLeft);
            direction.y = Number(jump) - Number(down);
            direction.normalize(); // this ensures consistent movements in all directions

            const speed = 20.0;
            if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
            if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
            if (jump || down) velocity.y -= direction.y * speed * delta;

            pointerLockControls.value!.moveRight(- velocity.x * delta);
            pointerLockControls.value!.moveForward(- velocity.z * delta);

            pointerLockControls.value!.object.position.y += (velocity.y * delta); // new behavior

            const cameraPosition = camera.value!.position.clone()
            const vec = new THREE.Vector3()
            camera.value!.getWorldDirection(vec)
            // console.log('vec', vec);
            target = cameraPosition.clone().add(vec)
            cameraTarget2.last = cameraTarget2.current.clone()
            cameraTarget2.current = target.clone()
            // console.log('current', cameraTarget2.current)
        } else if (isFirstView.value && firstExit) {   //防止退出时相机朝向偏移
            // const offset = Math.abs(cameraTarget2.last.angleTo(cameraTarget2.current))

            const cameraPosition = camera.value!.position.clone()
            const vec = new THREE.Vector3()
            camera.value!.getWorldDirection(vec)
            target = cameraPosition.clone().add(vec)
            const offset = Math.abs(target.angleTo(cameraTarget2.last))

            console.log('offset', offset, cameraTarget2.last);

            if (offset > 0.0001) {  //视角纠正
                camera.value!.lookAt(cameraTarget2.last)
            }

            firstExit = false
        }

        prevTime = time;

        // renderer!.render(scene.value!, camera.value!);
    }
    let disabledOrbitControls = (disabled: boolean) => {
        orbitControls.value!.enablePan = disabled ? false : true
        orbitControls.value!.enableRotate = disabled ? false : true
        orbitControls.value!.enableZoom = disabled ? false : true
    }
    let changeOrbitTarget = (x: number, y: number, z: number) => {
        orbitControls.value!.target = new THREE.Vector3(x, y, z)
    }

    // 后处理相关变量
    let composer: EffectComposer | undefined   //后处理对象
    let renderPass: RenderPass | undefined // 渲染器通道
    let outlinePass: OutlinePass | undefined  // outline通道
    let effectFXAA: ShaderPass | undefined
    let labelRenderer: CSS3DRenderer | CSS2DRenderer | undefined
    // 初始化后处理效果
    let initComposer = () => {
        /**
         * 模型描线默认配置
         */
        let defaultOutlinePass = () => {
            outlinePass!.edgeStrength = 16       //描边强度
            outlinePass!.edgeGlow = 1        //描边光晕
            outlinePass!.edgeThickness = 3.0;    //描边厚度
            outlinePass!.pulsePeriod = 2.0;  //描边呼吸频率
            // outlinePass.visibleEdgeColor.set('rgb(255, 0, 0)')
            outlinePass!.visibleEdgeColor.set(highlightColor)    //描边视觉上可见部分颜色,开启碰撞检测后此配置无效，只有不可见颜色，因为有一层透明球包裹在摄像机外面
            outlinePass!.hiddenEdgeColor.set(highlightColor)       //描边视觉上不可见部分颜色
            // outlinePass.hiddenEdgeColor.set(0x493827)       //描边视觉上不可见部分颜色
        }
        composer = new EffectComposer(renderer!);
        // (composer as any).toneMapping = THREE.LinearToneMapping; // 设置色调映射为线性

        renderPass = new RenderPass(scene.value!, camera.value!)
        composer.addPass(renderPass)
        const v2 = new THREE.Vector2(containerWidth, containerHeight)
        outlinePass = new OutlinePass(v2, scene.value!, camera.value!)

        defaultOutlinePass()
        composer.addPass(outlinePass)
        // const textureLoader = new THREE.TextureLoader();
        // textureLoader.load( 'textures/tri_pattern.jpg', function ( texture ) {

        //     outlinePass.patternTexture = texture;
        //     texture.wrapS = THREE.RepeatWrapping;
        //     texture.wrapT = THREE.RepeatWrapping;

        // } );

        // const outputPass = new OutputPass();
        // composer.addPass( outputPass );


        // 创建伽马校正通道
        const gammaPass = new ShaderPass(GammaCorrectionShader);
        composer.addPass(gammaPass);

        // const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
        // bloomPass.strength = 1.0;
        // composer.addPass( bloomPass );

        renderer!.setPixelRatio(window.devicePixelRatio);
        //FXAA抗锯齿通道
        effectFXAA = new ShaderPass(FXAAShader);
        // `.getPixelRatio()`获取`renderer!.setPixelRatio()`设置的值
        const pixelRatio = renderer!.getPixelRatio();//获取设备像素比 
        // width、height是canva画布的宽高度
        effectFXAA.material.uniforms['resolution'].value.x = 1 / (containerWidth * pixelRatio);
        effectFXAA.material.uniforms['resolution'].value.y = 1 / (containerHeight * pixelRatio);
        composer.addPass(effectFXAA);

        // SMAA抗锯齿通道
        // const pixelRatio = renderer!.getPixelRatio();//获取设备像素比 
        // const smaaPass = new SMAAPass(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio);
        // composer.addPass(smaaPass);
    }

    // let FPS = 30
    // const renderT = 1 / FPS
    // let timeStep = 0
    // 加载场景
    let updateRenderer = () => {
        animationId = requestAnimationFrame(updateRenderer)

        // const T = clock!.getDelta()
        // timeStep += T
        // if(timeStep < renderT) return
        // timeStep = 0

        if (showSky) updateSunPosition(scene.value!)

        if (raining) rainDrop!.animate()

        tweenGroup.update()
        camera.value!.updateProjectionMatrix()
        if (!isFirstView.value) {
            if (!orbitControls.value) useOrbitControls()
            orbitControls.value!.update(clock!.getDelta())
        } else if (isFirstView.value && !pointerLockControls.value) {
            usePointerLockControls()
        }

        labelRenderer!.render(scene.value!, camera.value!);
        updateLabel()

        useComposer ? composer!.render() : renderer!.render(scene.value!, camera.value!)

        if (showStats) stats.update()
        mixers.value!.forEach((mixer) => mixer.update(clock!.getDelta()))
        renderMixins!.forEach((mixin) => typeof mixin === 'function' && mixin())
    }
    function loadAnimation(mesh: THREE.Object3D, animations: THREE.AnimationClip[], animationName: string, parentName: string) {
        const mixer = new THREE.AnimationMixer(mesh)
        const clip = THREE.AnimationClip.findByName(animations, animationName)
        if (!clip) return
        const action = mixer.clipAction(clip)
        action.timeScale = 10; // 将动画速度加倍
        action.play()
        mixerMap!.set(parentName, mixer)
        return
    }
    function removeMixers(rootNames: string[]) {
        mixers.value! = mixers.value!.filter(mixer => {
            return !mixer._root || (mixer._root && !rootNames.includes(mixer._root.name))
        })
        console.log('removeMixers', rootNames, mixers.value!);
    }
    function loadGLTF(url: string) {
        const onCompleted = (object: GLTF, resolve: any) => resolve(object)
        // percentMapProxy.set(url, 95)
        return new Promise((resolve) => {
            GltfLoader.load(url, (object) => {
                console.log('set percent complete 100');
                percentMapProxy.set(url, 100)
                onCompleted(object, resolve)
            },
                (xhr) => {
                    console.log('xhr', xhr.loaded, xhr.total);
                    // 当模型文件通过nginx压缩后，无法得到contentLength，即xhr.total
                    let percent = 0
                    percent = Math.floor(xhr.loaded / xhr.total * 100)
                    console.log('set percent =>', percent);
                    percentMapProxy.set(url, percent)
                }),
                (error: any) => {
                    console.error('解析GLtf出现错误 => ', error);
                }
        })
    }
    function loadDraco(dracoBaseUrl: string = '/libs/draco/gltf/') {
        DracoManager = new DRACOLoader(managerBox.DRACOManager)
        DracoManager.setDecoderPath(dracoBaseUrl)
        GltfLoader.setDRACOLoader(DracoManager)
    }
    function addModelGroupByObjects(modelGroup: THREE.Group, parentName: string | null = null, position: MyPostion | null = null) {
        if (parentName) {
            function scanToAdd(model: THREE.Scene | THREE.Group | THREE.Object3D) {
                if (model.name === parentName) {
                    if (position) modelGroup.position.set(position.x, position.y, position.z)
                    model.add(modelGroup)
                    return
                }
                if (model.children && model.children.length > 0) {
                    for (let i = 0, len = model.children.length; i < len; i++) {
                        scanToAdd(model.children[i])
                    }
                }
            }
            scanToAdd(scene.value!)
        } else {
            if (position) modelGroup.position.set(position.x, position.y, position.z)
            scene.value!.add(modelGroup)
        }
        eventBus.publish('allLoaded')
    }
    async function addModelGroupByUrls(gltfUrls: importUrlFormat[], parentName: string | null = null, position: MyPostion | null = null) {
        loadDraco()
        const promiseQuery = []
        for (let gltfUrl of gltfUrls) {
            const gltf = loadGLTF(gltfUrl.url)
            promiseQuery.push(gltf)
        }
        const resArr = await Promise.allSettled(promiseQuery)
        DracoManager.dispose()
        let modelGroup = scene.value!.getObjectByName('modelGroup') as THREE.Group
        if (!modelGroup) {
            modelGroup = new THREE.Group()
            modelGroup.name = 'modelGroup'
        }
        for (let i = 0, len = resArr.length; i < len; i++) {
            if (resArr[i].status === 'fulfilled') {
                const gltf = (resArr[i] as PromiseFulfilledResult<GLTF>).value
                console.log('控制台查看加载gltf文件返回的对象结构', gltf);
                console.log('gltf对象场景属性', gltf.scene);

                //对场景中的所有物体做统一处理
                Utils.suffixTraverse(gltf.scene, envMapIntensity, mergeRule, receiveShadow)

                //模型缩放配置
                if (gltfUrls[i].needScale && gltfUrls[i].scale) gltf.scene.scale.set(...gltfUrls[i].scale as [number, number, number])
                gltf.scene.position.set(0, 0, 0)

                gltf.scene.name = gltfUrls[i].url;
                for (let j = 0, len = gltf.animations.length; j < len; j++) {
                    loadAnimation(gltf.scene, gltf.animations, gltf.animations[j].name, gltfUrls[i].url)
                }
                //对每一个加载的模型进行缓存
                cacheModel.value!.push(gltf.scene)

                if (gltfUrls[i].addToScene || gltfUrls[i].addToScene === undefined) {
                    modelGroup.add(gltf.scene)
                    const mixer = mixerMap!.get(gltfUrls[i].url)
                    if (mixer) mixers.value!.push(mixer)
                }
            } else {
                console.log('gltf加载失败 reason => ', (resArr[i] as PromiseRejectedResult).reason);
            }
        }
        addModelGroupByObjects(modelGroup, parentName, position)
        setTimeout(() => {
            Utils.resetProgress()
            percentMapProxy.clear()
        }, 1000);
    }
    async function initLoader(gltfUrls: importUrlFormat[], showDefaultDialog = true) {
        await addModelGroupByUrls(gltfUrls)

        //移动相机观察场景中心
        if (autoSetCamera) getCenterFromBounding()
        if (showGui) initGui()
        // 初始化点击事件
        if (allowClick) initThreeclickObjEvent(showDefaultDialog)
        // console.log('scene.value!', scene.value!);
        // changeLight()
    }
    /**鼠标点击事件，获取对应世界坐标 */
    function getVectorByClick(event: MouseEvent) {
        if (isFirstView.value) return
        event.preventDefault();
        const vector = new THREE.Vector3();//三维坐标对象
        vector.set(
            (event.clientX / containerWidth) * 2 - 1,
            - (event.clientY / containerHeight) * 2 + 1,
            0.5);
        vector.unproject(camera.value!);
        const raycaster = new THREE.Raycaster(camera.value!.position, vector.sub(camera.value!.position).normalize());
        const intersects = raycaster.intersectObjects(scene.value!.children);
        if (intersects.length > 0) {
            var selected = intersects[0];//取第一个物体
            console.log('selected: ', selected)
            console.log("x坐标:" + selected.point.x);
            console.log("y坐标:" + selected.point.y);
            console.log("z坐标:" + selected.point.z);
        }
    }
    function measureDistance(event: MouseEvent) {
        if (isFirstView.value) return
        if (!allowMeasure.value) return
        if (Math.abs(afterX - beforeX) > 5 && Math.abs(afterY - beforeY) > 5) return
        event.preventDefault();
        const mouseX = event.clientX
        const mouseY = event.clientY
        const pointer = new THREE.Vector2()
        pointer.x = (mouseX / containerWidth) * 2 - 1
        pointer.y = -(mouseY / containerHeight) * 2 + 1
        const raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = 0.3
        raycaster.setFromCamera(pointer, camera.value!)
        const intersects = raycaster.intersectObjects(scene.value!.children)
        console.log('intersects', intersects);
        let target
        for (let i = 0, len = intersects.length; i < len; i++) {
            let item = intersects[i]
            if (item.object instanceof THREE.Line) continue
            target = item
            break
        }
        if (target) {
            const selected = target.point
            addPoint(selected.x, selected.y, selected.z)
        }
    }
    function addPoint(x: number, y: number, z: number) {
        const point = createPoint(x, y, z, { color: 0x005348, size: 0.03 })
        scene.value!.add(point)
        measureGroup.push(point)
        points.push(new THREE.Vector3(x, y, z))

        if (isContinue.value) generateLine()
        else updateMeasurementLine();
    }
    function updateMeasurementLine() {
        if (points.length < 2 || points.length % 2 !== 0) return
        /* three.js基础版line，无法调整lineWidth 
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(
            [
                points[points.length - 2],
                points[points.length - 1]
            ]
        );
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xf9f8ed,
            linewidth:100.0,
            linecap:'butt'
        }); */
        const last2 = points[points.length - 2], last1 = points[points.length - 1];
        const positions = [last2.x, last2.y, last2.z, last1.x, last1.y, last1.z]
        const lineColor = new THREE.Color(0xf9f8ed)

        const geometry = new LineGeometry();
        geometry.setPositions(positions);
        geometry.setColors([lineColor.r, lineColor.g, lineColor.b, lineColor.r, lineColor.g, lineColor.b]);

        const matLine = new LineMaterial({
            color: 0x00d0dd,
            linewidth: 4, // in world units with size attenuation, pixels otherwise
            vertexColors: false,

            //resolution:  // to be set by renderer!, eventually
            dashed: false,
            alphaToCoverage: true,
        });
        matLine.resolution.set(containerWidth, containerHeight)
        //创建线对象
        currentLine = new Line2(geometry, matLine)
        // currentLine.computeLineDistances();
        scene.value!.add(currentLine)
        measureGroup.push(currentLine)

        const distance = points[points.length - 2].distanceTo(points[points.length - 1])
        console.log('距离: ', distance);

        // 求中点坐标
        let centerX = (points[points.length - 2].x + points[points.length - 1].x) / 2;
        let centerY = (points[points.length - 2].y + points[points.length - 1].y) / 2;
        let centerZ = (points[points.length - 2].z + points[points.length - 1].z) / 2;

        const earthDiv = document.createElement("div");
        const customStyle = 'color: #f9f8ed;font-size: 16px;pointer-events:none !important;'
        earthDiv.setAttribute('style', customStyle)
        earthDiv.classList.add('no-pointer-events')
        earthDiv.textContent = distance.toFixed(5) + " m";
        // earthDiv.style.marginTop = "-1em";

        const label3D = new CSS3DObject(earthDiv);
        label3D.scale.set(textScale, textScale, textScale)
        label3D.name = distance.toFixed(0);
        label3D.position.set(centerX, centerY, centerZ); //标签标注在obj世界坐标
        label3D.layers.set(1);

        console.log('label3D', label3D);
        scene.value!.add(label3D);
        // measureGroup.push(label3D)
        tagMap['measure'] ? tagMap['measure'].push(label3D) : [label3D]
        // labelRenderer.render(scene.value!, camera.value!)
    }
    function generateLine() {
        if (points.length < 2) return
        /*  three.js基础版line，无法调整lineWidth 
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(
            [
                points[points.length - 2],
                points[points.length - 1]
            ]
        );
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xca40ea,
            linewidth: 2
        });
        //创建线对象
        currentLine = new THREE.Line(lineGeometry, lineMaterial) */

        //新的line
        const last2 = points[points.length - 2], last1 = points[points.length - 1];
        const positions = [last2.x, last2.y, last2.z, last1.x, last1.y, last1.z]
        const lineColor = new THREE.Color(0xf9f8ed)

        const geometry = new LineGeometry();
        geometry.setPositions(positions);
        geometry.setColors([lineColor.r, lineColor.g, lineColor.b, lineColor.r, lineColor.g, lineColor.b]);

        const matLine = new LineMaterial({
            color: 0x00d0dd,
            linewidth: 4, // in world units with size attenuation, pixels otherwise
            vertexColors: false,

            //resolution:  // to be set by renderer!, eventually
            dashed: false,
            alphaToCoverage: true,
        });
        matLine.resolution.set(containerWidth, containerHeight)
        //创建线对象
        const currentLine = new Line2(geometry, matLine)
        scene.value!.add(currentLine)
        measureGroup.push(currentLine)
    }
    function clearMeasure() {
        measureGroup.forEach(item => {
            item.removeFromParent()
            item.geometry.dispose()
            if (item.material instanceof THREE.Material) item.material.dispose()
        })
        tagMap['measure'].forEach(item => {
            item.removeFromParent()
        })

        tagMap['measure'] = []
        points.splice(0, points.length)
        measureGroup.splice(0, measureGroup.length)
    }
    function createPoint(x: number, y: number, z: number, config: pointConfig = { color: 0xf9f8ed, size: 0.8 }) {
        let mat = new THREE.MeshBasicMaterial({
            color: config.color || 0xf9f8ed,
        });
        let sphereGeometry = new THREE.SphereGeometry(config.size || 0.3, 32, 32);
        let sphere = new THREE.Mesh(sphereGeometry, mat);
        sphere.position.set(x, y, z);
        return sphere;
    }
    let SELECTED: THREE.Object3D | undefined
    // 点击事件
    let initThreeclickObjEvent = (showDefaultDialog: boolean) => {
        let targetDom = document.getElementById(canvasId)
        if (!targetDom) throw new Error(`Cannot find the dom with id '${canvasId}'`)

        //点击射线
        let raycaster = new THREE.Raycaster();
        let mouse = new THREE.Vector2(), mouseSelected: THREE.Object3D | undefined;
        function onDocumentMouseDown(event: MouseEvent) {
            if (isFirstView.value || !allowFocusAll.value) return
            event.preventDefault();
            mouse.x = (event.clientX / renderer!.domElement.clientWidth) * 2 - 1;
            mouse.y = -(event.clientY / renderer!.domElement.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera.value!);

            const intersects = raycaster.intersectObjects(scene.value!.children);
            // console.log('intersects', intersects);

            const whiteList = ['isSky']  //射线拾取白名单
            // const whiteList = ['isSky', 'isWater']

            let pickedObject: THREE.Object3D | undefined;

            if (intersects.length > 0) {
                console.log('射线拾取实际上第一个拾取的物体: ', intersects[0].object);
            }
            const ignoreList = [...raycasterWhiteList.value, ...tagMap['currentTag']]
            for (let i = 0, len = intersects.length; i < len; i++) {
                const item = intersects[i].object

                if (whiteList.every(key => !Object.hasOwn(item, key) && ignoreList.every(whiteName => item.name !== whiteName))) {
                    pickedObject = item
                    break
                }
            }
            console.log('pickedObject', pickedObject);

            console.log('whiteList', whiteList, ignoreList);

            //拾取物体数大于0时
            if (pickedObject) {
                console.log('select');
                //鼠标的变换
                document.body.style.cursor = 'pointer';
                //获取第一个物体，如果切换物体，将原先选中的物体材质复原
                if (!mouseSelected) mouseSelected = pickedObject;
                else {
                    recoverMaterial(mouseSelected)
                    mouseSelected = pickedObject;
                }
                eventBus.publish('clickMesh', event, mouseSelected)

                //选中模型回调，默认展示模型相关信息
                if (showDefaultDialog) {
                    showSelectObjectInfo(event, mouseSelected)
                }
                focusModel(mouseSelected, DISTANCE.value)
            } else {
                recoverMaterial(SELECTED)
            }
        }

        //如果已经绑定了事件监听器，则移除之前的
        eventControllers.forEach(eventController => {
            eventController.abort()
        })
        eventControllers = []

        //双击
        const controller = new AbortController()
        const signal = controller.signal
        eventControllers.push(controller)
        //单击
        const controller2 = new AbortController()
        const signal2 = controller2.signal
        eventControllers.push(controller2)
        //鼠标按下
        const controller3 = new AbortController()
        const signal3 = controller3.signal
        eventControllers.push(controller3)
        //鼠标抬起
        const controller4 = new AbortController()
        const signal4 = controller4.signal
        eventControllers.push(controller4)

        targetDom.addEventListener('dblclick', onDocumentMouseDown, {
            signal: signal
        });
        const clickEvent: number = 0
        if (clickEvent == 0) {
            targetDom.addEventListener('click', getVectorByClick, {
                signal: signal2
            });
        } else if (clickEvent == 1) {
            targetDom.addEventListener('click', measureDistance, {
                signal: signal2
            });
        }

        //控制拖拽时不触发点击事件
        targetDom.addEventListener('mousedown', (e: MouseEvent) => {
            [beforeX, beforeY] = [e.offsetX, e.offsetY]
        }, { signal: signal3 })
        targetDom.addEventListener('mouseup', (e: MouseEvent) => {
            [afterX, afterY] = [e.offsetX, e.offsetY]
        }, { signal: signal4 })

        targetDom = null
    }

    // let cameraPos: THREE.Vector3
    /** 
     * 通过场景中心与半径来定位相机的位置与朝向
    */
    let getCenterFromBounding = () => {
        const boxHelper = new THREE.BoxHelper(new THREE.Object3D())
        let item = scene.value!.getObjectByName('modelGroup')
        if (!item) return
        boxHelper.setFromObject(item)
        console.log('boxHelper.geometry.boundingSphere => ', boxHelper.geometry.boundingSphere);
        console.log('boxHelper.geometry.center() => ', boxHelper.geometry.center());
        if (!boxHelper.geometry.boundingSphere) {
            console.warn('boxHelper.geometry.boundingSphere is', boxHelper.geometry.boundingSphere);
            return
        }
        let center = boxHelper.geometry.boundingSphere.center
        let radius = boxHelper.geometry.boundingSphere.radius

        item.position.set(-center.x, -center.y, -center.z)
        const cameraDistance = radius * 1.8
        camera.value!.position.set(cameraDistance, cameraDistance, cameraDistance)
        console.log('getCenter centerInitCameraPosition');

        centerInitCameraPosition = [camera.value!.position.clone(), new THREE.Vector3()]
        orbitControls.value!.target.set(0, 0, 0)
    }

    let showGui: boolean = false
    let initGui = () => {
        // const gui = new GUI({ width: 310 })
    }
    // 初始辅助
    let initHelper = () => {
        const axesHelper = new THREE.AxesHelper(1000)
        scene.value!.add(axesHelper)
    }
    async function resetCamera() {
        //相机还原到初始位置
        console.log('resetCamera', centerInitCameraPosition[0], centerInitCameraPosition[1]);

        await changeCameraFocus(centerInitCameraPosition[0], centerInitCameraPosition[1])
    }

    let rainDrop: RainDrop | undefined
    function addRainDrop() {
        rainDrop = new RainDrop()
        scene.value!.add(rainDrop.instance)
    }
    const recoverMaterial = (object: THREE.Object3D | undefined, includeOutline: boolean = false) => {
        if (!includeOutline) {
            console.log('recoverMaterial', object);
            //清除高亮描边
            outlinePass ? outlinePass.selectedObjects = [] : null
            // removeTag('currentTag')
            removeAllTag()
            document.body.style.cursor = 'auto';

            eventBus.publish('recoverMaterial', object)
        }

        if (object instanceof THREE.Mesh) {
            const mesh = object as MyMesh
            if (mesh._preMaterial) mesh.material = mesh._preMaterial  //复原物体材质
        } else {
            object?.children.forEach(child => {
                recoverMaterial(child, true)
            })
        }
    }
    function recoverSelect() {
        if (SELECTED) {
            recoverMaterial(SELECTED)
            SELECTED = undefined
        }
    }
    function getTagName(obj: THREE.Object3D) {
        return {
            tagName: obj.name + '名称',
            // tagName: obj.name,
            modelName: obj.name
        }
    }
    const highlightModel = (model: THREE.Object3D, stressType: StressType = StressType.STROKE, highlightColor: string = '0x00be55') => {
        if (model instanceof THREE.Mesh) {
            const mesh = model as MyMesh
            //缓存模型初始材质
            let _preMaterial
            if (Array.isArray(mesh.material)) {
                let arr = []
                for (let i = 0, len = mesh.material.length; i < len; i++) {
                    arr.push(mesh.material[i].clone())
                }
                _preMaterial = arr
            } else {
                _preMaterial = mesh.material;  //记录当前选择的材质
            }
            mesh._preMaterial = _preMaterial;     //缓存当前选择的材质
        } else {
            model.children.forEach(child => {
                highlightModel(child, stressType, highlightColor)
            })
        }

        //高亮模型材质
        SELECTED = model
        console.log('点击前的对象 => ', model, stressType)
        switch (stressType) {
            case StressType.STROKE:
                outlinePass ? outlinePass.selectedObjects = [model] : null
                break;
            case StressType.WIREFRAM:
                if (model instanceof THREE.Mesh) {
                    // 创建发光材质
                    const mesh = model as THREE.Mesh
                    const glowingMaterial = new THREE.MeshBasicMaterial({
                        color: highlightColor, // 发光的颜色
                        wireframe: true, // 使用线条渲染模式
                    });
                    mesh.material = glowingMaterial
                }
                break;
            case StressType.COLOR:
                if (model instanceof THREE.Mesh) {
                    //直接修改材质颜色
                    if (Array.isArray(model.material)) {
                        const newColor = new THREE.Color(highlightColor); // 修改拷贝的材质的颜色
                        for (let i = 0, len = model.material.length; i < len; i++) {
                            const cloneMaterial = model.material[i].clone()
                            cloneMaterial.color = newColor
                            model.material[i] = cloneMaterial

                        }
                    } else {
                        if (!model.material) return
                        const material = model.material.clone(); // 深拷贝物体的材质
                        material.color = new THREE.Color(highlightColor); // 修改拷贝的材质的颜色
                        model.material = material; // 将拷贝的材质应用到物体上
                    }
                }
                break;
            default:
                outlinePass!.selectedObjects = [model]
                break;
        }
        console.log('点击后的对象 =>', model)

        const tagName = getTagName(model).tagName
        const modelName = getTagName(model).modelName
        console.log('tagName ==> ', tagName);
        // addTag(tagName, modelName, 0.02)
        addTag(tagName, modelName)
    }
    const showSelectObjectInfo = (_event: MouseEvent, object: THREE.Object3D) => {
        let objInfoEl = document.createElement('div')
        objInfoEl.className = 'object-info'
        objInfoEl.id = object.uuid
        objInfoEl.innerHTML = '名称：' + object.name + '<br />' + '类型：' + object.type + '<br />' + 'id：' + object.id + '<br />' + 'uuid：' + object.uuid + '<br />'
        objInfoEl.style.cssText = 'padding: 8px 16px;position:absolute;background-color: #A55E2F;color: #FFF2A1;border-radius: 5px'
        objInfoEl.style.top = '16px'
        objInfoEl.style.right = '16px'
        document.body.appendChild(objInfoEl)
    }
    /**
     * 改变相机焦点，默认开启动画，动画时长1s
     * @param cameraPosition 相机位置{x,y,z}
     * @param cameraTarget 相机目标{x,y,z}
     * @param useTween 是否使用动画
     */
    const changeCameraFocus = (cameraPosition: MyPostion, cameraTarget: MyPostion, useTween: boolean = true) => {
        return new Promise((resolve, _reject) => {
            console.log('changeCameraFocus', cameraPosition, cameraTarget);
            if (!useTween) {
                camera.value!.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
                orbitControls.value!.target.set(cameraTarget.x, cameraTarget.y, cameraTarget.z)
                return
            }
            disabledOrbitControls(true)
            const tween1 = new Tween(camera.value!.position)
                .to({ x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z }, 1000)
                .start()
                .onComplete(() => {
                    disabledOrbitControls(false)
                    tweenGroup.remove(tween1)
                    resolve('动画完成')
                })
            tweenGroup.add(tween1)

            const tween2 = new Tween(orbitControls.value!.target)
                .to({ x: cameraTarget.x, y: cameraTarget.y, z: cameraTarget.z }, 1000)
                .start()
                .onComplete(() => {
                    tweenGroup.remove(tween2)
                })
            tweenGroup.add(tween2)
        })
    }
    const clearScene = () => {
        while (scene.value!.children.length > 0) {
            const child = scene.value!.children[0];
            scene.value!.remove(child);
        }
    }
    function myKeyboardEvent(e: KeyboardEvent) {
        switch (e.code) {
            case 'Space':
                const vec = new THREE.Vector3()
                camera.value!.getWorldDirection(vec)
                const target = camera.value!.position.clone().add(vec)

                console.log('camera.position', camera.value! && camera.value!.position);
                console.log('camera.direction', vec);
                console.log('target', target);
                console.log('orbitControls.target', orbitControls.value && orbitControls.value.target);
                break;
            // case 'KeyR':
            //     changeModelGroup()
            //     break;
            default:
                break;
        }
    }
    function watchTabVisibility() {
        if (document.hidden) {
            cancelAnimationFrame(animationId)
        } else {
            updateRenderer()
        }
    }
    const initEventListener = () => {
        window.addEventListener('resize', onWindowResize);
        window.addEventListener('keydown', myKeyboardEvent)
        document.addEventListener('visibilitychange', watchTabVisibility)
    }
    const removeEventListener = () => {
        window.removeEventListener('resize', onWindowResize)
        window.removeEventListener('keydown', myKeyboardEvent)
        document.removeEventListener('visibilitychange', watchTabVisibility)
    }
    const destroy = () => {
        cancelAnimationFrame(animationId)
        renderer!.dispose()
        renderer!.forceContextLoss()
        scene.value!.traverse((child) => {
            if (child instanceof THREE.Mesh) disposeMesh(child)
        })
        removeEventListener()
        if (showStats) document.body.removeChild(stats.dom)
        resetVariable()
    }
    /** 清除引用内存 */
    function resetVariable() {
        scene.value = undefined
        camera.value = undefined
        clock = undefined
        renderer = undefined
        mixerMap = undefined
        renderMixins = undefined
        mixers.value = undefined
        measureGroup.splice(0, measureGroup.length)
        points.splice(0, points.length)
        currentLine = undefined
        tagMap.currentTag = []
        tagMap.measure = []
        cacheModel.value = undefined
        managerBox = {} as ManagerBox
        orbitControls.value = undefined
        composer = undefined
        renderPass = undefined
        outlinePass = undefined
        effectFXAA = undefined
        labelRenderer = undefined
        rainDrop = undefined
    }
    function onWindowResize() {
        let targetDom = document.getElementById(canvasId)
        const width = targetDom ? targetDom.clientWidth : window.innerWidth
        const height = targetDom ? targetDom.clientHeight : window.innerHeight
        console.log('onWindowResize', width, height);

        camera.value!.aspect = width / height;
        camera.value!.updateProjectionMatrix();

        renderer!.setSize(width, height);
        // renderer!.setSize(window.innerWidth, window.innerHeight);
        if (useComposer) {
            composer!.setSize(width, height);
            const pixelRatio = renderer!.getPixelRatio();
            effectFXAA!.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
            effectFXAA!.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
        }
        // composer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer!.setSize(width, height);
        targetDom = null
        if (showStats) stats.dom.style.left = (width - 100) + 'px';
    }
    function resize() {
        onWindowResize()
    }
    async function initBackground(isCube = true, callback: Function | null = null) {
        if (!isCube) {
            // 创建一个PMREMGenerator以生成环境贴图
            var pmremGenerator = new THREE.PMREMGenerator(renderer!);
            pmremGenerator.compileEquirectangularShader();

            const suffix = backgroundImgPath.split('.').slice(-1).join()
            let loader
            if (suffix === 'exr') {
                loader = new EXRLoader();
            } else if (suffix === 'hdr') {
                loader = new RGBELoader();
            } else return
            loader.load(backgroundImgPath, function (texture) {
                // 通过PMREMGenerator处理texture生成环境贴图
                envMap = pmremGenerator.fromEquirectangular(texture).texture;
                // 设置场景的环境贴图
                scene.value!.environment = envMap;
                scene.value!.environmentIntensity = environmentIntensity ?? 1.0;
                // 设置场景的背景
                scene.value!.background = envMap;
                // 释放pmremGenerator的资源
                console.log('背景解析配置完成');
                pmremGenerator.dispose();
                if (callback) callback()
            });
        } else {
            console.log('load Cube background');
            const textureCube = new THREE.CubeTextureLoader().setPath('/images/')
                .load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'])
            scene.value!.environment = textureCube;
            scene.value!.background = textureCube;
        }
    }
    function resetBg(isNull: boolean, clearBgLight: boolean = true) {
        if (scene.value) {
            if (isNull) {
                scene.value.background = null
                if (clearBgLight) scene.value.environment = null
            } else {
                scene.value.background = envMap
                scene.value.environment = envMap
            }
        }
    }
    function addTag(TagName: string, content: string, scale: number = 1, customStyle: string = '') {
        let item = scene.value!.getObjectByName(TagName)
        if (!item) {
            let temp = TagName.split('名称')
            let newTagName = temp[0] + temp[1] + '名称'
            item = scene.value!.getObjectByName(newTagName)
            if (!item) {
                return
            }
        }

        const tabDiv = document.createElement('div');
        const defaultStyle = 'position: absolute; color:white; padding: 10px 5px; background-color: rgba(14, 23, 32, 0.5); border-radius: 10px; box-shadow:   0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0),inset 0 0 18px 8px rgba(255, 104, 0, 0.5); pointer-events:none !important;'
        let tagStyle = defaultStyle
        if (customStyle) tagStyle = customStyle

        tabDiv.setAttribute('style', tagStyle)
        tabDiv.classList.add('no-pointer-events')
        tabDiv.textContent = content;

        // const tag = new CSS2DObject(tabDiv);

        const tag: MyCSS3DObject = new CSS3DObject(tabDiv);
        // console.log('tag => ', tag);
        tag.scale.set(scale, scale, scale)

        // tag.name = 'currentTag'
        tag.name = TagName

        let center = new THREE.Vector3(0, 0, 0)

        item.getWorldPosition(center)

        item.worldToLocal(center)
        tag.position.set(center.x, center.y, center.z);

        item.add(tag);

        tagMap['currentTag'] ? tagMap['currentTag'].push(tag) : tagMap['currentTag'] = [tag]
        tag.layers.set(1);
        console.log('addTag', item);
    }
    function addCustomTagByModelname(targetName: string, element: HTMLElement, scale: number = 1) {
        let item = scene.value!.getObjectByName(targetName)
        if (!item) {
            console.warn('没有找到匹配的模型---', targetName)
            return
        }

        const tag: MyCSS3DObject = new CSS3DObject(element);
        tag.scale.set(scale, scale, scale)
        tag.name = targetName + '_tag_' + Date.now()

        let center = new THREE.Vector3(0, 0, 0)
        item.getWorldPosition(center)
        item.worldToLocal(center)
        tag.position.set(center.x, center.y, center.z + 2.0);
        item.add(tag);
        return tag
    }
    function addCustomTagByConfig(element: HTMLElement, tagOptions: TagOptions) {
        const { position, scale, tagName } = tagOptions

        const tag: MyCSS3DObject = new CSS3DObject(element);

        if (scale) tag.scale.set(scale, scale, scale)
        else tag.scale.set(1, 1, 1)

        if (tagName) tag.name = tagName
        else tag.name = '_tag_' + Date.now()

        tag.position.set(position.x, position.y, position.z);
        scene.value!.add(tag)

        tagMap['currentTag'] ? tagMap['currentTag'].push(tag) : tagMap['currentTag'] = [tag]
        tag.layers.set(1);
        return tag
    }
    function removeTag(TagName: string) {
        // const item = scene.value!.getObjectByName(TagName)
        //寻找要删除的CSSObject3D
        let item, keys = Object.keys(tagMap), targetI = 0, targetJ = 0
        for (let i = 0, len = keys.length; i < len; i++) {
            for (let j = 0, len2 = tagMap[keys[i]].length; j < len2; j++) {
                if (tagMap[keys[i]][j].name === TagName) {
                    item = tagMap[keys[i]][j]
                    targetI = i
                    targetJ = j
                }
            }
        }

        if (item) {
            console.log('removeTag ' + TagName, item);
            item.removeFromParent()
            // tagMap['currentTag'] = []
            tagMap[keys[targetI]].splice(targetJ, 1)
        }
    }
    function removeAllTag() {
        let tagArr = Object.values(tagMap).flat()
        tagArr.forEach(item => {
            item.removeFromParent()
        })
        tagMap.currentTag = []
    }
    function updateLabel() {
        let arr = Object.values(tagMap).flat()
        if (arr.length === 0) return
        const cameraPosition = camera.value!.position.clone()
        arr.forEach(node => {
            node.lookAt(cameraPosition)
        })
    }
    /**
     * 
     * @param item 几乎等同于THREE.Object3D
     * @param opacity 透明度
     * @param changeAlone 是否只改变指定object3D的透明度，防止污染同一材质的其他Object，默认为true
     */
    function changeMeshOpacity(item: THREE.Object3D, opacity: number, changeAlone = true) {
        // console.log('changeMeshOpacity', item);
        function scanAndChange(item: THREE.Object3D) {
            if (item instanceof THREE.Mesh) {
                if (Array.isArray(item.material)) {
                    for (let i = 0, len = item.material.length; i < len; i++) {
                        let material = item.material[i];
                        item.material[i] = material.clone() //防止多模型共享材质导致的意外修改
                        item.material[i].alphaTest = opacity    //对于有贴图的材质，设置alphaTest，使材质不透明
                        item.material[i].opacity = opacity
                        if (opacity < 1.0) {  //透明度小于1.0，则关闭深度检测
                            item.material[i].transparent = true;
                            item.material[i].depthTest = false
                            item.material[i].depthWrite = false
                        } else {
                            item.material[i].transparent = false;
                            item.material[i].depthTest = true
                            item.material[i].depthWrite = true
                        }
                        //将透明度为0的模型添加到射线拾取白名单，非0则从白名单取出
                        const index = raycasterWhiteList.value.indexOf(item.name)
                        if (opacity === 0) {
                            if (index === -1) raycasterWhiteList.value.push(item.name)
                        } else {
                            if (index !== -1) raycasterWhiteList.value.splice(index, 1)
                        }
                    }
                } else {
                    let material = item.material;
                    if (!material) {
                        console.warn('scanAndChange material is', material);
                        return
                    }
                    if (changeAlone) item.material = material.clone() //防止多模型共享材质导致的意外修改
                    if (item.material) {
                        item.material.alphaTest = opacity    //对于有贴图的材质，设置alphaTest，使材质不透明
                        item.material.opacity = opacity
                        if (opacity < 1.0) {  //透明度小于1.0，则关闭深度检测
                            item.material.transparent = true;
                            item.material.depthTest = false
                            item.material.depthWrite = false
                        } else {
                            item.material.transparent = false;
                            item.material.depthTest = true
                            item.material.depthWrite = true
                        }
                        //将透明度为0的模型添加到射线拾取白名单，非0则从白名单取出
                        const index = raycasterWhiteList.value.indexOf(item.name)
                        if (opacity === 0) {
                            if (index === -1) raycasterWhiteList.value.push(item.name)
                        } else {
                            if (index !== -1) raycasterWhiteList.value.splice(index, 1)
                        }
                    }
                }
            } else if (item.type === 'Group' && item.children) {
                for (let i = 0, len = item.children.length; i < len; i++) {
                    scanAndChange(item.children[i])
                }
            }
        }

        scanAndChange(item)
    }
    function disposeMeshMaterial(meshMaterial: THREE.Material) {
        if (meshMaterial instanceof THREE.MeshPhysicalMaterial || meshMaterial instanceof THREE.MeshStandardMaterial) {
            if (meshMaterial.map) {
                meshMaterial.map.dispose()
                meshMaterial.map = null
            }
            if (meshMaterial.normalMap) {
                meshMaterial.normalMap.dispose()
                meshMaterial.normalMap = null
            }
            if (meshMaterial.roughnessMap) {
                meshMaterial.roughnessMap.dispose()
                meshMaterial.roughnessMap = null
            }
        }
        meshMaterial.dispose()
    }
    function disposeMesh(mesh: THREE.Mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
            disposeMeshMaterial(mesh.material)
        } else if (mesh.material instanceof Array) {
            mesh.material.forEach(m => {
                disposeMeshMaterial(m)
            })
        }
    }
    function removeObject(name: string, _dispose: boolean = true) {
        let positionArr: MyPostion[] = [], objArr: THREE.Object3D[] = [], parentNameArr: string[] = []
        function scanToRemove(arr: THREE.Object3D[]) {
            for (let i = 0, len = arr.length; i < len; i++) {
                if (!arr[i]) continue
                if (arr[i].name == name) {
                    const center = arr[i].position
                    let position = {
                        x: center.x,
                        y: center.y,
                        z: center.z
                    }
                    positionArr.push(position)
                    const parentName = arr[i].parent?.name ?? ''
                    parentNameArr.push(parentName)

                    if (_dispose) {
                        arr[i].traverse((mesh: THREE.Object3D | THREE.Mesh | THREE.Sprite) => {
                            if (mesh instanceof THREE.Mesh) {
                                disposeMesh(mesh as THREE.Mesh)
                            }
                        })
                    } else {
                        objArr.push(arr[i])
                    }
                    arr[i].removeFromParent()
                    break
                }
                if (arr[i].children && arr[i].children.length > 0) {
                    scanToRemove(arr[i].children)
                }
            }
        }
        scanToRemove(scene.value!.children)
        return {
            objArr, positionArr, parentNameArr
        }
    }
    function replaceObject(gltUrls: importUrlFormat[], name: string, parentName = null) {
        let { positionArr } = removeObject(name)
        console.log('positionArr => ', positionArr);
        let promideQueue: Promise<any>[] = []
        positionArr.forEach(position => {
            promideQueue.push(addModelGroupByUrls(gltUrls, parentName, position))
        })
        return Promise.allSettled(promideQueue)
    }
    function exportImage() {
        const canvas = renderer!.domElement
        return canvas.toDataURL('image/png')
    }
    function showRaining(val: boolean) {
        raining = val
        const isRaining = scene.value!.getObjectByName('rain_instance')
        if (!isRaining && val) {
            addRainDrop()
        }
        if (isRaining && !val) {
            removeObject('rain_instance', true)
        }
    }
    function initWater(waterName: string, params?: WaterShaderParams | InitWaterOptions) {
        const existWater = scene.value!.getObjectByName(waterName)
        if (!existWater) {
            console.log('没有找到水面对应物体--', waterName);
            return
        }
        if (!(existWater instanceof THREE.Mesh)) {
            console.log('水面不是mesh', existWater.name);
            return
        }

        const mesh = existWater as THREE.Mesh
        const parentName = existWater.parent?.name as string

        let defaultParams, water: MyWater
        if (params && params.type === 1) {
            defaultParams = {
                uWaresFrequency: 1.0,
                uScale: 0.06,
                uNoiseFrequency: 2.0,
                uNoiseScale: 0.45,
                uXzScale: 1.5,
                uLowColor: 0x000000,
                uHighColor: 0x95d5ff,
                uOpacity: 0.8,
                uTime: 1 / 36
            }
            const realParams = { ...defaultParams, ...params }

            water = new MyWater(mesh.geometry, realParams)

            const uid = Utils.generateUUID()
            renderMixins!.set(uid, () => {
                (water.material as THREE.ShaderMaterial).uniforms['uTime'].value += realParams.uTime
                // (water.material as THREE.ShaderMaterial).uniforms['time'].value += 1.0 / 360.0   //three.js自带的water
            })
        } else {
            defaultParams = {
                // color:0x7fc3f0
            }
            const realParams = { ...defaultParams, ...params }
            water = new MyWater2(mesh.geometry, realParams)
        }

        water.position.copy(mesh.position)
        water.name = waterName + '_replaced'

        removeObject(waterName)
        let parentObj = scene.value!.getObjectByName(parentName)
        if (parentObj) parentObj.add(water)
        return water
    }
    function initWater2(waterName: string, params?: WaterShaderParams2) {
        const existWater = scene.value!.getObjectByName(waterName)
        if (!existWater) {
            console.log('没有找到水面对应物体--', waterName);
            return
        }
        if (!(existWater instanceof THREE.Mesh)) {
            console.log('水面不是mesh', existWater.name);
            return
        }

        const mesh = existWater as THREE.Mesh
        const options = {
            waterColor: params?.waterColor ?? 0x95d5ff,
            flowSpeed: params?.flowSpeed ?? 1.0 / 60.0,
            alpha: params?.alpha ?? 0.8
        }

        //webgl
        const water = new Water(mesh.geometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('/images/waternormals.jpg', function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            alpha: options.alpha,
            waterColor: options.waterColor,
        })
        const uid = Utils.generateUUID()
        renderMixins!.set(uid, () => {
            water.material.uniforms['time'].value += options.flowSpeed
        })

        //webgpu
        // const loader = new THREE_GPU.TextureLoader();
        // const waterNormals = loader.load('textures/waternormals.jpg');
        // waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
        // const water = new WaterMesh(existWater.geometry, {
        //     waterNormals:waterNormals,
        //     sunDirection: new THREE_GPU.Vector3(),
        //     sunColor: 0xffffff,
        //     alpha: options.alpha,
        //     waterColor: options.waterColor,
        // })

        water.material.transparent = true
        water.position.copy(mesh.position)
        water.name = waterName + '_replaced'

        const parentName = mesh.parent?.name as string
        removeObject(waterName)
        let parentObj = scene.value!.getObjectByName(parentName)
        if (parentObj) parentObj.add(water)

        return water
    }
    function initWaterCube(waterName: string, params?: WaterCubeShaderParams) {
        const existWater = scene.value!.getObjectByName(waterName)
        if (!existWater) {
            console.log('没有找到水面对应物体--', waterName);
            return
        }
        const box3 = new THREE.Box3().setFromObject(existWater)
        const size = new THREE.Vector3();
        box3.getSize(size);

        const parentName = existWater.parent?.name as string
        const width = size.x;
        const height = size.y;
        const depth = size.z

        const geometry = new THREE.BoxGeometry(width, depth, height);

        const defaultParams = params ? params : {
            uLowColor: 0x6a7a81,
            uHighColor: 0x6a7a81,
            uOpacity: .5,
            uRealLevel: height,
            uNeedLevel: height,
            reflectivity: 0.02,
            noiseRatio: 0.446025403784438,
            uOffset: 0.015,
        }

        const water = new MyWaterCube(geometry, defaultParams)
        water.rotation.x = - Math.PI * 0.5;
        water.position.copy(existWater.position)
        water.name = waterName + '_replaced'

        removeObject(waterName)
        let parentObj = scene.value!.getObjectByName(parentName)
        if (parentObj) parentObj.add(water)

        const uid = Utils.generateUUID()
        renderMixins!.set(uid, () => {
            (water.material as THREE.ShaderMaterial).uniforms['iTime'].value += 1.0 / 36.0
        })
        return water

    }
    function addStyleSheet() {
        let style = document.createElement('style');
        document.head.appendChild(style);
        let css = '.no-pointer-events { pointer-events: none !important; }'
        style.sheet?.insertRule(css, 0)
    }
    function focusModel(item: THREE.Object3D, distance: number = 1, type: StressType = stressType) {
        highlightModel(item, type)

        // 沿当前视线前进到距离目标指定单位的位置
        const pos = new THREE.Vector3()
        item.getWorldPosition(pos)
        const unitVector = new THREE.Vector3().subVectors(pos, camera.value!.position).normalize()
        const pos2 = pos.clone().add(unitVector.multiplyScalar(-distance))

        changeCameraFocus(pos2, pos)
    }

    return {
        highlightColor,
        camera,
        eventBus,
        scene,
        renderMixins,
        allowMeasure,
        mixers,
        mixerMap,
        cacheModel,
        points,
        orbitControls,
        isContinue,
        isFirstView,
        raycasterWhiteList,
        centerInitCameraPosition,
        DISTANCE,
        tweenGroup,
        startPointerLockControls,
        exitPointerLockControls,
        listenerAboutPointerLockControlsClick,
        resetCamera,
        addCustomTagByModelname,
        addCustomTagByConfig,
        disposeMesh,
        init,
        resetBg,
        initLight,
        initLoader,
        disabledOrbitControls,
        changeOrbitTarget,
        recoverMaterial,
        highlightModel,
        changeCameraFocus,
        clearScene,
        destroy,
        initWaterCube,
        addTag,
        removeTag,
        removeAllTag,
        clearMeasure,
        changeMeshOpacity,
        addModelGroupByUrls,
        removeObject,
        replaceObject,
        exportImage,
        getCenterFromBounding,
        showRaining,
        removeMixers,
        initWater,
        initWater2,
        focusModel,
        recoverSelect,
        resize
    }
}

export default useThree