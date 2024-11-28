export default class PercentInterceptor {
    private percentMap: Map<string, number>
    public percentMapProxy: Map<string, number>

    constructor(callback:Function) {
        this.percentMap = new Map()
        this.percentMapProxy = new Proxy(this.percentMap, {
            get(target, property, _receiver) {
                if (property === 'set') {
                    // console.log('Intercepted set percentMap proxy');
                    // eventBus.publish('percentMapChange', target)
                    queueMicrotask(() => {
                        handlerPercent(target)
                    })
                    return function (key: any, value: any) {
                        return Reflect.apply(target[property], target, [key, value])
                    }
                }
                if (property === 'clear') {
                    // console.log('Intercepted clear method on percentMap');
                    // eventBus.publish('percentMapClear')
                    return function (key: any, value: any) {
                        return Reflect.apply(target[property], target, [key, value])
                    }
                }
            },
        })

        function handlerPercent(target: Map<string, number>) {
            // console.log('handlerPercent ', target)
            let percent = 0
            const iterator = target.values()
            let next = iterator.next()
            while (!next.done) {
                percent += next.value
                next = iterator.next()
            }
            let num = Math.floor(percent / target.size)
            const realPercent = isNaN(num) ? 0 : num
        
            console.log('handlerPercent computed',target, realPercent);
            return callback(realPercent)
        }
    }
}