// Watches config files for changes and signals the app to reload.
// Gets the config file paths from the environment variable CONFIG_PATHS.
import chokidar from 'chokidar';
import { EventEmitter } from 'node:events';
import fs from 'fs';
import { Logger } from '../util/Logger';
const emitter = new EventEmitter();

interface ConfigCache {
    size: number;
    contents: string;
}

function hasConfigChanged(path: string, prev: ConfigCache): boolean {
    Logger.debug(`Checking if config file changed`, { path });
    const stat = fs.statSync(path);
    if (stat.size !== prev.size) {
        return true;
    }

    const content = fs.readFileSync(path, 'utf8');
    return (content != prev.contents);
}



export default class ConfigWatcher {
    private static watchers: any[] = [];
    private static configPaths: string[] = process.env.CONFIG_PATHS?.split(',') || ["config"];
    private static configCache: Map<string, ConfigCache> = new Map();

    public static watch(): void {
        Logger.info(`Watching config files`, { paths: this.configPaths });
        this.configPaths.forEach((path) => {
            Logger.info(`Watching config file`, { path });
            const watcher = chokidar.watch(path, {
                persistent: true,
                ignoreInitial: false,
                followSymlinks: true,
            });

            watcher.on('add', this.checkConfig.bind(this));
            watcher.on('change', this.checkConfig.bind(this));

            this.watchers.push(watcher);
        });
    }

    public static on(event: string, listener: (...args: any[]) => void): void {
        emitter.on(event, listener);
    }

    private static checkConfig(path) {
        // Check if the contents of the file actually changed
        // This is necessary because some editors will write to a temp file and then rename it
        // This causes the change event to fire twice
        const prev = this.configCache.get(path) || false;
        if (!prev) {
            // Add the file to the cache
            this.configCache.set(path, {
                size: fs.statSync(path).size,
                contents: fs.readFileSync(path, 'utf8'),
            });
            Logger.info(`Config file added to cache`, { path, size: this.configCache.get(path)?.size });
            return;
        }

        if (hasConfigChanged(path, prev)) {
            // Update the cache
            this.configCache.set(path, {
                size: fs.statSync(path).size,
                contents: fs.readFileSync(path, 'utf8'),
            });
            Logger.info(`Config file updated in cache`, { path, size: this.configCache.get(path)?.size });
            Logger.info(`Config file changed`, { path });
            emitter.emit('config:change', path);
        }
    }
}