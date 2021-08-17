import {which} from "../common/util";
import store from "../common/store";
import log from "../common/log";
import prompts from "../common/prompts";
import {waitingFunc} from "../common/waiting";
import {GetGitConfig, pr} from "../common/pr";
import day from 'dayjs'
import {Commit, PullRequest, PullRequestCommit, PullRequestCommitConnection} from "@octokit/graphql-schema";

export const description = '上线 PR'

export default async function Stable() {
    await which('git')
    const project = (await prompts({
        type: 'select',
        name: 'value',
        message: '请选择要上线的项目',
        choices: Object.keys(store.stable).map(item => ({
            title: item, value: item
        })),
        initial: 0
    })).value
    const project_path = store.stable[project]
    const branchName = `PR-${day().format('YYYY-MM-DD')}`

    if (!fs.existsSync(`${project_path}/.git`)) {
        log.Error("目录不是 git 目录")
    }
    const {owner, name} = await GetGitConfig(project_path)
    const {id: repository_id, pullRequest: before_stable_pr} = await pr.checkPR(owner, name, branchName)
    const {v, before_v} = await waitingFunc(async function () {
        cd(project_path)
        const Makefile_path = `${project_path}/Makefile`
        const version_reg = /VERSION=([0-9.-]*)/
        await $`git checkout master && git pull upstream master`
        await $`git checkout -f -B stable upstream/stable`
        await $`git checkout -f -B ${branchName} master`
        const file = await fs.readFile(Makefile_path, "utf-8");
        const res = file.match(version_reg);
        if (res.length !== 2) {
            log.Error('找不到版本号')
        }
        const v = version(res[1]);
        await fs.writeFile(
            Makefile_path,
            file.replace(version_reg, `VERSION=${v}`)
        )
        const commit_msg = `更新版本号至 ${v}`
        await $`git add Makefile && git commit -m${commit_msg}`
        await $`git push -u -f origin ${branchName}`
        return {v, before_v: res[1]}
    }, "同步代码")
    // 等待 2s 防止 github 同步不及时
    await sleep(2000)
    const {pullRequest: stable_pr} = await pr.checkPR(owner, name, branchName)
    const {id, commits} = stable_pr ? {
        id: stable_pr.id,
        commits: stable_pr.commits
    } : await waitingFunc(async function () {
        const create_pr = await pr.createPr(repository_id, branchName, `同步 master 最新提交到 stable, 更新版本号至 ${v}`);
        const {id, commits} = create_pr
        return {id, commits}
    }, "创建上线 PR")


    await waitingFunc(async function () {
        const commit_pr = commits.nodes.filter(node => node.commit.committer.name === "GitHub").map(node => node.commit)
        const pr_reg = /\((#\d*)\)$/
        const body = commit_pr.map(item => ({
            name: item.author.name,
            message: item.message,
            number: item.message.match(pr_reg)[1]
        }))
        const body_test = [`## ${v}`]
        body.forEach(commit => {
            body_test.push(`+ ${commit.number}`)
        })
        await pr.updatePr(id, body_test.join('\n'))
    }, "更新 PR 信息")

    const bot = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${process.env.BOT_KEY}`, {
        method: 'POST',
        body: JSON.stringify({
            "msgtype": "text",
            "text": {
                "content": botMsg(name, v, before_v, before_stable_pr, commits),
            }
        }),
        headers: {'Content-Type': 'application/json'},
    })
    console.log(await bot.json())
}

function version(str: string) {
    const version = [...str] as ('.' | '-' | number)[]
    for (let i = version.length - 1; i >= 0; i--) {
        if (version[i] == '.' || version[i] == '-') {
            continue
        }

        if (version[i] < 9) {
            // @ts-ignore
            version[i]++
            break
        }
        version[i] = 0
    }
    return version.join('')
}

function checkCommit(before: PullRequest, now: PullRequestCommitConnection) {
    const new_commit: Commit[] = []
    const before_node = filterPr(before.commits.nodes)
    const now_node = filterPr(now.nodes)
    now_node.forEach(commit => {
        const res = before_node.find(item => commit.message === item.message)
        if (!res) {
            new_commit.push(commit)
        }
    })
    return new_commit
}

function filterPr(list: PullRequestCommit[]) {
    return list.filter(node => node.commit.committer.name === "GitHub").map(item => item.commit)
}

function botMsg(name, v, before_v, before_stable_pr: PullRequest, stable_pr: PullRequestCommitConnection) {
    const title = `【${name}】【${before_v} => ${v}】${before_stable_pr ? '追加更新' : '准备更新'}`
    const commits = before_stable_pr ? checkCommit(before_stable_pr, stable_pr) : stable_pr.nodes.filter(item => item.commit.committer.name === "GitHub")
    return `${title}\n\n${commits.map(item => item.message ? item.message : item.commit.message).join('\n')}`
}
