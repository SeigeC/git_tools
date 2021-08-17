import log from "./log";

export async function which(cmd: string) {
    await $`which ${cmd}`.catch(() => {
        log.Error(`找不到 ${cmd}`)
    })
    return true
}


