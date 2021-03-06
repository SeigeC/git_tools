export interface config {
    github_user?: github_user
    oa?: oa
    ssh?: ssh
    swimlane?: string[]
    stable?: stable

    [name: string]: unknown
}

export interface github_user {
    userList: UserList
    projectList: ProjectList
    config?: Config
}

export interface UserList {
    [key: string]: User
}

export interface User {
    phone: string
    review_rule?: ReviewRule
}

export interface ReviewRule {
    or?: string[]
    and?: string[]
}

export interface ProjectList {
    [name: string]: Project
}

export interface Project {
    other_name: string
    review_userList: string[]
}

export interface Config {
    username: string
    token: string
    bot_token: string
}

export interface oa {
    username: string
    password: string
    session: string
    otpauth: string
    login_url: string
    rider_url: string
    codesync_url: string
    git_url: string
}

export interface ssh {
    name: string
    ip: string
}

export interface stable {
    [name: string]: string
}
