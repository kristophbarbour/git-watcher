import {IConfig} from 'config';
let config: IConfig = require('config');

export default {
    get: <T>(setting: string): T | undefined => {
        if (!config.has(setting)) {
            return undefined;
        }
        return config.get<T>(setting);
    },
    reload: () => {
        // Force reload of config by clearning the internal cache
        delete require.cache[require.resolve('config')];
        config = require('config');
    }
}