# git-watcher

A simple app written in Typescript that polls git repos for changes to refs and emits webhooks when they occur.

## Get Started

Clone the repo and build the Docker image located in `image/Dockerfile`

```bash
cd image
docker build -t git-watcher .
```

Run the docker image and be sure to provide your own `config`. By default the docker port is `3500`.

```bash
# Example for running your docker image and mounting some local config into the apps config directory
docker run -d --name git-watcher -v ./config/:/app/config/ git-watcher
```

## Config

This app uses [node-config](https://github.com/node-config/node-config), which by default looks for a file at `./config/default.json`. You can further apply environmental overrides by creating a json config file in the `./config` folder with the name matching `<NODE_ENV>.json`.
For example, adding a production override would require the file `./config/production.json` and the environment variable `NODE_ENV` set to `production`.

### Example Config
```json
{
    "logLevel": "info",
    "port": 3500,
    "pollInterval": 10000,
    "webhook": {
        "url": "http://localhost:3500/webhook/void",
        "token": "super_secret_token"
    },
    "repos": [
        {
            "name": "example-repo",
            "url": "ssh://git@github.com/kristophbarbour/git-watcher",
            "excludedRefs": ["refs/heads/bug", "refs/tags/sit"]
        }
    ]
}
```

## Webhooks

As mentioned, when ref changes are detected, webhooks are emitted to your defined destination (specified in your config).

### Authentication
Currently only Bearer token authentication is supported, set your token using the config value `webhook.token` or if it is in a file (e.g. mounted Kubernetes secret) `webhook.tokenPath`.

### Example Payload

```json
{
    // The name for the repo defined in the config (not the name of the repo)
    "name": "example-repo",
    // The url for the repo defined in the config
    "url": "ssh://git@github.com/kristophbarbour/git-watcher",
    // The change detected
    "change": {
        // The hash of the new commit
        "hash": "04a45a5cc69fd5a3de09d902d50cad5dedeadbeef",
        // The ref that changed
        "name": "refs/heads/main"
    }
}
```