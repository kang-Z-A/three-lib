/** 碰撞检测插件 */
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

interface CameraContainer extends THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial, THREE.Object3DEventMap> {
    /**是否需要被射线拾取忽略 */
    needIgnore?: boolean
}

interface SphereInfo {
    mesh: THREE.Sphere,
    radius: number
}

export interface HitInfo {
    name: string,
    radius: number
}

export default function useMeshBvh() {
    let cameraSphere: THREE.Mesh, targetMeshArray = [] as THREE.Object3D<THREE.Object3DEventMap>[]
    let isFirstHist = false

    function getBoundsTree(scene: THREE.Scene, targetMeshName: string) {
        const targetMesh = scene.getObjectByName(targetMeshName)
        if (!targetMesh) {
            console.log('getBoundsTree()未找到目标', targetMeshName);
            return
        }

        if (Object.hasOwn(targetMesh, 'isMesh')) {
            const mesh = targetMesh as THREE.Mesh
            mesh.geometry.computeBoundsTree()
            targetMeshArray.push(mesh)
        }
    }

    function addSphereToCamera(scene: THREE.Scene, camera: THREE.Camera) {
        const cameraGroup = new THREE.Group().add(camera)
        cameraGroup.name = 'cameraGroup'

        const shapeMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.1,
            transparent: true,
            opacity: 0,
            premultipliedAlpha: true
        });
        const sphere: CameraContainer = new THREE.Mesh(new THREE.SphereGeometry(1, 50, 50), shapeMaterial);
        sphere.needIgnore = true
        cameraGroup.add(sphere)
        cameraSphere = sphere

        scene.add(cameraGroup)
        console.log('addSphereToCamera', scene)
    }

    function removeCameraSphere(scene: THREE.Scene) {
        const cameraGroup = scene.getObjectByName('cameraGroup')
        if (cameraGroup) {
            cameraGroup.removeFromParent()
            cameraSphere.geometry.dispose()
        }
    }

    function checkHit(hitArray: HitInfo[], camera: THREE.Camera, radiusArr: number[]) {
        if (!cameraSphere || !camera) return

        cameraSphere.position.copy(camera.position)
        if (!isFirstHist) return isFirstHist = true
        for (let i = 0, len = targetMeshArray.length; i < len; i++) {
            const targetMesh = targetMeshArray[i]
            const transformMatrix =
                new THREE.Matrix4()
                    .copy(targetMesh.matrixWorld).invert()
                    .multiply(cameraSphere.matrixWorld);

            const sphereArr = [] as SphereInfo[]
            radiusArr.forEach(radius => {
                const sphere = new THREE.Sphere(undefined, radius);
                sphere.applyMatrix4(transformMatrix);
                sphereArr.push({
                    mesh: sphere,
                    radius: radius
                })
            })

            if (Object.hasOwn(targetMesh, 'isMesh')) {
                const mesh = targetMesh as THREE.Mesh;
                sphereArr.forEach(sphere => {
                    if (mesh.geometry.boundsTree) {
                        const hit = mesh.geometry.boundsTree.intersectsSphere(sphere.mesh);
                        let index = hitArray.findIndex((hitInfo) => mesh.name === hitInfo.name && sphere.radius === hitInfo.radius)
                        if (hit && index === -1) {
                            hitArray.push({
                                name: mesh.name,
                                radius: sphere.radius
                            })
                        } else if (!hit && index !== -1) {
                            hitArray.splice(index, 1)
                        }
                        // (cameraSphere.material as MeshStandardMaterial).color.set(hit ? 0xE91E63 : 0x666666);
                        // (cameraSphere.material as MeshStandardMaterial).emissive.set(0xE91E63).multiplyScalar(hit ? 0.25 : 0);
                    }
                })
            }
        }
        // console.log('hitArray.length', hitArray);
    }

    return {
        getBoundsTree,
        addSphereToCamera,
        removeCameraSphere,
        checkHit
    }
}