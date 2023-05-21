import "reflect-metadata"
import { DataSource } from "typeorm"
import { User } from "./entity/User"
import { Data } from "./entity/Data"

export const AppDataSource = new DataSource({
    type: process.env.DATABASE_TYPE as any,
    database: process.env.DATABASE,
    synchronize: true,
    logging: false,
    entities: [User, Data],
    migrations: [],
    subscribers: [],
})
