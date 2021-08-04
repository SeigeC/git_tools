import { request, gql } from 'graphql-request'

export async function GetMyPr(project) {
    const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${project}/pulls?access_token=${process.env.GITHUB_TOKEN}`)
    let res = await data.json()
    // 筛选 user
    return res.filter(item => item.user.login === process.env.GITHUB_USERNAME)
}


export class Pr {
    project: string
    token: string
    username: string
    #my_pr_list = []
    constructor(project: string) {
        this.project = project
        this.token = process.env.GITHUB_TOKEN
        this.username = process.env.GITHUB_USERNAME
    }

    async PR() {
        const query = gql``
        const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${this.project}/pulls?access_token=${this.token}`)
        return await data.json()
    }

    async MyPR() {
        if (this.#my_pr_list.length === 0) {
            const list = await this.PR()
            this.#my_pr_list = list.filter(item => item.user.login === process.env.GITHUB_USERNAME)
        }
        return this.#my_pr_list
    }

    async ReviewUsers(id) {
        if (!id) {
            return undefined
        }
        const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${this.project}/pulls/${id}/reviews?access_token=${this.token}`)
        return await data.json()
    }

    async ReviewListUsers() {
        const list = await this.MyPR()
        list.map(async item => await this.ReviewUsers(item.number))
        return await Promise.all(list.map(async item => await this.ReviewUsers(item.number)))
    }
}