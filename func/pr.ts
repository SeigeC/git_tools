import json from '../github_user.json'
const { userList, projectList } = json
import { GetMyPr } from '../common/pr.js'
import prompts from 'prompts';
export const description = '催 Pr'
export default async function Pr() {
    const project = (await prompts({
        type: 'select',
        name: 'value',
        message: '请选择要拉取的项目',
        choices: Object.keys(projectList).map(item => ({ title: item, value: item })),
        initial: 0
    })).value

    let res = await GetMyPr(project)
    // 筛选 label
    res = res.filter(item => !hasLabel(item, "pending"))
    if (res === "") {
        console.error("res 不能为空")
        await $`exit`
    }
    // console.log(JSON.stringify(res));
    // return
    const wantReviewList = (await prompts({
        type: 'multiselect',
        name: 'value',
        message: '请选择要催的 PR',
        choices: res.map(item => ({ title: item.title, value: item.number })),
        min: 1,
        initial: 0
    })).value

    res = res.filter(item => wantReviewList.includes(item.number))

    function needReview(pr, name) {
        const review_user = userList[name]
        if (!review_user?.phone) {
            return
        }
        const rule = review_user.reivew_rule
        if (!rule) {
            return pr.requested_reviewers.find((user) => user.login === name) !== undefined
        }
        const requested_reviewers_names = pr.requested_reviewers.map(user => user.login)
        if (rule.and) {
            return rule.and.every(name => requested_reviewers_names.includes(name))
        }
        // or 
        return !rule.or.every(name => requested_reviewers_names.includes(name))
    }

    const pushMap = new Map()
    if (!projectList[project]?.review_userList) {
        return
    }

    const wantReviewUser = (await prompts({
        type: 'multiselect',
        name: 'value',
        message: '请选择要催的 PR',
        choices: projectList[project].review_userList.map(item => ({ title: item, value: item })),
        min: 1,
        initial: 0
    })).value
    wantReviewUser.forEach(name => {
        const list = res.filter(item => needReview(item, name))
        list.length <= 0 ? null : pushMap.set(name, list)
    })

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
        headers: { 'Content-Type': 'application/json' },
    })
    console.log(await bot.json())
}

function hasLabel(pr, labe) {
    return pr.labels.find((label) => label.name === labe) !== undefined
}