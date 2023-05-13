import axios, { AxiosInstance } from 'axios';
import { RepositoryChange } from '../client';
import { EventBus } from '../eventbus';
import { Logger } from '../util/Logger';
import config from '../config';
import { Events } from '../eventbus/Events';
import { readFileSync } from 'fs';

export class WebHookPublisher {
    private axios: AxiosInstance;
    constructor() {
        this.axios = axios.create({
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'git-poller/0.0.1',
            }
        });
        if (config.get<string>('webhook.token')) {
            this.axios.defaults.headers.common['Authorization'] = `Bearer ${config.get<string>('webhook.token')}`;
        }
        if(config.get<string>('webhook.tokenPath')){
            const token = readFileSync(`${config.get<string>('webhook.tokenPath')}`, 'utf8');
            this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        EventBus.getInstance().register(Events.REPOSITORY_CHANGE, (change: RepositoryChange) => {
            Logger.debug(`WebhookPublisher Received repository changes`, { change });
            change.changes.forEach((c) => {
                this.send(Events.REPOSITORY_CHANGE, {
                    name: change.name,
                    url: change.url,
                    change: c,
                });
            });
        });
    }

    public async send(event: string, data: any): Promise<void> {
        Logger.info(`Sending Webhook`, { event, data });
        const response = await this.axios.post(
            config.get<string>('webhook.url') || '/',
            JSON.stringify(data));
        Logger.info(`Webhook response`, { status: response.status, statusText: response.statusText });
    }

}