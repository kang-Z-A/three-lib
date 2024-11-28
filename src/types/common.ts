import * as THREE from 'three'
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type MyPostion = {
  x: number;
  y: number;
  z: number;
};

export type ManagerBox = {
  [key: string]: THREE.LoadingManager
}

export type MyMixer = {
  update(delta?: number): void;
  _root?: any
};

export enum StressType {
  /**描边模式 */
  STROKE = 'stroke',
  /**网格材质模式 */
  WIREFRAM = 'wireframe',
  /**整体替换材质颜色 */
  COLOR = 'coloring',
  // /**描边+颜色 */
  // COLOR_STROKE = 'coloring&stroke'
}

export type importUrlFormat = {
  url: string;
  /**是否需要缩放,默认不需要 */
  needScale?: boolean;
  /**是否显示,默认不显示 */
  addToScene?: boolean;
  /**xyz缩放比例,默认1.0 */
  scale?: [number, number, number];
}

export type OrbitControlsOptions = Partial<OrbitControls>

export type initOptions = {
  /**canvas容器id,默认three-canvas */
  canvasId?: string,
  /** 初始化场景所需的gltf文件路径 */
  gltfUrls: importUrlFormat[],
  /** 高亮颜色,默认为0x00be55 */
  highlightColor?: number | string,
  /** 高亮模式 */
  stressType?: StressType,
  /** 是否显示默认点击事件弹窗,默认不显示 */
  showDefaultDialog?: boolean,
  /** 默认相机位置 */
  cameraPosition?: MyPostion,
  /** 默认相机目标点 */
  cameraTarget?: MyPostion,
  /** 是否开启第一视角 */
  isFirstView?: boolean,
  /** 是否开启雨点效果,默认关闭 */
  raining?: boolean,
  /** 环境贴图强度,默认为1.0 */
  envMapIntensity?: number,
  /** 是否开启天空盒,默认关闭 */
  showSky?: boolean,
  /** 是否开启背景环绕图片,默认关闭 */
  showBackImage?: boolean,
  /** 背景图路径 */
  backgroundImgPath?: string,
  environmentIntensity?: number,
  /** 是否开启自动根据场景尺寸设置相机,默认关闭 */
  autoSetCamera?: boolean,
  /** 是否需要缩放场景,默认false */
  needScale?: boolean,
  /** 相机自动移动到目标点时的距离,默认为3 */
  // cameraDistance?:number,
  /** 射线拾取白名单,根据name匹配过滤 */
  raycasterWhiteList?: string[],
  /** 是否允许点击和双击事件,默认为true */
  allowClick?: boolean,
  /**是否开启后处理,开启后对性能影响较大 */
  useComposer?: boolean
  /** 需要碰撞检测的物体名单 */
  checkMeshNames?: string[],
  /**背景透明度 */
  backgroundAlpha?: number
  /** 容器宽度 */
  containerWidth?: number,
  /** 容器高度 */
  containerHeight?: number,
  /** 环境光强 */
  ambientItensity?: number,
  /** 需要合并的模型名单，对匹配到的模型遍历children，合并为一个模型 */
  mergeRule?: Function,
  /** 是否允许聚焦所有模型 */
  allowFocusAll?: boolean
  /**是否使用平行光 */
  useDirectLight?: boolean
  /** orbitControls参数 */
  orbitControlsOptions?: OrbitControlsOptions,
  /**是否开启阴影接收 */
  receiveShadow?: boolean,
  /**光源位置 */
  lightPosition?: MyPostion,
  /**阴影偏移 */
  bias?: number
}

// export interface MyObject3D extends THREE.Object3D {
//   // _preMaterial?:THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial |  THREE.MeshPhysicalMaterial[]
//   // material?:THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial |  THREE.MeshPhysicalMaterial[]
//   isMesh?: boolean,
//   isGroup?: boolean,
//   isCamera?: boolean,
//   isLight?: boolean,
// }

export interface MyMesh extends THREE.Mesh {
  _preMaterial?: THREE.Material | THREE.Material[],
}

export type TagMap = {
  [key: string]: MyCSS3DObject[]
}

export type pointConfig = {
  color?: number,
  size?: number
}

export interface MyCSS3DObject extends CSS3DObject {
  name: string
}

export type TagOptions = {
  position: MyPostion,
  scale?: number,
  tagName?: string
}