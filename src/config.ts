const PATH = '../data/config.json'

export interface Config {
    owner_ids: string[]
    prefix: string
    token: string
    client_id: string
    status?: string
}

export function load(path: string): Config {
    return require(path) as Config
}

export const config: Config = load(PATH)