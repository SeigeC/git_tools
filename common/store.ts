import {readdirSync} from './fs';
import path from "path";
import type {config as IConfig} from './config.js'

const __filename = process.argv[2]
const __dirname = path.dirname(__filename);
const __config_path = `${__dirname}/config`
const __swimlane_path = `${__config_path}/swimlane`

export {__filename, __dirname, __config_path, __swimlane_path}

export async function init() {
    const config: IConfig = {}
    config.swimlane = readdirSync(__swimlane_path).filter(file => file.endsWith(".yml") && !file.endsWith(".example.yml"))
    const list = readdirSync(__config_path).filter(file => file.endsWith(".json") && !file.endsWith(".example.json"))
    await Promise.all(
        list.map(async file => {
            const file_path = `${__config_path}/${file}`
            const str = await fs.readFile(file_path, "utf8")
            return config[path.basename(file_path, path.extname(file_path))] = JSON.parse(str)
        })
    )
    // 兼容 env 情况
    const github_config = config.github_user.config
    config.github_user.config = {
        username: github_config.username ? github_config.username : process.env.GITHUB_USERNAME,
        token: github_config.token ? github_config.token : process.env.GITHUB_TOKEN,
        bot_token: github_config.bot_token
    }
    return config
}

const store = await init()

export default store



