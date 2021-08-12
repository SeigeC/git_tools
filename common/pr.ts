import {Octokit} from "@octokit/core";
import {RequestParameters} from '@octokit/graphql/dist-types/types'
import {Repository, User} from "@octokit/graphql-schema";
import gql from "graphql-tag";
import {DocumentNode, print} from 'graphql'

export async function GetMyPr(project) {
    const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${project}/pulls?access_token=${process.env.GITHUB_TOKEN}`, {
        headers: {
            "Authorization": `token ${process.env.GITHUB_TOKEN}`
        }
    })
    let res = await data.json()
    // console.log(res)
    // 筛选 user
    return res.filter(item => item.user.login === process.env.GITHUB_USERNAME)
}

export async function CreatePR(project) {
    const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${project}/pulls?access_token=${process.env.GITHUB_TOKEN}`, {
        method: "post",
        body: JSON.stringify({"title": "test 上线 pr", "head": "master", "base": "stable"})
    })
    let res = await data.json()
    // 筛选 user
    return res.filter(item => item.user.login === process.env.GITHUB_USERNAME)
}

const bot = gql`query {
    user(login: "missevan-bot") {
        pullRequests(states: OPEN, last: 100) {
            totalCount
            edges {
                cursor
                node {
                    id
                    title
                    number
                    resourcePath
                    repository {
                        name
                    }
                }
            }
        }
    }
}`

const review_list = gql`query ($project_name:String!, $number:Int!) {
    repository(owner: "MiaoSiLa", name: $project_name) {
        pullRequest(number: $number) {
            author {
                login
            }
            number
            title
            labels(last: 10) {
                edges {
                    cursor
                    node {
                        name
                    }
                }
            }
            commits(last: 1) {
                edges {
                    cursor
                    node {
                        commit {
                            message
                            committedDate
                        }
                    }
                }
            }
            reviews(last: 10, states: APPROVED) {
                edges {
                    cursor
                    node {
                        state
                        author {
                            login
                        }
                        submittedAt
                    }
                }
            }
        }
    }
}`

export class pr {
    static octokit = new Octokit({auth: process.env.GITHUB_TOKEN});

    static async gql<T>(query: DocumentNode, params?: RequestParameters) {
        return await pr.octokit.graphql<T>(print(query), params)
    }

    static async getBot() {
        const {user} = await pr.gql<{ user: User }>(bot)
        return user.pullRequests
    }

    static async getNode(project_name: string, number: number) {
        const {repository} = await pr.gql<{ repository: Repository }>(review_list, {project_name, number})
        return repository
    }
}

export async function GetApprovedUser({project_name, number}: { project_name: string, number: number }) {
    const list = await pr.getNode(project_name, number)
    const {commits, reviews} = list.pullRequest
    const last_commit_time = new Date(commits.edges[0].node.commit.committedDate).getTime()
    const after_last_commit_reviews = reviews.edges.filter(item => {
        const approved_time = new Date(item.node.submittedAt).getTime()
        return approved_time > last_commit_time
    })
    const approved = after_last_commit_reviews.map(item => item.node.author.login)
    return [...new Set(approved)]
}
