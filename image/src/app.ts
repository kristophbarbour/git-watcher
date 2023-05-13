import express, { Express, Request, Response } from 'express';
import config from './config';
import { GitClient, RepositoryChange } from './client';
import { Logger } from './util/Logger';
import { WebHookPublisher } from './webhooks';
import { EventBus } from './eventbus/EventBus';
import { Events } from './eventbus/Events';

const app: Express = express();
const port = config.get<Number>('port') || process.env.PORT || 3000;
const eventBus = EventBus.getInstance();
let webhookPublisher;
let gitClient;

app.use(express.json());
app.get('/repos', (req: Request, res: Response) => {
    res.status(200).json(gitClient.getRepos());
});

app.get('/repos/changes', async (req: Request, res: Response) => {
    const changes = await gitClient.checkReposForUpdates();
    const { triggerWebhook } = req.query;
    if (triggerWebhook && changes.length > 0) {
        changes.forEach((change) => {
            EventBus.getInstance().dispatch<RepositoryChange>(Events.REPOSITORY_CHANGE, change);
        });
    }

    res.status(200).json(changes);
});

app.get('/repos/:name/refs', async (req: Request, res: Response) => {
    const refs = await gitClient.getRepoRefs(req.params.name);
    res.status(200).json(refs);
});

app.post('/webhook/void', async (req: Request, res: Response) => {
    // Read the body data
    const data = req.body;
    Logger.debug(`Received void webhook`, { data, headers: req.headers });
    res.status(200).send('OK');
});

app.get('/healthz', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

export default {
    start: () => {
        app.listen(port, () => {
            Logger.info(`Server started`, { port });
            webhookPublisher = new WebHookPublisher();
            gitClient = new GitClient();
            gitClient.beginPolling();
        });
    },
    reload: () => {
        Logger.info(`Reloading server`);
        gitClient.stopPolling();
        EventBus.getInstance().clearAll();
        config.reload();
        webhookPublisher = new WebHookPublisher();
        gitClient = new GitClient();
        gitClient.beginPolling();
    }
}