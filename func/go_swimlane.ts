import build from './build.js'
import swimlane from './swimlane.js'
import prompts from 'prompts'

import json from './swimlane/swimlane.json'
const { name } = json

export const description = '自动构建并上泳道'
export default async function GoSwimlane() {
    const img = await build()
    const name_space = (await prompts({
        type: 'text',
        name: 'value',
        message: '请输入泳道名称',
        initial: name
    })).value
    await swimlane({ img, name_space })
}

