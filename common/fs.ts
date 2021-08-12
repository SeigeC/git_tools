import {readdirSync as readdir} from "fs";

export function readdirSync(path: string) {
    if (!fs.existsSync(path)) {
        fs.mkdirpSync(path)
    }
    return readdir(path)
}


