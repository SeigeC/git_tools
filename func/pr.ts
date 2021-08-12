import {GetApprovedUser, GetMyPr} from '../common/pr.js'
import prompts from '../common/prompts';
import store from "../common/store.js";

const {userList, projectList} = store.github_user

export const description = '催 Pr'
export default async function Pr() {
    const projects = (await prompts({
        type: 'multiselect',
        name: 'value',
        message: '请选择要拉取的项目',
        choices: Object.keys(projectList).map(item => ({title: item, value: item})),
        min: 1,
        initial: 0
    })).value as string[]
    const list = await Promise.all(projects.map(async project => {
        const list = (await GetMyPr(project)) as any[]
        return list.map(item => ({...item, project}))
    }))
    let res = list.flat()
    // 筛选 label
    res = res.filter(item => !hasLabel(item, "pending"))
    if (res.length === 0) {
        console.error("res 不能为空")
        await $`exit`
    }

    const wantReviewList = (await prompts({
        type: 'multiselect',
        name: 'value',
        message: '请选择要催的 PR',
        choices: res.map(item => ({title: item.title, value: item.number})),
        min: 1,
        initial: 0
    })).value as string[]

    res = res.filter(item => wantReviewList.includes(item.number))

    function needReview(approved_users: string[], name: string) {
        if (approved_users.includes(name)) {
            return false
        }
        const review_user = userList[name]
        if (!review_user?.phone) {
            return false
        }
        const rule = review_user.review_rule
        if (!rule) {
            return true
        }
        if (rule.and) {
            return rule.and.every(name => approved_users.includes(name))
        }
        // or 
        return !!rule.or.find(name => approved_users.includes(name))
    }

    async function setPusMap(project: string, item) {
        const approved_users = await GetApprovedUser({
            project_name: project, number: parseInt(item.number)
        })

        const not_approved_users = wantReviewUser.filter(user => !approved_users.includes(user))
        not_approved_users.forEach(name => {
            if (!needReview(approved_users, name)) {
                return
            }
            const list = pushMap.get(name)
            list ? pushMap.get(name).push(item) : pushMap.set(name, [item])
        })
        return
    }


    const set = new Set(projects.map(project => projectList[project].review_userList).flat())

    const wantReviewUser = (await prompts({
        type: 'multiselect',
        name: 'value',
        message: '请选择要 review 的人',
        choices: [...set].map(item => ({title: item, value: item})),
        min: 1,
        initial: 0
    })).value as string[]
    const pushMap = new Map()
    await Promise.all(res.map((item) => setPusMap(item.project, item)))
    if (pushMap.size === 0) {
        return
    }

    const strList = []
    const phonelist = []
    for (let [k, v] of pushMap) {
        const str = `-- ${k}\n` + v.map(item => `${item.title} \n${item.html_url}`).join('\n\n')
        strList.push(str)
        phonelist.push(userList[k].phone)
    }

    const bot = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.BOT_KEY}`, {
        method: 'POST',
        body: JSON.stringify({
            "msgtype": "text",
            "text": {
                "content": strList.join('\n\n'),
                "mentioned_mobile_list": phonelist
            }
        }),
        headers: {'Content-Type': 'application/json'},
    })
    console.log(await bot.json())
}

function hasLabel(pr, labe) {
    return pr.labels.find((label) => label.name === labe) !== undefined
}
