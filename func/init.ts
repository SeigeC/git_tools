import {init} from "../common/store.js";

export const description = '初始化'


export default async function Init() {
    console.log(await init())
    // console.log(process.argv)
    // const __dirname = path.resolve('')
    // console.log(__dirname)
    // const res = await fs.stat(__dirname + 'config.json')
    // console.log(res)
}
