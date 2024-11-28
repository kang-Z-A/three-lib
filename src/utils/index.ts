import {
    Mesh,
    MeshPhysicalMaterial,
    MeshStandardMaterial,
    Group
} from 'three'
import mergeMeshs from './mergeMesh';

function handleMaterial(material: MeshPhysicalMaterial | MeshStandardMaterial, envMapIntensity: number) {
    material.envMapIntensity = envMapIntensity;
    //通过关闭顶点颜色解决模型的黑块问题
    material.vertexColors = false   //是否使用顶点着色。默认值为false。 此引擎支持RGB或者RGBA两种顶点颜色，取决于缓冲 attribute 使用的是三分量（RGB）还是四分量（RGBA）
    //解决渲染材质不受环境光影响，原因是three.js创建材质默认材质的金属度(metalness)为0
    // material.metalness = 0.5
    if (!material.metalness || material.metalness === 0 || material.metalness === 1) material.metalness = 0.5
}

function suffixTraverse(scene: Group, envMapIntensity: number, mergeRule: Function, receiveShadow: boolean) {
    scene.traverse(obj => {
        if (obj instanceof Mesh) {
            const mesh = obj as Mesh
            mesh.castShadow = true
            mesh.receiveShadow = receiveShadow ?? true

            if (mesh.material instanceof MeshPhysicalMaterial || mesh.material instanceof MeshStandardMaterial) {
                handleMaterial(mesh.material, envMapIntensity)
            } else if (mesh.material instanceof Array) {
                (mesh.material as MeshPhysicalMaterial[]).forEach(material => {
                    handleMaterial(material, envMapIntensity)
                })
            }

        } else if (obj.children) {
            //合并模型
            if (obj.name.startsWith('设备_')) {
                const equipName = obj.name.slice(3)
                obj.children.forEach(child => {
                    if (child instanceof Group) {
                        mergeMeshs(child, equipName)
                    }
                })
            }
            if (mergeRule(obj.name)) {
                console.log('合并模型', obj.name);
                mergeMeshs(obj, 'merged_' + obj.name)
            }
        }
    })
}

// 渐进式加载进度
//微任务模式执行最新回调
let currentPercent = 0, newEnd = 0
function slowlyGenerate(end: number, cb: Function) {
    if (end > newEnd) newEnd = end

    let step = () => {
        if (newEnd === 100) {
            queueMicrotask(() => {
                currentPercent = 100
            })
            window.cancelAnimationFrame(interval)
        }
        if (currentPercent < 100) currentPercent++
        console.log('cb', cb.toString(), currentPercent);
        cb(currentPercent)
        if (currentPercent >= newEnd) {
            window.cancelAnimationFrame(interval)
        }
    }
    let interval = requestAnimationFrame(step)
}

type CallbackInfo = {
    cb: Function,
    end: number
}
//宏任务模式执行回调，在进度条没到100前，按百分比执行最近区间的回调，到100后直接执行100回调
let isGenerating = false, cbQuery: CallbackInfo[] = []
function slowlyGenerate2(end: number, cb: Function) {
    if (end > newEnd) newEnd = end
    cbQuery.push({
        end: end,
        cb: cb
    })
    console.log('newEnd', end, newEnd, currentPercent);
    if (!isGenerating && currentPercent !== 100) {
        function intervalFunc() {
            //100则直接到终点
            if (newEnd === 100) currentPercent = 100
            if (currentPercent < 100 && currentPercent < newEnd) currentPercent++
            // console.log('cb', cb.toString(), currentPercent, cbQuery);
            for (let i = 0, len = cbQuery.length; i < len; i++) {
                if (currentPercent <= cbQuery[i].end) {
                    console.log('currentPercent', currentPercent);
                    cbQuery[i].cb(currentPercent)
                    break;  // 只执行里大于当前百分比且最近的回调
                }
            }
            // cb(currentPercent)
            //大于等于当前指定的终点时，中断定时器
            if (currentPercent >= newEnd) {
                interval && window.clearInterval(interval)
                isGenerating = false
            }
        }
        let interval = window.setInterval(intervalFunc, 60);
        console.log('currentPercent', currentPercent);
        isGenerating = true     //保证只有一个定时器
    }
}

function resetProgress() {
    currentPercent = 0
    newEnd = 0
    isGenerating = false
    cbQuery = []
}

const _lut = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff'];
//copied from three.cjs 0.160
// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
function generateUUID() {

    const d0 = Math.random() * 0xffffffff | 0;
    const d1 = Math.random() * 0xffffffff | 0;
    const d2 = Math.random() * 0xffffffff | 0;
    const d3 = Math.random() * 0xffffffff | 0;
    const uuid = _lut[d0 & 0xff] + _lut[d0 >> 8 & 0xff] + _lut[d0 >> 16 & 0xff] + _lut[d0 >> 24 & 0xff] + '-' +
        _lut[d1 & 0xff] + _lut[d1 >> 8 & 0xff] + '-' + _lut[d1 >> 16 & 0x0f | 0x40] + _lut[d1 >> 24 & 0xff] + '-' +
        _lut[d2 & 0x3f | 0x80] + _lut[d2 >> 8 & 0xff] + '-' + _lut[d2 >> 16 & 0xff] + _lut[d2 >> 24 & 0xff] +
        _lut[d3 & 0xff] + _lut[d3 >> 8 & 0xff] + _lut[d3 >> 16 & 0xff] + _lut[d3 >> 24 & 0xff];

    // .toLowerCase() here flattens concatenated strings to save heap memory space.
    return uuid.toLowerCase();
}

export default {
    slowlyGenerate, slowlyGenerate2, resetProgress, generateUUID, suffixTraverse
}