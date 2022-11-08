'use strict';

import fs from 'fs';
import path from 'path';
import { nextblockPath } from '../config/pathConfig';
import pg from 'pg';
import SHA256 from 'crypto-js/sha256';

const salt = 'uJpYVidQAYR5nSCqqMc3hMbj9T';

async function processBlockEvent(configPath: string, pool: pg.Pool, channelname: string, block: any, use_pgdb: boolean) {
    return new Promise(async (resolve, reject) => {
        // reject the block if the block number is not defined
        if (block.header.number == undefined) {
            reject(new Error('Undefined block number'));
        }

        const blockNumber = block.header.number;

        // console.log(`------------------------------------------------`);
        // console.log(`Block Number: ${blockNumber}`);

        // reject if the data is not set
        if (block.data.data == undefined) {
            reject(new Error('Data block is not defined'));
        }

        const dataArray = block.data.data;

        // transaction filter for each transaction in dataArray
        const txSuccess = block.metadata.metadata[2];

        for (var dataItem in dataArray) {
            // reject if a timestamp is not set
            if (dataArray[dataItem].payload.header.channel_header.timestamp == undefined) {
                reject(new Error('Transaction timestamp is not defined'));
            }

            // tx may be rejected at commit stage by peers
            // only valid transactions (code=0) update the word state and off-chain db
            // filter through valid tx, refer below for list of error codes
            // https://github.com/hyperledger/fabric-sdk-node/blob/release-1.4/fabric-client/lib/protos/peer/transaction.proto
            if (txSuccess[dataItem] !== 0) {
                continue;
            }

            const timestamp = dataArray[dataItem].payload.header.channel_header.timestamp;

            // continue to next tx if no actions are set
            if (dataArray[dataItem].payload.data.actions == undefined) {
                continue;
            }

            // actions are stored as an array. In Fabric 1.4.3 only one
            // action exists per tx so we may simply use actions[0]
            // in case Fabric adds support for multiple actions
            // a for loop is used for demonstration
            const actions = dataArray[dataItem].payload.data.actions;

            // iterate through all actions
            for (var actionItem in actions) {
                // reject if a chaincode id is not defined
                if (actions[actionItem].payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name == undefined) {
                    reject(new Error('Chaincode name is not defined'));
                }

                const chaincodeID = actions[actionItem].payload.chaincode_proposal_payload.input.chaincode_spec.chaincode_id.name;
                if (chaincodeID !== 'geo') {
                    break;
                }
                // reject if there is no readwrite set
                if (actions[actionItem].payload.action.proposal_response_payload.extension.results.ns_rwset == undefined) {
                    reject(new Error('No readwrite set is defined'));
                }

                const rwSet = actions[actionItem].payload.action.proposal_response_payload.extension.results.ns_rwset;

                for (var record in rwSet) {
                    // ignore lscc events
                    if (rwSet[record].namespace != ('lscc' || '_lifecycle')) {
                        // create object to store properties
                        const writeObject: any = {};
                        writeObject.blocknumber = blockNumber;
                        writeObject.chaincodeid = chaincodeID;
                        writeObject.timestamp = timestamp;
                        writeObject.values = rwSet[record].rwset.writes;
                        // console.log('writeObject.values:', writeObject.values);
                        // console.log(`Transaction Timestamp: ${writeObject.timestamp}`);
                        // console.log(`ChaincodeID: ${writeObject.chaincodeid}`);

                        // send the object to a log file
                        const logPath = path.join(__dirname, nextblockPath, channelname + '_' + chaincodeID + '.log');
                        fs.appendFileSync(logPath, JSON.stringify(writeObject) + '\n');
                        // if pgdb is configured, then write to pgdb
                        if (use_pgdb) {
                            try {
                                await writeValuesToPgDB(pool, channelname, writeObject);
                            } catch (error) {
                                console.log(error);
                            }
                        }
                    }
                }
            }
        }

        // update the nextblock.txt file to retrieve the next block
        let data = parseInt(blockNumber, 10) + 1;
        fs.writeFileSync(configPath, data.toString());

        resolve(true);
    });
}

async function writeValuesToPgDB(pool: pg.Pool, channelname: string, writeObject: any) {
    return new Promise(async (resolve, reject) => {
        try {
            // define the database for saving block events by key - this emulates world state
            const tableName = channelname + '_' + writeObject.chaincodeid;
            // define the database for saving all block events - this emulates history
            const historydbname = tableName + '_history';
            const hashName = tableName + '_hash';
            // set values to the array of values received
            const values = writeObject.values;
            try {
                for (var sequence in values) {
                    let keyvalue = values[sequence];
                    keyvalue.key = keyvalue.key.replace(/\x00/g, '');
                    // if (!keyvalue.key || keyvalue.key.indexOf('org.ticketnet.geo') == -1) {
                    //     console.log('错误：没有这个键值');
                    //     break;
                    // }

                    let res1 = '';
                    // 如果是删除的属性
                    if (keyvalue.is_delete == true) {
                        const sql = deleteRecord(tableName, keyvalue.key);
                        await executeSQL(pool, sql);
                        res1 = 'delete';
                    } else {
                        if (isJSON(keyvalue.value)) {
                            const keyValueObj = JSON.parse(keyvalue.value);

                            // console.log('keyValueObj:', keyValueObj);
                            let geom_value_sql = '';

                            if (keyValueObj.geometry.type == 'Point') {
                                geom_value_sql = pointSQL(keyValueObj.geometry.coordinates);
                            } else if (keyValueObj.geometry.type == 'LineString') {
                                geom_value_sql = lineStringSQL(keyValueObj.geometry.coordinates);
                            } else if (keyValueObj.geometry.type == 'Polygon') {
                                geom_value_sql = polygonSQL(keyValueObj.geometry.coordinates[0]);
                            }

                            // 插入数据库，如果不存在，那么就插入，如果存在，那么就更新特定属性
                            const sql = insertGeomSQL(tableName, keyvalue.key, geom_value_sql);
                            // console.log('sql:', sql);
                            res1 = await executeSQL(pool, sql);
                        }
                    }
                    // 添加日志数据
                    keyvalue.timestamp = writeObject.timestamp;
                    keyvalue.blocknumber = parseInt(writeObject.blocknumber, 10);
                    keyvalue.sequences = parseInt(sequence, 10);
                    keyvalue.value = res1;
                    keyvalue.datahash = SHA256(JSON.stringify(res1)).toString();
                    const sql = insertHistorySQL(historydbname, keyvalue);
                    // console.log('insertHistorySQL:', sql);
                    const res2 = await executeSQL(pool, sql);
                    await insertHashTable(pool, hashName, res2);
                }
            } catch (error) {
                console.log(error);
                reject(error);
            }
        } catch (error) {
            console.error(`Failed to write to pgdb: ${error}`);
            reject(error);
        }
        resolve(true);
    });
}

function isJSON(value: string) {
    try {
        JSON.parse(value);
    } catch (e) {
        return false;
    }
    return true;
}

async function insertHashTable(pool: pg.Pool, hashName: string, resHistory: any) {
    // console.log('hashName:', hashName);
    // console.log('resHistory:', resHistory);
    // 插入geo表有数据
    if (resHistory != null) {
        let sql = `SELECT salthash FROM ${hashName} ORDER BY ID DESC LIMIT 1`;
        let resHash = await executeSQL(pool, sql);
        // console.log('resHash:', resHash);
        if (!resHash.salthash) {
            console.error('获取不到上一条hash表中的hash值');
        }
        const salthash = SHA256(SHA256(resHistory).toString() + salt + resHash.salthash).toString();
        sql = `INSERT INTO ${hashName}(his_id,salthash) VALUES('${resHistory.id}','${salthash}') RETURNING *`;
        // console.log('insertHashTable:', sql);
        await executeSQL(pool, sql);
    }
}

function pointSQL(arr: Array<number>) {
    return `ST_Transform(ST_GeomFromText('SRID=4326;POINT(${arr[0].toFixed(6)} ${arr[1].toFixed(6)})'),4796)`;
}

function lineStringSQL(arr: Array<number>) {
    let str = '';
    arr.map((i: any) => {
        i[0] = i[0].toFixed(6);
        i[1] = i[1].toFixed(6);
        str +=
            JSON.stringify(i)
                .replace(/\]|\[|"/g, '')
                .replace(',', ' ') + ',';
    });
    return `ST_Transform(ST_GeomFromText('SRID=4326;LINESTRING(${str.substr(0, str.length - 1)})'),4796)`;
}
function polygonSQL(arr: Array<number>) {
    let str = '';
    arr.map((i: any) => {
        i[0] = i[0].toFixed(6);
        i[1] = i[1].toFixed(6);
        str +=
            JSON.stringify(i)
                .replace(/\]|\[|"/g, '')
                .replace(',', ' ') + ',';
    });
    return `ST_Transform(ST_GeomFromText('SRID=4326;POLYGON((${str.substr(0, str.length - 1)}))'),4796)`;
}
function insertGeomSQL(tableName: string, gid: string, values: string) {
    return `INSERT INTO ${tableName}(gid,geom) VALUES ('${gid}',${values}) ON CONFLICT (gid) DO UPDATE SET "geom" = excluded."geom" RETURNING *;`;
}

function insertHistorySQL(tableName: string, obj: any) {
    const valueObj = obj.value;
    delete obj.value;
    const keys = Object.keys(obj);
    const values = Object.values(obj);
    const vv = JSON.stringify(values).replace(/\[|]/g, '').replace(/\"/g, "'");
    return `INSERT INTO ${tableName}(${keys},value) VALUES(${vv},'${JSON.stringify(valueObj)}') RETURNING *`;
}

function deleteRecord(tableName: string, key: string) {
    return `DELETE FROM ${tableName} WHERE keys='${key}'  RETURNING *`;
}

async function executeSQL(pool: pg.Pool, text: string, values: any = []) {
    try {
        // console.log(text)
        const res = await pool.query(text, values);
        // console.log('执行成功后的数据:', res.rows[0]);
        // client.release();
        return res.rows[0];
    } catch (error) {
        console.log('报错了，错误为：', error);
        // return;
    }
}

export = processBlockEvent;
