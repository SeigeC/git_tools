class Log {
    info(key: string, value: string) {
        console.log(`\r${chalk.blue(key)}: ${chalk.cyan(value)}`);
    }
    Success(msg: string) {
        console.log(`\r${chalk.green(msg)}`);
    }
    Error(msg: string) {
        console.log(`\r${chalk.red(msg)}`);
        process.exit()
    }
    Warning(msg: string) {
        console.log(`\r${chalk.yellow(msg)}`);
    }
}

const log = new Log()
export default log
