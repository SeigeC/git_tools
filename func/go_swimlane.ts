import build from './build.js'
import swimlane from './swimlane.js'
import prompts from 'prompts'
import store from "../common/store.js";

const {name} = store.ssh

export const description = '自动构建并上泳道'
export default async function GoSwimlane() {
    const name_space = (await prompts({
        type: 'text',
        name: 'value',
        message: '请输入泳道名称',
        initial: name
    })).value
    const project = (await prompts({
        type: 'select',
        name: 'value',
        message: '请选择要构建的项目',
        choices: store.swimlane.map(item => ({
            title: item, value: item
        })),
        initial: 0
    })).value
    const img = await build()
    await swimlane({img, name_space, project})
}

