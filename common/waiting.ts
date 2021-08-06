
export function waiting(str?: string) {
    const chart = '|/-\\'
    let index = 0
    // 一帧能玩，两帧流畅，三帧电竞
    const timer = setInterval(() => {
        index = ++index % chart.length
        process.stdout.write(`\r${str??''}${chart[index]}`)
        // process.stdout.write(`\r${str}${chart[index]}`)
    }, 300)
    return () => {
        clearInterval(timer)
        process.stdout.clearLine(1);
    }
}

export async function waitingFunc<T>(func: () => T, waiting_message?: string) {
    const clear = waiting(waiting_message)
    const res = await func()
    clear()
    return res
}
