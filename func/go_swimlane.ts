import build from './build.js'
import swimlane from './swimlane.js'
export const description = '自动构建并上泳道'
export default async function GoSwimlane() {
    const img = await build()
    await swimlane(img)
}

