import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
    Mesh,
    MeshPhysicalMaterial,
    Object3D,
    BufferGeometry
} from 'three';

/**
 * 合并模型
 * @param parent 父级对象，合并其下children
 * @param meshName 合并后的模型名称
 */
export default function mergeMeshs(parent:Object3D, meshName:string){
    let geometryArray:BufferGeometry[] = []; // 将你的要合并的多个geometry放入到该数组
    let materialArray:MeshPhysicalMaterial[] = []; // 将你的要赋值的多个material放入到该数组

    for(let i = parent.children.length - 1; i >= 0; i--){
        const child = parent.children[i]
        if(child instanceof Mesh){
            const geo = child.geometry.clone();
            const mat = child.material.clone() as MeshPhysicalMaterial;
            geometryArray.push(geo);
            materialArray.push(mat);
            
            child.removeFromParent()
            child.geometry.dispose()
            child.material.dispose()
        }
    }

    // 合并模型
    const mergedGeometries = BufferGeometryUtils.mergeGeometries(geometryArray, true);
    const singleMergeMesh = new Mesh(mergedGeometries, materialArray);
    singleMergeMesh.name = meshName;

    parent.add( singleMergeMesh ); // 在场景中添加合并后的mesh(模型)
    // console.log('singleMergeMesh', parent);
}

