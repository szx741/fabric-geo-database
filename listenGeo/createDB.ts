/*
 * @Author: szx
 * @Date: 2021-12-31 14:52:54
 * @LastEditTime: 2022-01-06 15:08:16
 * @Description:
 * @FilePath: /commercial-paper/ts-application/src/db/createDB.ts
 */
import pg from 'pg';
const postgisConfig = {
    //基本属性
    user: 'admin', //postgreSQL数据库默认用户postgres
    host: 'localhost',
    database: 'blockchain', //空间数据库名称
    password: 'adminpw',
    port: 25431,

    // 扩展属性
    max: 20, // 连接池最大连接数
    idleTimeoutMillis: 3000 // 连接最大空闲时间 3s
};
async function postgisQuery(pool: pg.Pool, text: string, params: any[] = []) {
    // const start = Date.now();
    const res = await pool.query(text, params);
    // const duration = Date.now() - start;
    // console.log('执行查询语句', { text, duration, rows: res.rowCount });
    // console.log(res.rows);
    return res;
}

async function main() {
    try {
        const database = process.argv.splice(2)[0];
        let num = 1;
        if (database == '2') {
            num = 2;
        } else if (database == '3') {
            num = 3;
        } else if (database == '4') {
            num = 4;
        }

        for (let i = 1; i <= 3; i+=2) {
            postgisConfig.port += i;
            const pool = new pg.Pool(postgisConfig);

            await postgisQuery(
                pool,
                `CREATE TABLE IF NOT EXISTS mychannel_geo (
                "id" serial,
                "gid" varchar(20) PRIMARY KEY NOT NULL,
                "geom" geometry(geometry, 4796) --这个为空间点的创建语句
            );`
            );
            await postgisQuery(pool, `CREATE INDEX mychannel_geo_geom_idx ON mychannel_geo USING GIST (geom);`);
            // await postgisQuery(pool, `CREATE INDEX mychannel_geo_geog_idx ON mychannel_geo USING GIST ((geom::geography));`);
            await postgisQuery(
                pool,
                `CREATE TABLE IF NOT EXISTS mychannel_geo_history (
                id serial PRIMARY KEY NOT NULL,
                key varchar(20),
                is_delete boolean,
                blockNumber int,
                timestamp timestamptz,
                sequences int,
                datahash text,
                value jsonb
            );`
            );
            await postgisQuery(
                pool,
                `INSERT INTO mychannel_geo_history (key, is_delete, timestamp, blocknumber, sequences, datahash, value)
    VALUES ('-1', FALSE, '2021-09-09T06:01:17.813Z', 14, 0, '', '{}');`
            );
            await postgisQuery(
                pool,
                `CREATE INDEX idx_key ON mychannel_geo_history USING btree (key);`
            );
            await postgisQuery(
                pool,
                `CREATE TABLE IF NOT EXISTS mychannel_geo_hash (
                "id" serial,
                "his_id" int REFERENCES mychannel_geo_history (id),
                "salthash" text
            );`
            );
            await postgisQuery(
                pool,
                `CREATE INDEX idx_hash_his_id ON mychannel_geo_hash USING btree (his_id);`
            );
            await postgisQuery(
                pool,
                `INSERT INTO mychannel_geo_hash (his_id, salthash)
                VALUES ('1', '1457AC29121C7F359F78FD6438F371B2B3BCBEF0E06AF719EDC11C4BB1D21D60');
            `
            );
        }
    } catch (err) {
        console.error(err);
    }
}
main();
