import { readdirSync } from 'fs';
import prompts from 'prompts';
import json from './swimlane/swimlane.json'
const { name, ip } = json
import path from 'path';
const __dirname = path.resolve();

const filepath = `${__dirname}/func/swimlane`
export const description = '上泳道'
export default async function ssh(img?: string) {
    const list = readdirSync(filepath).filter(file => file.endsWith(".yml"))
    let project = (await prompts({
        type: 'select',
        name: 'value',
        message: '请选择要构建的项目',
        choices: list.map(item => ({
            title: item, value: item
        })),
        initial: 0
    })).value as string

    const nameSpace = (await prompts({
        type: 'text',
        name: 'value',
        message: '请输入泳道名称',
        initial: name
    })).value as string
    if (!img) {
        img = (await prompts({
            type: 'text',
            name: 'value',
            message: '请输入镜像名',
        })).value
    }
    const pods = await getPodsMap(nameSpace)
    const path = `${filepath}/${project}`

    const str = await getYml(nameSpace, img, path)
    await updatedK8s(str, project)
    // const created_pod_key = Array.from((await getPodsMap(nameSpace)).keys()).find(item => !pods.has(item))
    do {
        await sleep(1000)
    } while (pods.size !== (await getPodsMap(nameSpace)).size)
    console.log(chalk.green("更新完成"));
}

async function getPodsMap(nameSpace: string) {
    const pods = await $`ssh ${name}@${ip} "kubectl get pod -n ${nameSpace} -o jsonpath='{range .items[*]}{.metadata.name}{\\\"\\t\\\"}{.status.phase}{\\\"\\n\\\"}{end}'"`
    return unmarshal_pod(pods.stdout)
}

function unmarshal_pod(str: string) {
    const map = new Map<string,string>()
    str.trim().split("\n").forEach(item => {
        const [name, status] = item.split("\t")
        map.set(name, status)
    });
    return map
}

async function getYml(nameSpace: string, img: string, path: string) {
    const str = await $`namespace=${nameSpace};img=${img}; eval "cat <<EOF\n$(< ${path})\nEOF"`
    return str.stdout
}

async function updatedK8s(str: string, project: string) {
    await $`ssh ${name}@${ip} "printf ${str} > ~/${project}; kubectl apply  -f ~/${project}"`
}