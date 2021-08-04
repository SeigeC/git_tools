import { readdirSync } from 'fs';
import path from 'path';
const __dirname = path.resolve();

export default Promise.all(
    readdirSync(__dirname + '/func').
        filter(file => {
            return file !== 'index.ts'
                && file.includes(".ts")
        }).
        map(async file => await import(`./${file}`))
)