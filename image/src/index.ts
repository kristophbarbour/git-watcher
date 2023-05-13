import app from './app';
import ConfigWatcher from './config/ConfigWatcher';
import { Logger } from './util/Logger';
import config from './config';

Logger.setLevel(config.get<string>('logLevel') || 'INFO');

app.start();

ConfigWatcher.watch();
ConfigWatcher.on('config:change', () => {
    Logger.info('Config changed');
    Logger.setLevel(config.get<string>('logLevel') || 'INFO');
    app.reload();
});