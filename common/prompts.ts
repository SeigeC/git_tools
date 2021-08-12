import prompts from 'prompts'
import {red} from "./log";


export default async function (param: prompts.PromptObject | prompts.PromptObject[], option?: prompts.Options) {
    try {
        return await prompts(param, {
            onCancel: async () => {
                throw  `${red('✖')} Operation cancelled`
            },
            ...option
        })
    } catch (err) {
        console.log(err)
        process.exit()
    }
}
