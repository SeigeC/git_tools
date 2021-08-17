import {Octokit} from "@octokit/core";
import {RequestParameters} from '@octokit/graphql/dist-types/types'
import {PullRequest, Repository} from "@octokit/graphql-schema";
import gql from "graphql-tag";
import {DocumentNode, print} from 'graphql'
import ini from "ini";
import log from "./log";
import store from "./store";

const {username, token, bot_token} = store.github_user.config

export async function GetMyPr(project) {
    const data = await fetch(`https://api.github.com/repos/MiaoSiLa/${project}/pulls?access_token=${token}`, {
        headers: {
            "Authorization": `token ${token}`
        }
    })
    let res = await data.json()
    // 筛选 user
    return res.filter(item => item.user.login === username)
}

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

const create_pr = gql`mutation ($repositoryId: ID!, $headRefName: String!, $title: String!) {
    createPullRequest(input: {repositoryId: $repositoryId, baseRefName: "stable", headRefName: $headRefName, title: $title}) {
        clientMutationId
        pullRequest {
            id
            title
            body
            commits(first: 50) {
                totalCount
                nodes {
                    commit {
                        author {
                            name
                        }
                        committer {
                            name
                        }
                        message
                    }
                }
            }
        }
    }
}`

const update_pr = gql`mutation ($pullRequestId:ID!,$body:String) {
    updatePullRequest(input: {pullRequestId: $pullRequestId, body: $body}){
        pullRequest{
            id
            title
            body
        }
    }
}`

const check_pr = gql`query($owner:String!,$name:String!,$headName:String!) {
    repository(owner:$owner, name:$name) {
        id
        pullRequests(last: 1, baseRefName: "stable", headRefName: $headName, states: OPEN) {
            totalCount
            nodes {
                id
                title
                body
                commits(first: 50) {
                    totalCount
                    nodes {
                        commit {
                            author {
                                name
                            }
                            committer {
                                name
                            }
                            message
                        }
                    }
                }
            }
        }
    }
}`

export class pr {
    static octokit = new Octokit({auth: token});

    static gql<T>(query: DocumentNode, params?: RequestParameters, auth?: string) {
        return auth ?
            new Octokit({auth}).graphql<T>(print(query), params) :
            pr.octokit.graphql<T>(print(query), params)
    }

    static async getNode(project_name: string, number: number) {
        const {repository} = await pr.gql<{ repository: Repository }>(review_list, {project_name, number})
        return repository
    }

    static async createPr(repositoryId: string, pr_name: string, title: string) {
        const {createPullRequest: {pullRequest}} = await pr.gql<{
            createPullRequest: {
                pullRequest: PullRequest
            }
        }>(
            create_pr,
            {repositoryId, headRefName: `${username}:${pr_name}`, title},
        )
        return pullRequest
    }

    static async updatePr(pullRequestId: string, body: string) {
        const {updatePullRequest: {pullRequest}} = await pr.gql <{
            updatePullRequest: {
                pullRequest: PullRequest
            }
        }>
        (update_pr, {pullRequestId, body})
        return pullRequest
    }

    static async checkPR(owner: string, name: string, headName: string) {
        const {repository} = await pr.gql<{
            repository: Repository
        }>(check_pr, {owner, name, headName})
        return repository.pullRequests.totalCount === 1 ? {
            id: repository.id,
            pullRequest: repository.pullRequests.nodes[0]
        } : {id: repository.id}
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

export async function GetGitConfig(path: string) {
    const config_path = `${path}/.git/config`
    if (!fs.existsSync(config_path)) {
        log.Error(`${config_path} 不存在`)
    }
    const i = ini.parse(fs.readFileSync(`${path}/.git/config`).toString());
    const remote_reg = /github\.com[/:](.*)\/(.*)\.git/
    const res = i[`remote "upstream"`].url.match(remote_reg)
    return {owner: res[1], name: res[2]}
}
