//RainDrop.js
import {
  BufferGeometry,
  Points,
  PointsMaterial,
  TextureLoader,
  AdditiveBlending,
  Float32BufferAttribute
} from 'three'
export default class RainDrop {
  public drops:number
  public geom:BufferGeometry
  public velocityY:Array<number>
  public instance:Points

  constructor() {
    const texture = new TextureLoader().load('images/蓝色水滴雨滴.png')
    const material = new PointsMaterial({    //用图片初始化顶点材质
      size: 2,
      map: texture,
      transparent: true,
      blending: AdditiveBlending,
      depthTest: false
    })

    const positions:number[] = []

    this.drops = 8000
    this.geom = new BufferGeometry()
    this.velocityY = []

    // const positions = new Float32Array(this.drops * 3)
    // const velocities = new Float32Array(this.drops * 3)

    for (let i = 0; i < this.drops; i++) {
      positions.push(Math.random() * 400 - 200)
      positions.push(Math.random() * 500 - 250)
      positions.push(Math.random() * 400 - 200)
      this.velocityY.push(0.5 + Math.random() / 2)  //初始化每个粒子的坐标和粒子在Y方向的速度
    }

    //确定各个顶点的位置坐标
    this.geom.setAttribute('position', new Float32BufferAttribute(positions, 3))
    this.instance = new Points(this.geom, material)  //初始化粒子系统
    this.instance.name = 'rain_instance'
  }

  animate() {
    const positions = this.geom.attributes.position.array;

    for (let i = 0; i < this.drops * 3; i += 3) {    //改变Y坐标，加速运动
      this.velocityY[i / 3] += Math.random() * 0.005
      positions[i + 1] -= this.velocityY[i / 3]
      if (positions[i + 1] < -200) {
        positions[i + 1] = 200
        this.velocityY[i / 3] = 0.5 + Math.random() / 2
      }
    }
    this.instance.rotation.y += 0.002
    this.geom.attributes.position.needsUpdate = true
  }
}
