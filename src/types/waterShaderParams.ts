export interface WaterShaderParams {
    /**
     * 水面弯曲频率，默认1.0
     */
    uWaresFrequency?: number,
    /**
     * 水面弯曲程度，默认0.06
     */
    uScale?: number,
    /**
     * 噪声波动频率，默认2.0
     */
    uNoiseFrequency?: number,
    /**
     * 噪声波动幅度，默认0.45
     */
    uNoiseScale?: number,
    /**
     * 垂直波纹幅度，默认1.5
     */
    uXzScale?: number,
    /**
     * 低平面水颜色
     */
    uLowColor?: number,
    /**
     * 高平面水颜色
     */
    uHighColor?: number,
    /**
     * 水面透明度，默认0.8
     */
    uOpacity?: number,
    /**
     * 每帧移动频率，默认1/36
     */
    uTime?:number,
    /**
     * 写死，对应根据mesh点实现的水面类型
     */
    type:1
}
export type WaterShaderParams2 = {
    waterColor?: number,
    flowSpeed?: number,
    alpha?:number,
}

export type WaterCubeShaderParams = {
    /**
     * 低平面水颜色
     */
    uLowColor?: number,
    /**
     * 高平面水颜色
     */
    uHighColor?: number,
    /**
     * 水面透明度
     */
    uOpacity?: number,
    /**
     * 水池立方体实际高度
     */
    uRealLevel:number,
    /**
     * 需要的液位高度
     */
    uNeedLevel:number,
    /**
     * 反射系数
     */
    reflectivity?:number,
    /**
     * 水面波纹变化频率
     */
    noiseRatio?:number,
    /**
     * 折射扭曲程度
     */
    uOffset?:number,
}

export type WaterInitInfo = {
    waterList:string[],
    waterShaderParams: WaterShaderParams
}