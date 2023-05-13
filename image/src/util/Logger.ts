// Logger.ts - A static class that handles logging.
enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

const LogLevelString = {
    0: 'DEBUG',
    1: 'INFO',
    2: 'WARN',
    3: 'ERROR'
}

export class Logger {
    private static level: LogLevel = 1;

    private static formatData(data: object | Error): string {
        if (data instanceof Error) {
            return Logger.level == 0 ? `${data}` : data.stack || data.message;
        } else if (typeof data === 'object') {
            return Object.keys(data).map(key => `${key}='${typeof data[key] === "string" ? data[key] : JSON.stringify(data[key])}'`).join(' ');
        } else {
            return data;
        }
    }

    private static log(message: string, level: LogLevel = LogLevel.INFO, data?: object): void {
        if (this.level <= level) {
            if (data) {
                console.log(`${new Date().toUTCString()} ${LogLevelString[level]} ${message} ${this.formatData(data)}`);
            } else {
                console.log(`${new Date().toUTCString()} ${LogLevelString[level]} ${message}`);
            }
        }
    }

    public static setLevel(level: string): void {
        this.level = LogLevel[level.toUpperCase()];
    }

    public static error(message: string, data?: object): void {
        this.log(message, LogLevel.ERROR, data);
    }

    public static warn(message: string, data?: object): void {
        this.log(message, LogLevel.WARN, data);
    }

    public static info(message: string, data?: object): void {
        this.log(message, LogLevel.INFO, data);
    }

    public static debug(message: string, data?: object): void {
        this.log(message, LogLevel.DEBUG, data);
    }
}