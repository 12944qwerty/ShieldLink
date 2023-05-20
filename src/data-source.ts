import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Data } from "./entity/Data"

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "database.sqlite",
    synchronize: true,
    logging: false,
    entities: [User, Data],
    migrations: [],
    subscribers: [],
})
