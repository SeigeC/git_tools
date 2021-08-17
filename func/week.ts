import store from "../common/store.js";

const {projectList, config: {token, username}} = store.github_user
export const description = '生成周报'
export default async function Week() {
    let list = await Promise.all(Object.keys(projectList).map(async (project) => {
        const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${project}/pulls?access_token=${token}&sort=updated&per_page=100&state=all&direction=desc`)
        let res = await data.json()

        // 筛选 user
        res = res.filter(item => item.user.login === username)

        res = res.filter(item => new Date(item.updated_at).getTime() > new Date().getTime() - 14 * 24 * 60 * 60 * 1000)
        return res
    }))

    list = list.flat()
    const OverList = []
    const DoingList = []
    list.forEach(item => {
        const str = `[${getTitle(item)}] ${item.title} ([${projectList[item.base.repo.name].other_name}#${item.number}](${item.html_url}))`
        item.merged_at ? OverList.push(str) : DoingList.push(str)
    })

    const res = `- 已完成\n${OverList.join('\n')}\n\n- 正在进行\n${DoingList.join('\n')}`
    await $`echo ${res} | pbcopy`
    console.log(res)
}

function hasLabel(pr, label) {
    return pr.labels.find(item => item.name === label) !== undefined
}

function getTitle(pr) {
    if (hasLabel(pr, "bug/C")) {
        return "BUG"
    }
    if (hasLabel(pr, "tool")) {
        return "技术"
    }
    return "业务"
}
