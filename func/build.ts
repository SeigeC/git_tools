import prompts from 'prompts';
import login, { session, rider_url, codesync_url, git_url } from '../common/login.js'
import { GetMyPr } from '../common/pr.js'
import log from '../common/log.js';
import { waitingFunc } from '../common/waiting.js'
import cookie from '../common/cookie.js'
import fetch from 'node-fetch';

export const description = '自动构建'
export default async function () {
    const res = await login()

    const getSession = await fetch(`http://${rider_url}/index`, { headers: { "Cookie": `session=${session}` } })
    const build_session = getSession.headers.raw()['set-cookie']?.[0];
    const r = cookie(build_session)?.["session"]
    const header = {
        headers:
        {
            'Content-Type': 'application/json',
            "Host": rider_url,
            "Origin": `http://${rider_url}`,
            "Upgrade-Insecure-Requests": "1",
            "Cookie": `session=${r ? r : session}`,
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.70"
        }
    }
    const appList = (await (await fetch(`http://${rider_url}/api/app/search_app?page=1&per_page=10`, header)).json()).data
    const project = (await prompts({
        type: 'select',
        name: 'value',
        message: '请选择要拉取的项目',
        choices: appList.map(item => ({
            title: item.app_name, value: item
        })),
        initial: 0
    })).value

    const app_name = project.app_name
    const pr_list = await GetMyPr(project.app_name)
    const pr = (await prompts({
        type: 'select',
        name: 'value',
        message: `想要构建的 pr`,
        choices: pr_list.map(item => ({ title: item.title, value: item.number })),
    }, {
        onSubmit: (prompt, answer) => answer ? null : console.log(chalk.red("找不到指定的 pr"))
    })).value

    const ops = {
        "remote_url": `https://github.com/MiaoSiLa/${app_name}`,
        "local_url": `https://${git_url}/maoer/${app_name}`,
        "branch": `pr/${pr}`,
        "enforce": true
    }
    const rider_pr = await waitingFunc(async function () {
        const ops_res = await (await fetch(`https://${codesync_url}`, { method: 'post', body: JSON.stringify(ops) })).json()
        if (ops_res?.code !== 0) {
            log.Error("构建失败")
            return
        }
        const commitList = (await (await fetch(`http://${rider_url}/api/git/get_branch/${project.git_id}`, { ...header, method: 'post' })).json()).data
        return commitList.find(item => item.name === `pr/${pr}`)
    }, '同步代码')


    const body = {
        "version": "1.15",
        "type": "branch",
        "branch": rider_pr.name,
        "app_name": project.app_name,
        "commit_id": rider_pr.commit.id,
        "build_type": "self",
        "commit_message": rider_pr.commit.message,
        "arg": {},
        "extra_param": "",
    }
    const build_res = (await (await fetch(`http://${rider_url}/api/app/build_app/${project.id}`, {
        ...header,
        method: 'post',
        body: JSON.stringify(body),
    })).json())
    if (!build_res.result) {
        log.Error("构建失败");
        return
    }
    const build_id = build_res.build_id
    log.info("name", rider_pr.name)
    log.info("message", rider_pr.message)
    log.info("commit_id", rider_pr.id)
    log.info("build_id", build_id)
    const img_url = await waitingFunc(async function () {
        for (; ;) {
            await sleep(2000)
            const build_list = (await (await fetch(`http://${rider_url}/api/pkg/search_buildtask?page=1&per_page=10`, header)).json()).data
            const img_url = build_list.find(item => item.id === build_id)?.package_info?.docker_image_name
            if (img_url) {
                return img_url
            }
        }
    }, "rider 构建")
    log.info("img", img_url)
    return img_url
}

