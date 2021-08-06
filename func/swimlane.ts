import { readdirSync,readFileSync } from 'fs';
import { waitingFunc } from '../common/waiting.js'
import log from '../common/log.js';
import prompts from 'prompts';
import json from './swimlane/swimlane.json'
const { name, ip } = json
import path from 'path';
const __dirname = path.resolve();

const filepath = `${__dirname}/func/swimlane`
export const description = '上泳道'

interface params {
    img?: string
    name_space?: string
    project?: string
}

export default async function ssh({ img, name_space, project }: params = {}) {
    const list = readdirSync(filepath).filter(file => file.endsWith(".yml"))
    project = project ?? (await prompts({
        type: 'select',
        name: 'value',
        message: '请选择要构建的项目',
        choices: list.map(item => ({
            title: item, value: item
        })),
        initial: 0
    })).value
    name_space = name_space ?? (await prompts({
        type: 'text',
        name: 'value',
        message: '请输入泳道名称',
        initial: name
    })).value

    img = img ?? (await prompts({
        type: 'text',
        name: 'value',
        message: '请输入镜像名',
    })).value

    const pods = await getPodsMap(name_space)
    const path = `${filepath}/${project}`

    const str = await getYml(name_space, img, path)
    await updatedK8s(str, project)
    await waitingFunc(async function () {
        for (; ;) {
            await sleep(1000)
            const created_pod_key = Array.from((await getPodsMap(name_space)).keys()).find(item => !pods.has(item))
            const map = await getPodsMap(name_space)
            const item = map.get(created_pod_key)
            if (!item) {
                console.log(created_pod_key, map, item);
                return log.Error("找不到更新的容器，请确认")
            }
            if (item.STATUS !== "Running" && item.STATUS !== "ContainerCreating") {
                console.log(created_pod_key, map, item);
                return log.Error("更新异常")
            }
            if (item.READY.now === item.READY.want) {
                return log.Success(`更新完成, 更新时间：${item.AGE}`)
            }
        }
    }, '更新泳道')
}

async function getPodsMap(nameSpace: string) {
    const pods = await $`ssh ${name}@${ip} "kubectl get pod -n ${nameSpace}"`
    return unmarshal_pod(pods.stdout)
}

interface pod {
    NAME: string
    READY: { now: number, want: number }
    STATUS: 'Running' | 'ContainerCreating' | 'Terminating'
    RESTARTS: number
    AGE: string
}

function unmarshal_pod(str: string) {
    const map = new Map<string, pod>()
    const list = str.trim().split("\n")
    if (list.length <= 1) {
        return map
    }
    const keys = list.shift().trim().split(" ").filter(item => item)
    list.forEach(item => {
        const obj = {} as pod
        const res = item.trim().split(" ").filter(item => item)
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (key === "READY") {
                const [now, want] = res[i].split('/')
                obj[key] = { now: parseInt(now), want: parseInt(want) }
            } else {
                obj[key] = res[i]
            }
        }
        map.set(obj.NAME, obj)
    });
    return map
}

async function getYml(nameSpace: string, img: string, path: string) {
    const res= readFileSync(path,'utf-8')
    const str = await $`namespace=${nameSpace};img=${img}; eval "echo ${res}"`
    return str.stdout.replaceAll('"', "'")
}

async function updatedK8s(str: string, project: string) {
    await $`ssh ${name}@${ip} "printf ${str} > ~/${project}; kubectl apply  -f ~/${project}"`
}