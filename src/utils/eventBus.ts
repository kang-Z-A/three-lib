type MyObject = {
    [key: string]: any
}

type noop = (...args: any[]) => any

class EventBus {
    public eventObject: MyObject
    public callbackId: number

    constructor() {
        this.eventObject = {}
        this.callbackId = 0
    }


    publish<T extends noop>(eventName:string, ...args:Parameters<T>) {
        const callbackObject = this.eventObject[eventName]
        if (!callbackObject) {
            console.log('callbackObject not found!');
            return
        }

        for (let id in callbackObject) {
            callbackObject[id](...args)
            if (id[0] === 'd') delete this.eventObject[eventName][id]
        }
    }

    subscribe(eventName:string, callback:Function, isOnce:boolean = false) {
        if (!this.eventObject[eventName]) this.eventObject[eventName] = {}

        let id
        if (isOnce) id = 'd' + this.callbackId++
        else id = this.callbackId++

        this.eventObject[eventName][id] = callback

        const unSubscribe = () => {
            delete this.eventObject[eventName][id]
            if (Object.keys(this.eventObject[eventName]).length === 0) delete this.eventObject[eventName]
        }

        return { unSubscribe }
    }

    clear(eventName:string) {
        if (eventName) delete this.eventObject[eventName]
        else this.eventObject = {}
    }
}

class MyEventBus {
    constructor() { }

    private myEventBus:EventBus | null = null

    getEventBus() {
        if (this.myEventBus) return this.myEventBus
        else return this.myEventBus = new EventBus()
    }
}


export default MyEventBus