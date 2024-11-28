import * as THREE from 'three';
import { Mesh, BufferGeometry, BoxGeometry, Vector3, Line, Points } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Group } from '@tweenjs/tween.js';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { ShallowRef, Ref } from '@vue/reactivity';
import { Water } from 'three/examples/jsm/Addons.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';

/** 碰撞检测插件 */

interface HitInfo {
    name: string;
    radius: number;
}
declare function useMeshBvh(): {
    getBoundsTree: (scene: THREE.Scene, targetMeshName: string) => void;
    addSphereToCamera: (scene: THREE.Scene, camera: THREE.Camera) => void;
    removeCameraSphere: (scene: THREE.Scene) => void;
    checkHit: (hitArray: HitInfo[], camera: THREE.Camera, radiusArr: number[]) => true | undefined;
};

type MyPostion = {
    x: number;
    y: number;
    z: number;
};
type ManagerBox = {
    [key: string]: THREE.LoadingManager;
};
type MyMixer = {
    update(delta?: number): void;
    _root?: any;
};
declare enum StressType {
    /**描边模式 */
    STROKE = "stroke",
    /**网格材质模式 */
    WIREFRAM = "wireframe",
    /**整体替换材质颜色 */
    COLOR = "coloring"
}
type importUrlFormat = {
    url: string;
    /**是否需要缩放,默认不需要 */
    needScale?: boolean;
    /**是否显示,默认不显示 */
    addToScene?: boolean;
    /**xyz缩放比例,默认1.0 */
    scale?: [number, number, number];
};
type OrbitControlsOptions = Partial<OrbitControls>;
type initOptions = {
    /**canvas容器id,默认three-canvas */
    canvasId?: string;
    /** 初始化场景所需的gltf文件路径 */
    gltfUrls: importUrlFormat[];
    /** 高亮颜色,默认为0x00be55 */
    highlightColor?: number | string;
    /** 高亮模式 */
    stressType?: StressType;
    /** 是否显示默认点击事件弹窗,默认不显示 */
    showDefaultDialog?: boolean;
    /** 默认相机位置 */
    cameraPosition?: MyPostion;
    /** 默认相机目标点 */
    cameraTarget?: MyPostion;
    /** 是否开启第一视角 */
    isFirstView?: boolean;
    /** 是否开启雨点效果,默认关闭 */
    raining?: boolean;
    /** 环境贴图强度,默认为1.0 */
    envMapIntensity?: number;
    /** 是否开启天空盒,默认关闭 */
    showSky?: boolean;
    /** 是否开启背景环绕图片,默认关闭 */
    showBackImage?: boolean;
    /** 背景图路径 */
    backgroundImgPath?: string;
    environmentIntensity?: number;
    /** 是否开启自动根据场景尺寸设置相机,默认关闭 */
    autoSetCamera?: boolean;
    /** 是否需要缩放场景,默认false */
    needScale?: boolean;
    /** 相机自动移动到目标点时的距离,默认为3 */
    /** 射线拾取白名单,根据name匹配过滤 */
    raycasterWhiteList?: string[];
    /** 是否允许点击和双击事件,默认为true */
    allowClick?: boolean;
    /**是否开启后处理,开启后对性能影响较大 */
    useComposer?: boolean;
    /** 需要碰撞检测的物体名单 */
    checkMeshNames?: string[];
    /**背景透明度 */
    backgroundAlpha?: number;
    /** 容器宽度 */
    containerWidth?: number;
    /** 容器高度 */
    containerHeight?: number;
    /** 环境光强 */
    ambientItensity?: number;
    /** 需要合并的模型名单，对匹配到的模型遍历children，合并为一个模型 */
    mergeRule?: Function;
    /** 是否允许聚焦所有模型 */
    allowFocusAll?: boolean;
    /**是否使用平行光 */
    useDirectLight?: boolean;
    /** orbitControls参数 */
    orbitControlsOptions?: OrbitControlsOptions;
    /**是否开启阴影接收 */
    receiveShadow?: boolean;
    /**光源位置 */
    lightPosition?: MyPostion;
    /**阴影偏移 */
    bias?: number;
};
interface MyMesh extends THREE.Mesh {
    _preMaterial?: THREE.Material | THREE.Material[];
}
type TagMap = {
    [key: string]: MyCSS3DObject[];
};
type pointConfig = {
    color?: number;
    size?: number;
};
interface MyCSS3DObject extends CSS3DObject {
    name: string;
}
type TagOptions = {
    position: MyPostion;
    scale?: number;
    tagName?: string;
};

interface InitWaterOptions$2 {
    uWaresFrequency?: number;
    uScale?: number;
    uNoiseFrequency?: number;
    uNoiseScale?: number;
    uXzScale?: number;
    uLowColor?: number;
    uHighColor?: number;
    uOpacity?: number;
}
declare class MyWater extends Mesh {
    isWater: boolean;
    constructor(geometry: BufferGeometry, options: InitWaterOptions$2);
}

interface InitWaterOptions$1 {
    color?: number;
    opacity?: number;
    speed?: number;
    scale?: number;
    type: 2;
}

interface InitWaterOptions {
    uLowColor?: number;
    uHighColor?: number;
    uOpacity?: number;
    uRealLevel: number;
    uNeedLevel: number;
    reflectivity?: number;
    noiseRatio?: number;
    uOffset?: number;
}
declare class MyWaterCube extends Mesh {
    isWater: boolean;
    constructor(geometry: BoxGeometry, options: InitWaterOptions);
}

interface WaterShaderParams {
    /**
     * 水面弯曲频率，默认1.0
     */
    uWaresFrequency?: number;
    /**
     * 水面弯曲程度，默认0.06
     */
    uScale?: number;
    /**
     * 噪声波动频率，默认2.0
     */
    uNoiseFrequency?: number;
    /**
     * 噪声波动幅度，默认0.45
     */
    uNoiseScale?: number;
    /**
     * 垂直波纹幅度，默认1.5
     */
    uXzScale?: number;
    /**
     * 低平面水颜色
     */
    uLowColor?: number;
    /**
     * 高平面水颜色
     */
    uHighColor?: number;
    /**
     * 水面透明度，默认0.8
     */
    uOpacity?: number;
    /**
     * 每帧移动频率，默认1/36
     */
    uTime?: number;
    /**
     * 写死，对应根据mesh点实现的水面类型
     */
    type: 1;
}
type WaterShaderParams2 = {
    waterColor?: number;
    flowSpeed?: number;
    alpha?: number;
};
type WaterCubeShaderParams = {
    /**
     * 低平面水颜色
     */
    uLowColor?: number;
    /**
     * 高平面水颜色
     */
    uHighColor?: number;
    /**
     * 水面透明度
     */
    uOpacity?: number;
    /**
     * 水池立方体实际高度
     */
    uRealLevel: number;
    /**
     * 需要的液位高度
     */
    uNeedLevel: number;
    /**
     * 反射系数
     */
    reflectivity?: number;
    /**
     * 水面波纹变化频率
     */
    noiseRatio?: number;
    /**
     * 折射扭曲程度
     */
    uOffset?: number;
};

declare function useThree(): {
    highlightColor: number;
    camera: ShallowRef<THREE.PerspectiveCamera | undefined>;
    eventBus: {
        eventObject: {
            [key: string]: any;
        };
        callbackId: number;
        publish<T extends (...args: any[]) => any>(eventName: string, ...args: Parameters<T>): void;
        subscribe(eventName: string, callback: Function, isOnce?: boolean): {
            unSubscribe: () => void;
        };
        clear(eventName: string): void;
    };
    scene: ShallowRef<THREE.Scene | undefined>;
    renderMixins: Map<any, Function>;
    allowMeasure: Ref<boolean, boolean>;
    mixers: ShallowRef<MyMixer[] | undefined>;
    mixerMap: Map<string, MyMixer>;
    cacheModel: ShallowRef<THREE.Object3D<THREE.Object3DEventMap>[] | THREE.Group<THREE.Object3DEventMap>[] | undefined, THREE.Object3D<THREE.Object3DEventMap>[] | THREE.Group<THREE.Object3DEventMap>[] | undefined>;
    points: THREE.Vector3[];
    orbitControls: ShallowRef<OrbitControls | undefined>;
    isContinue: Ref<boolean, boolean>;
    isFirstView: Ref<boolean, boolean>;
    raycasterWhiteList: Ref<{
        readonly [x: number]: string;
        toString: () => string;
        charAt: (pos: number) => string;
        charCodeAt: (index: number) => number;
        concat: (...strings: string[]) => string;
        indexOf: (searchString: string, position?: number) => number;
        lastIndexOf: (searchString: string, position?: number) => number;
        localeCompare: {
            (that: string): number;
            (that: string, locales?: string | string[], options?: Intl.CollatorOptions): number;
            (that: string, locales?: Intl.LocalesArgument, options?: Intl.CollatorOptions): number;
        };
        match: {
            (regexp: string | RegExp): RegExpMatchArray | null;
            (matcher: {
                [Symbol.match](string: string): RegExpMatchArray | null;
            }): RegExpMatchArray | null;
        };
        replace: {
            (searchValue: string | RegExp, replaceValue: string): string;
            (searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
            (searchValue: {
                [Symbol.replace](string: string, replaceValue: string): string;
            }, replaceValue: string): string;
            (searchValue: {
                [Symbol.replace](string: string, replacer: (substring: string, ...args: any[]) => string): string;
            }, replacer: (substring: string, ...args: any[]) => string): string;
        };
        search: {
            (regexp: string | RegExp): number;
            (searcher: {
                [Symbol.search](string: string): number;
            }): number;
        };
        slice: (start?: number, end?: number) => string;
        split: {
            (separator: string | RegExp, limit?: number): string[];
            (splitter: {
                [Symbol.split](string: string, limit?: number): string[];
            }, limit?: number): string[];
        };
        substring: (start: number, end?: number) => string;
        toLowerCase: () => string;
        toLocaleLowerCase: {
            (locales?: string | string[]): string;
            (locales?: Intl.LocalesArgument): string;
        };
        toUpperCase: () => string;
        toLocaleUpperCase: {
            (locales?: string | string[]): string;
            (locales?: Intl.LocalesArgument): string;
        };
        trim: () => string;
        readonly length: number;
        substr: (from: number, length?: number) => string;
        valueOf: () => string;
        codePointAt: (pos: number) => number | undefined;
        includes: (searchString: string, position?: number) => boolean;
        endsWith: (searchString: string, endPosition?: number) => boolean;
        normalize: {
            (form: "NFC" | "NFD" | "NFKC" | "NFKD"): string;
            (form?: string): string;
        };
        repeat: (count: number) => string;
        startsWith: (searchString: string, position?: number) => boolean;
        anchor: (name: string) => string;
        big: () => string;
        blink: () => string;
        bold: () => string;
        fixed: () => string;
        fontcolor: (color: string) => string;
        fontsize: {
            (size: number): string;
            (size: string): string;
        };
        italics: () => string;
        link: (url: string) => string;
        small: () => string;
        strike: () => string;
        sub: () => string;
        sup: () => string;
        padStart: (maxLength: number, fillString?: string) => string;
        padEnd: (maxLength: number, fillString?: string) => string;
        trimEnd: () => string;
        trimStart: () => string;
        trimLeft: () => string;
        trimRight: () => string;
        matchAll: (regexp: RegExp) => RegExpStringIterator<RegExpExecArray>;
        replaceAll: {
            (searchValue: string | RegExp, replaceValue: string): string;
            (searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
        };
        at: (index: number) => string | undefined;
        [Symbol.iterator]: () => StringIterator<string>;
    }[], String[] | {
        readonly [x: number]: string;
        toString: () => string;
        charAt: (pos: number) => string;
        charCodeAt: (index: number) => number;
        concat: (...strings: string[]) => string;
        indexOf: (searchString: string, position?: number) => number;
        lastIndexOf: (searchString: string, position?: number) => number;
        localeCompare: {
            (that: string): number;
            (that: string, locales?: string | string[], options?: Intl.CollatorOptions): number;
            (that: string, locales?: Intl.LocalesArgument, options?: Intl.CollatorOptions): number;
        };
        match: {
            (regexp: string | RegExp): RegExpMatchArray | null;
            (matcher: {
                [Symbol.match](string: string): RegExpMatchArray | null;
            }): RegExpMatchArray | null;
        };
        replace: {
            (searchValue: string | RegExp, replaceValue: string): string;
            (searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
            (searchValue: {
                [Symbol.replace](string: string, replaceValue: string): string;
            }, replaceValue: string): string;
            (searchValue: {
                [Symbol.replace](string: string, replacer: (substring: string, ...args: any[]) => string): string;
            }, replacer: (substring: string, ...args: any[]) => string): string;
        };
        search: {
            (regexp: string | RegExp): number;
            (searcher: {
                [Symbol.search](string: string): number;
            }): number;
        };
        slice: (start?: number, end?: number) => string;
        split: {
            (separator: string | RegExp, limit?: number): string[];
            (splitter: {
                [Symbol.split](string: string, limit?: number): string[];
            }, limit?: number): string[];
        };
        substring: (start: number, end?: number) => string;
        toLowerCase: () => string;
        toLocaleLowerCase: {
            (locales?: string | string[]): string;
            (locales?: Intl.LocalesArgument): string;
        };
        toUpperCase: () => string;
        toLocaleUpperCase: {
            (locales?: string | string[]): string;
            (locales?: Intl.LocalesArgument): string;
        };
        trim: () => string;
        readonly length: number;
        substr: (from: number, length?: number) => string;
        valueOf: () => string;
        codePointAt: (pos: number) => number | undefined;
        includes: (searchString: string, position?: number) => boolean;
        endsWith: (searchString: string, endPosition?: number) => boolean;
        normalize: {
            (form: "NFC" | "NFD" | "NFKC" | "NFKD"): string;
            (form?: string): string;
        };
        repeat: (count: number) => string;
        startsWith: (searchString: string, position?: number) => boolean;
        anchor: (name: string) => string;
        big: () => string;
        blink: () => string;
        bold: () => string;
        fixed: () => string;
        fontcolor: (color: string) => string;
        fontsize: {
            (size: number): string;
            (size: string): string;
        };
        italics: () => string;
        link: (url: string) => string;
        small: () => string;
        strike: () => string;
        sub: () => string;
        sup: () => string;
        padStart: (maxLength: number, fillString?: string) => string;
        padEnd: (maxLength: number, fillString?: string) => string;
        trimEnd: () => string;
        trimStart: () => string;
        trimLeft: () => string;
        trimRight: () => string;
        matchAll: (regexp: RegExp) => RegExpStringIterator<RegExpExecArray>;
        replaceAll: {
            (searchValue: string | RegExp, replaceValue: string): string;
            (searchValue: string | RegExp, replacer: (substring: string, ...args: any[]) => string): string;
        };
        at: (index: number) => string | undefined;
        [Symbol.iterator]: () => StringIterator<string>;
    }[]>;
    centerInitCameraPosition: THREE.Vector3[];
    DISTANCE: Ref<number, number>;
    tweenGroup: Group;
    startPointerLockControls: () => void;
    exitPointerLockControls: () => void;
    listenerAboutPointerLockControlsClick: (init: boolean) => void;
    resetCamera: () => Promise<void>;
    addCustomTagByModelname: (targetName: string, element: HTMLElement, scale?: number) => MyCSS3DObject | undefined;
    addCustomTagByConfig: (element: HTMLElement, tagOptions: TagOptions) => MyCSS3DObject;
    disposeMesh: (mesh: THREE.Mesh) => void;
    init: (options: initOptions) => void;
    resetBg: (isNull: boolean, clearBgLight?: boolean) => void;
    initLight: () => void;
    initLoader: (gltfUrls: importUrlFormat[], showDefaultDialog?: boolean) => Promise<void>;
    disabledOrbitControls: (disabled: boolean) => void;
    changeOrbitTarget: (x: number, y: number, z: number) => void;
    recoverMaterial: (object: THREE.Object3D | undefined, includeOutline?: boolean) => void;
    highlightModel: (model: THREE.Object3D, stressType?: StressType, highlightColor?: string) => void;
    changeCameraFocus: (cameraPosition: MyPostion, cameraTarget: MyPostion, useTween?: boolean) => Promise<unknown>;
    clearScene: () => void;
    destroy: () => void;
    initWaterCube: (waterName: string, params?: WaterCubeShaderParams) => MyWaterCube | undefined;
    addTag: (TagName: string, content: string, scale?: number, customStyle?: string) => void;
    removeTag: (TagName: string) => void;
    removeAllTag: () => void;
    clearMeasure: () => void;
    changeMeshOpacity: (item: THREE.Object3D, opacity: number, changeAlone?: boolean) => void;
    addModelGroupByUrls: (gltfUrls: importUrlFormat[], parentName?: string | null, position?: MyPostion | null) => Promise<void>;
    removeObject: (name: string, _dispose?: boolean) => {
        objArr: THREE.Object3D<THREE.Object3DEventMap>[];
        positionArr: MyPostion[];
        parentNameArr: string[];
    };
    replaceObject: (gltUrls: importUrlFormat[], name: string, parentName?: null) => Promise<PromiseSettledResult<any>[]>;
    exportImage: () => string;
    getCenterFromBounding: () => void;
    showRaining: (val: boolean) => void;
    removeMixers: (rootNames: string[]) => void;
    initWater: (waterName: string, params?: WaterShaderParams | InitWaterOptions$1) => MyWater | undefined;
    initWater2: (waterName: string, params?: WaterShaderParams2) => Water | undefined;
    focusModel: (item: THREE.Object3D, distance?: number, type?: StressType) => void;
    recoverSelect: () => void;
    resize: () => void;
};

interface MyPathOptions {
    /**行走速度，默认0.005 */
    speed?: number;
    /**转向速度，默认0.05 */
    turnSpeedFactor?: number;
}
interface customObj {
    position: Vector3;
    direction: Vector3;
    turn: boolean;
    preUp: Vector3;
    rotateData: [number, number, number, number];
    preRotate: [number, number, number, number];
}
declare class myPath {
    pointsArr: Vector3[];
    line: Line | Line2;
    points: Points;
    pointPercentArr: number[];
    originUp: Vector3;
    preUp: Vector3;
    loop: boolean;
    perce: number;
    speed: number;
    turnSpeedFactor: number;
    alreadyRotate: number;
    obj: customObj | null;
    preTime: number;
    firstTurn: boolean;
    preRotate: [number, number, number, number];
    constructor(array: number[], options?: MyPathOptions);
    getPoint(percent: number): {
        position: Vector3;
        direction: Vector3;
        turn: boolean;
        preUp: Vector3;
        rotateData: [number, number, number, number];
        preRotate: [number, number, number, number];
    };
    run(animata: boolean, camera: any, end: boolean): void;
}

export { type HitInfo, type ManagerBox, type MyCSS3DObject, type MyMesh, type MyMixer, type MyPostion, type OrbitControlsOptions, StressType, type TagMap, type TagOptions, type importUrlFormat, type initOptions, myPath, type pointConfig, useMeshBvh, useThree };
