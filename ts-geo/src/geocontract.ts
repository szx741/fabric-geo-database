/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

// Fabric smart contract classes
import { Contract, Context, Info, Transaction, Returns } from 'fabric-contract-api';
import shim from 'fabric-shim';
// TicketNet specifc classes

import Nano from 'nano';
import pg, { Query } from 'pg';
import { getDistance, getPoiRange } from './distance';
const postgisConfig = {
    //基本属性
    user: '', //postgreSQL数据库默认用户postgres
    host: '',
    database: 'mychannel_ticket', //空间数据库名称
    password: '',
    port: 5432,

    // 扩展属性
    max: 100, // 连接池最大连接数
    idleTimeoutMillis: 3000 // 连接最大空闲时间 3s
};
let pool: any;
async function postgisQuery(text: string, params: any[]) {
    // const start = Date.now();
    const res = await pool.query(text, params);
    // const duration = Date.now() - start;
    // console.log('执行查询语句', { text, duration, rows: res.rowCount });
    return res;
}
interface PostgisConfig {
    postgisHost: string;
    postgisUser: string;
    postgisPass: string;
    postgisPort: string;
}

interface Geojson {
    type: 'Feature';
    geometry: {
        type: string;
        coordinates: Array<number>;
    };
    properties: {};
}

let nano:any = null;
/**
 * A custom context provides easy access to list of all Movie tickets
 */
class GeoContext extends Context {
    constructor() {
        super();
    }
}

export class GeoContract extends Contract {
    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.ticketnet.geo');
    }

    /**
     * Define a custom context for movie ticket
     */
    createContext() {
        return new GeoContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {GeoContext} ctx the transaction context
     */
    async instantiate(ctx: GeoContext) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     * 获得客户端组织ID
     * @param {GeoContext} ctx
     * @param {boolean} verifyOrg 是否要验证客户端的组织ID匹配上peer的组织ID
     * @returns 客户端组织ID
     */
    getClientOrgID(ctx: GeoContext, verifyOrg: boolean) {
        let clientOrgID = ctx.clientIdentity.getMSPID();
        if (verifyOrg) {
            const res = this.verifyClientOrgMatchesPeerOrg(ctx, clientOrgID);
            if (res != null) {
                throw new Error("\n peer's MSPId:" + res.peerOrgID + ' not equal clientOrgID: ' + clientOrgID);
            }
        }
        return clientOrgID;
    }

    //验证客户端的组织ID匹配上peer的组织ID
    verifyClientOrgMatchesPeerOrg(ctx: GeoContext, clientOrgID: string) {
        const peerOrgID = ctx.stub.getMspID();
        if (clientOrgID != peerOrgID) {
            return { isbool: false, peerOrgID: peerOrgID };
        }
    }

    //获取客户端的ID
    getClientAccountID(ctx: GeoContext) {
        // Get ID of submitting client identity
        const accountID = ctx.clientIdentity.getID();
        console.log('clientAccountID:', accountID);
        return accountID;
    }

    // async queryGeo(ctx: GeoContext, db: string, queryString: string) {
    //     const couchdbconfig = await ctx.stub.getState('couchdbconfig');
    //     // console.log('couchdbconfig:',couchdbconfig.toString());

    //     const qs = JSON.parse(queryString);
    //     console.log('queryGeo:', { include_docs: true, format: 'geojson', ...qs });
    //     const nano = Nano(couchdbconfig.toString());
    //     const res = await nano.request({
    //         db,
    //         doc: '_design/ticket_geo',
    //         att: '_geo/positions',
    //         method: 'get',
    //         qs: { include_docs: true, format: 'geojson', ...qs }
    //     });
    //     console.log('geoQuery:', res);
    //     return res;
    // }

    async createGeoJSON(ctx: GeoContext, gid: string, geojson: string) {
        console.log('链码内的createGeoJSON: ', geojson);
        await ctx.stub.putState(gid, Buffer.from(geojson));
        return 'create done!';
    }

    async getGeoJSON(ctx: GeoContext, gid: string) {
        // console.log(gid);
        const json = await ctx.stub.getState(gid);
        return json.toString();
        // const res: Geojson = JSON.parse(json.toString());
        // console.log('链码内的getGeoJSON: ', json);
        // console.log('链码内的res: ', res);

        // return res;
    }

    async queryCircle(ctx: any, db: string, longitude: string, latitude: string, distance: string, limit: string) {

        const lng = parseFloat(longitude);
        const lat = parseFloat(latitude);
        const dis = parseInt(distance);
        const poi = getPoiRange(lng, lat, dis);
        const queryString = {
            q: `lon:[${poi[0][0]} TO ${poi[1][0]} ] AND lat:[${poi[0][1]} TO ${poi[1][1]}]`,
            // limit: parseInt(limit)
        };
        const couchdbconfig = await ctx.stub.getState('couchdbconfig');
        const nano = Nano(couchdbconfig.toString());
        const res = await nano.request({
            db,
            doc: '_design/search_geo_index',
            att: '_search/st_search',
            method: 'get',
            qs: { include_docs: true, ...queryString }
        });
        // return res;

        // console.log('查询的结果：', res);
        const arr = [];
        if (res?.rows) {
            for (let r of res.rows) {
                // console.log(r);
                if (dis >= getDistance([lng, lat], [r.fields.lon, r.fields.lat])) {
                    arr.push(r);
                }
            }
        }
        return arr;
    }

    async queryLucene(ctx: any, db: string, queryString: string) {
        const couchdbconfig = await ctx.stub.getState('couchdbconfig');
        const qs = JSON.parse(queryString);
        const nano = Nano(couchdbconfig.toString());
        console.log(couchdbconfig.toString())
        const res = await nano.request({
            db,
            doc: '_design/search_geo_index',
            att: '_search/st_search',
            method: 'get',
            qs: { include_docs: true, ...qs }
        });
        console.log('queryLucene', res)
        return res;
    }


    async queryGeo(ctx: any, db: string, queryString: string) {
        if (nano == null) {
            const couchdbconfig = await ctx.stub.getState('couchdbconfig');
            nano = Nano(couchdbconfig.toString());
        }
        const qs = JSON.parse(queryString);
        const res = await nano.request({
            db,
            doc: '_design/geo_index',
            att: '_geo/positions',
            method: 'get',
            // qs: { include_docs: true, format: 'geojson', ...qs }
            qs: { format: 'geojson', ...qs }
        });
        return res;
    }

    async queryPostgis(ctx: any, db: string = 'blockchain', queryString: string) {
        if (pool == undefined) {
            const queryPostgis = await ctx.stub.getState('postgisconfig');
            const config: PostgisConfig = JSON.parse(queryPostgis);
            postgisConfig.host = config.postgisHost;
            postgisConfig.user = config.postgisUser;
            postgisConfig.password = config.postgisPass;
            postgisConfig.port = parseInt(config.postgisPort);
            postgisConfig.database = db;
            console.log('初始化！！！')
            try {
                pool = new pg.Pool(postgisConfig);
                console.log('连接成功');
            } catch (error) {
                console.log('连接失败：', error);
            }
        }
        // console.log(pool.options)
        // else if (postgisConfig.database != db) {
        //     postgisConfig.database = db;
        //     pool = new pg.Pool(postgisConfig);
        // }
        const res = await postgisQuery(queryString, []);
        // console.log('查询结果', res.rows);
        return res.rows;
    }

    // async queryCircle(ctx: any, longitude: string, latitude: string, distance: string) {
    //     const lng = parseFloat(longitude);
    //     const lat = parseFloat(latitude);
    //     const dis = parseInt(distance);
    //     const poi = getPoiRange(lng, lat, dis);
    //     const querySelector = {
    //         selector: {
    //             "geometry.type": "Point",
    //             'geometry.coordinates[0]': { $gte: poi[0][0], $lte: poi[1][0] },
    //             // 'geometry.coordinates[1]': { $gte: poi[0][1], $lte: poi[1][1] }
    //         }
    //     };
    //     console.log(querySelector);
    //     const res = await this.queryByAdhoc(ctx, querySelector);
    //     return res;
    //     // console.log('查询的结果：',res);
    //     // const arr = [];
    //     // for (let r of res) {
    //     //     if (dis >= getDistance([lng, lat], [r.Record.properties.longitude, r.Record.properties.latitude])) {
    //     //         arr.push(r);
    //     //     }
    //     // }
    //     // return arr;
    // }

    async queryByAdhoc(ctx: any, queryString: any) {
        if (arguments.length < 1) {
            throw new Error('Incorrect number of arguments. Expecting ad-hoc string, which gets stringified for mango query');
        }

        if (!queryString) {
            throw new Error('queryString must not be empty');
        }

        let queryResults = await this.getQueryResultForQueryString(ctx, JSON.stringify(queryString));
        return queryResults;
    }

    /**
     * 对状态数据库执行查询
     * @param {*} ctx the transaction context
     * @param {any}  self within scope passed in
     * @param {String} queryString query string created prior to calling this fn
     */
    async getQueryResultForQueryString(ctx: Context, queryString: string) {
        console.log('getQueryResultForQueryString:', queryString);
        // console.log('- getQueryResultForQueryString queryString:\n' + queryString);
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        let results = await this.getAllResults(ctx, resultsIterator, false);
        return results;
    }

    /**
     * 获得所有的Result
     * @param {*} iterator HistoryQueryIterator within scope passed in
     * @param {Boolean} isHistory query string created prior to calling this fn
     */
    async getAllResults(ctx: any, iterator: any, isHistory: boolean) {
        let allResults = [];
        let res: any = { done: false, value: null };

        while (true) {
            res = await iterator.next();
            let jsonRes: any = {};
            if (res.value && res.value.value.toString()) {
                // 历史数据的解析
                if (isHistory && isHistory === true) {
                    //jsonRes.TxId = res.value.tx_id;
                    jsonRes.TxId = res.value.txId;
                    jsonRes.Timestamp = res.value.timestamp;
                    jsonRes.Timestamp = new Date(res.value.timestamp.seconds.low * 1000);
                    let ms = res.value.timestamp.nanos / 1000000;
                    jsonRes.Timestamp.setMilliseconds(ms);
                    if (res.value.is_delete) {
                        jsonRes.IsDelete = res.value.is_delete.toString();
                    } else {
                        // try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                        //     // report the movie ticket states during the asset lifecycle, just for asset history reporting
                        //     switch (jsonRes.Value.currentState) {
                        //         case 1:
                        //             jsonRes.Value.currentState = 'SELLING';
                        //             break;
                        //         case 2:
                        //             jsonRes.Value.currentState = 'PENDING';
                        //             break;
                        //         case 3:
                        //             jsonRes.Value.currentState = 'FINISHED';
                        //             break;
                        //         default: // else, unknown named query
                        //             jsonRes.Value.currentState = 'UNKNOWN';
                        //     }

                        // } catch (err) {
                        //     console.log(err);
                        //     jsonRes.Value = res.value.value.toString('utf8');
                        // }
                    }
                } else {
                    // 非历史数据查询
                    jsonRes.Key = res.value.key;
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                allResults.push(jsonRes);
            }
            // check to see if we have reached the end
            if (res.done) {
                // explicitly close the iterator
                console.log('iterator is done');
                await iterator.close();
                return allResults;
            }
        } // while true
    }




    async test1(ctx: GeoContext, config: string, db: string, issuer: string, ticketNumber: string) {
        const nano = Nano(config);

        const res = await nano.request({
            db,
            doc: '_design/ticket_geo',
            att: '_geo/positions',
            method: 'get',
            qs: { bbox: '115.60,39.10,117.80,42.23', include_docs: true, format: 'geojson' }
        });
        console.log('res:', res);
        return res;
    }

    async testQueryTPS(ctx: GeoContext) {
        return Math.random();
    }
}
