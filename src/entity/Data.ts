import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Data {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    from: string

    @Column()
    to: string

    @Column()
    data: string
}
