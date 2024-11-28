import {
    Vector3,
    Line,
    Points,
    Color,
    BufferGeometry,
    Float32BufferAttribute,
    PointsMaterial
} from "three";
//解决线宽无法配置
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

interface MyPathOptions{
    /**行走速度，默认0.005 */
    speed?:number,
    /**转向速度，默认0.05 */
    turnSpeedFactor?:number
}

interface customObj{
    position:Vector3,
    direction: Vector3,

    turn:boolean, //是否需要转向
    preUp:Vector3, //当需要转向时的上次的方向
    rotateData:[number, number, number, number], //模型沿y轴旋转角度
    preRotate:[number, number, number, number]
}

function getRotationAxisAndAngle(a: [number, number, number], b: [number, number, number]):[number, number, number, number] {
    // 计算旋转轴
    const rotationAxis = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];

    // 计算旋转角度
    const dotProduct = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const magnitudeA = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    const magnitudeB = Math.sqrt(b[0] * b[0] + b[1] * b[1] + b[2] * b[2]);
    const rotationAngle = Math.acos(dotProduct / (magnitudeA * magnitudeB));

    // 考虑旋转方向
    if ((rotationAxis[0] * a[0] + rotationAxis[1] * a[1] + rotationAxis[2] * a[2]) < 0) {
        return [-rotationAxis[0], -rotationAxis[1], -rotationAxis[2], -rotationAngle];
    } else {
        return [rotationAxis[0], rotationAxis[1], rotationAxis[2], rotationAngle];
    }
}

//自定义路径类
export default class myPath {
    pointsArr: Vector3[];
    line: Line | Line2 = new Line();
    points: Points  = new Points();
    pointPercentArr: number[] = [];
    originUp: Vector3;
    preUp: Vector3;
    loop: boolean;
    perce: number;
    speed: number;
    turnSpeedFactor: number;
    alreadyRotate: number;
    obj: customObj | null = null;
    preTime: number;
    firstTurn: boolean;
    preRotate: [number, number, number, number];

    constructor(array: number[], options:MyPathOptions = {}) {

        //将传进来的数组转换为Vec3集合
        let pointsArr = [];
        if (array.length % 3 !== 0) {
            throw new Error('错误，数据的个数非3的整数倍！');
        }
        for (let index = 0; index < array.length; index += 3) {
            pointsArr.push(new Vector3(array[index], array[index + 1], array[index + 2]));
        }

        //顶点位置三维向量数组
        this.pointsArr = pointsArr;

        //折线几何体
        {
            /* 旧的线段，无法调节线宽
            let lineMaterial = new LineBasicMaterial({
                color: 0xff00ff
            });
            let lineGeometry = new BufferGeometry().setFromPoints(pointsArr);
            this.line = new Line(lineGeometry, lineMaterial);
            this.line.name = 'CharacterLine' */

            //新的 线
            let positions = pointsArr.map(item => [item.x, item.y, item.z]).flat()
            const lineColor = new Color(0xf9f8ed)
            let colors = pointsArr.map(_item => [lineColor.r, lineColor.g, lineColor.b]).flat()
            const geometry = new LineGeometry();
            geometry.setPositions( positions );
            geometry.setColors( colors );

            const matLine = new LineMaterial( {
                color: 0x00d0dd,
                linewidth: 4, // in world units with size attenuation, pixels otherwise
                vertexColors: false,
    
                //resolution:  // to be set by renderer, eventually
                dashed: false,
                alphaToCoverage: true,
            } );
            matLine.resolution.set(window.innerWidth, window.innerHeight)
            //创建线对象
            this.line = new Line2(geometry, matLine)
            this.line.name = 'CharacterLine'
        }


        //锚点几何体
        {
            let pointsBufferGeometry = new BufferGeometry();
            pointsBufferGeometry.setAttribute('position', new Float32BufferAttribute(array, 3));
            let pointsMaterial = new PointsMaterial({ color: 0xffff00, size: 10 });
            this.points = new Points(pointsBufferGeometry, pointsMaterial);
        }


        //计算每个锚点在整条折线上所占的百分比
        {
            let distanceArr = []; //每段距离
            let sumDistance = 0;  //总距离
            for (let index = 0; index < pointsArr.length - 1; index++) {
                distanceArr.push(pointsArr[index].distanceTo(pointsArr[index + 1]));
            }
            sumDistance = distanceArr.reduce(function (tmp, item) {
                return tmp + item;
            })


            let disPerSumArr = [0];
            disPerSumArr.push(distanceArr[0]);
            distanceArr.reduce(function (tmp, item) {
                disPerSumArr.push(tmp + item);
                return tmp + item;
            })

            disPerSumArr.forEach((value, index) => {
                disPerSumArr[index] = value / sumDistance;
            })
            this.pointPercentArr = disPerSumArr;
        }
        // console.log(this.pointPercentArr);


        //上一次的朝向

        // this.preUp = new Vector3(0, 0, 0);
        this.originUp = this.preUp = new Vector3().subVectors(this.pointsArr[1], this.pointsArr[0]);
        this.loop = true


        //run函数需要的数据
        this.perce = 0; //控制当前位置占整条线百分比
        this.speed = options.speed ? options.speed : 0.0005;  //控制是否运动
        this.turnSpeedFactor = options.turnSpeedFactor ? options.turnSpeedFactor : 0.05;  //转向速度因子
        this.alreadyRotate = 0;  //已经转向的角度

        this.preTime = new Date().getTime();
        this.firstTurn = false;

        this.preRotate = [0, 0, 0, 0]
    }

    //获取点，是否转弯，朝向等
    getPoint(percent:number) {

        let indexPre = 0;
        let indexNext = 0;
        let turn = false;
        let rotateData:[number, number, number, number] = [0, 0, 0, 0]
        const pointLen = this.pointPercentArr.length

        for (let i = 0; i < pointLen; i++) {
            if (percent >= this.pointPercentArr[i] && percent < this.pointPercentArr[i + 1]) {
                indexNext = i + 1;
                indexPre = i;
            }
            if (percent !== 0 && percent === this.pointPercentArr[i]) {
                turn = true;
            }
        }

        let factor = (percent - this.pointPercentArr[indexPre]) / (this.pointPercentArr[indexNext] - this.pointPercentArr[indexPre]);
        let position = new Vector3();
        position.lerpVectors(this.pointsArr[indexPre], this.pointsArr[indexNext], factor);

        //计算朝向
        let up = new Vector3().subVectors(this.pointsArr[indexNext], this.pointsArr[indexPre]);
        up.setY(0)  //限制在XOZ平面旋转
        let nextup = null
        //如果存在下个转角，记录下个转角应旋转的角度
        if (indexNext + 1 < this.pointsArr.length) {
            nextup = new Vector3(0, 0, 0).subVectors(this.pointsArr[indexNext + 1], this.pointsArr[indexNext]);
            nextup.setY(0)  //限制在XOZ平面旋转
            //Mycode
            rotateData = getRotationAxisAndAngle([up.x, up.y, up.z], [nextup.x, nextup.y, nextup.z])
        }
        const realUp = new Vector3(0, 1, 0)   //模型朝向为脚底到头顶，所以朝向应为指向世界坐标y轴向上

        let preUp = this.preUp;
        let preRotate = this.preRotate;
        if (this.preUp.x != up.x || this.preUp.y != up.y || this.preUp.z != up.z) {
            console.log('当前朝向与上次朝向不等，将turn置为true！', up, this.preUp);
            turn = true;
        }

        this.preUp = up;
        this.preRotate = rotateData;

        return {
            position,
            direction: realUp,

            turn, //是否需要转向
            preUp, //当需要转向时的上次的方向
            rotateData, //模型沿y轴旋转角度
            preRotate

        };

    }


    //参数：是否运动，运动的对象，是否运动到结尾
    run(animata:boolean, camera:any, end:boolean) {

        if (end) {

            this.perce = 0.99999;
            this.obj = this.getPoint(this.perce);

            //修改位置
            let posi = this.obj.position;

            camera.position.set(posi.x, posi.y, posi.z); //相机漫游2
        }

        else if (animata) {
            if (this.perce >= 1.0 && this.loop) {
                this.perce = 0
                this.preUp = this.originUp
            }

            //转弯时（线性过渡版）
            if (this.obj && this.obj.turn) {
                //逐渐修改朝向

                console.log('alreadyRotate', (this.obj.preRotate[3] / 180 * Math.PI), this.alreadyRotate);
                let rotateAxis = new Vector3(this.obj.preRotate[0], this.obj.preRotate[2], this.obj.preRotate[1]).normalize()
                if (this.alreadyRotate + this.turnSpeedFactor > this.obj.preRotate[3]) {
                // if (this.alreadyRotate + this.turnSpeedFactor > (this.obj.preRotate[3] / 180 * Math.PI)) {
                    camera.rotateOnAxis(rotateAxis, this.obj.preRotate[3] - this.alreadyRotate)
                    this.alreadyRotate = 0;
                    this.perce += this.speed;
                    this.obj = this.getPoint(this.perce);
                } else {
                    camera.rotateOnAxis(rotateAxis, this.turnSpeedFactor)
                    this.alreadyRotate += this.turnSpeedFactor;
                }
            }

            //非转弯时
            else {

                this.obj = this.getPoint(this.perce);

                //修改位置
                let posi = this.obj.position;

                camera.position.set(posi.x, posi.y, posi.z); //相机漫游2

                this.perce += this.speed;

            }
        }


    }
}
