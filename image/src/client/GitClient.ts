import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import config from '../config';
import { Logger } from '../util/Logger';
import { EventBus } from '../eventbus';
import { Events } from '../eventbus/Events';

export type Repository = {
    name: string;
    url: string;
    excludedRefs?: string[];
    lastUpdated: Date;
    refs: Ref[];
}

export type Ref = {
    name: string;
    hash: string;
}

export type RepositoryChange = {
    name: string;
    url: string;
    changes: Ref[];
}

export class GitClient {
    private git: SimpleGit;
    private repos: Repository[];
    private pollInterval: NodeJS.Timer | undefined = undefined;

    constructor() {
        this.git = simpleGit({
            binary: config.get<string>('git.binary'),
            maxConcurrentProcesses: config.get<number>('git.maxConcurrentProcesses'),
            config: config.get<any>('git.config'),

        });
        this.repos = [];

        this.init();
    }

    private async init(): Promise<void> {
        const repos = config.get<Repository[]>('repos');
        if (!repos) return;

        for (const repo of repos) {
            repo.refs = await this.getInitialRefs(repo);
            repo.lastUpdated = new Date();
            this.repos.push(repo);
        }
    }

    private async getInitialRefs(repo: Repository): Promise<Ref[]> {
        try {
            Logger.info(`Loading initial refs`, { repo: repo.name });
            const remoteRefs = await this.git.listRemote(['--heads', '--tags', repo.url]);
            const refs: Ref[] = remoteRefs.trimEnd().split('\n').splice(1).map((ref) => {
                const [hash, name] = ref.split('\t');
                return {
                    hash,
                    name,
                } as Ref;
            });

            Logger.info(`Repo Refs`, { "repo": repo.name, "count": refs.length });
            return refs;
        } catch (error) {
            if(`${error}`.indexOf("Could not read from remote repository") > -1) {
                Logger.error(`Error loading initial refs`, { repo: repo.name, error: "Could not read from remote repository. Please make sure you have the correct access rights and the repository exists" });
            } else {
                Logger.error(`Error loading initial refs`, { repo: repo.name, error });
            }
            return [];
        }
    }

    private async checkForUpdates(repo: Repository): Promise<Ref[]> {
        try {
            Logger.info(`Checking for updates`, { repo: repo.name });
            const remoteRefs = await this.git.listRemote(['--heads', '--tags', repo.url]);
            const refs: Ref[] = remoteRefs.trimEnd().split('\n').map((ref) => {
                const [hash, name] = ref.split('\t');
                return {
                    hash,
                    name,
                } as Ref;
            });

            const newRefs = refs.filter((ref) => {
                // Filter out excluded refs
                if (repo.excludedRefs && repo.excludedRefs.length > 0) {
                    if (repo.excludedRefs.some((excludedRef) => ref.name.startsWith(excludedRef))){
                        Logger.debug(`Excluded ref`, { repo: repo.name, ref: ref.name });
                        return false;
                    }
                }
                return !repo.refs.some((r) => r.hash === ref.hash);
            });

            if (newRefs.length > 0) {
                repo.refs = repo.refs.concat(newRefs);
                repo.lastUpdated = new Date();
                return newRefs;
            }

            return [];
        } catch (error) {
            if(`${error}`.indexOf("Could not read from remote repository") > -1) {
                Logger.error(`Error loading initial refs`, { repo: repo.name, error: "Could not read from remote repository. Please make sure you have the correct access rights and the repository exists" });
            } else {
                Logger.error(`Error loading initial refs`, { repo: repo.name, error });
            }
            return [];
        }
    }

    public async getRepos(): Promise<Repository[]> {
        return this.repos;
    }

    public async getRepoRefs(repoName: string): Promise<Ref[]> {
        const repo = this.repos.find((r) => r.name === repoName);
        if (!repo) return [];

        return repo.refs;
    }

    public async checkReposForUpdates(): Promise<RepositoryChange[]> {
        const changes: RepositoryChange[] = [];
        for (const repo of this.repos) {
            const newRefs = await this.checkForUpdates(repo);
            if (newRefs.length > 0) {
                changes.push({
                    name: repo.name,
                    url: repo.url,
                    changes: newRefs,
                });
            }
        }

        return changes;
    }

    public async beginPolling(): Promise<void> {
        const _interval = config.get<number>('pollInterval');
        if (!_interval) return;

        Logger.info(`Starting polling`, { interval: _interval });
        this.pollInterval = setInterval(async () => {
            const changes = await this.checkReposForUpdates();
            if (changes.length > 0) {
                changes.forEach((change) => {
                    EventBus.getInstance().dispatch<RepositoryChange>(Events.REPOSITORY_CHANGE, change);
                });
            }
        }, _interval);
    }

    public async stopPolling(): Promise<void> {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}