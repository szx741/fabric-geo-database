'use strict';

// 后台运行 ，并将输出打印至log_blockEventListener
// node blockEventListener.js 0 >> log_blockEventListener1.log 2>&1 &
// node blockEventListener.js 1 >> log_blockEventListener2.log 2>&1 &
// 删除进程
// kill -s 9 `ps | grep node | awk '{print $1}'`
// 清除这个两个文件，一个是日志文件，还有一个是当前区块的号码，删除区块号码后，会重新从0区块读取，或者可以自己指定区块的号码。
// rm log_blockEventListener*.log nextblock*.txt
import { Wallets, Gateway, BlockEvent } from 'fabric-network';
import fs from 'fs';
import path from 'path';

// import couchdbutil from './couchdbutil.js';
import processBlockEvent from './blockProcessing';
import { initGatewayForOrg1, initGatewayForOrg2 } from '../account/init-gateway';
import { config } from '../config/listenConfig';
import { nextblockPath } from '../config/pathConfig';
import pg from 'pg';
const channelid: string = config.channelid;
const peer_name = config.peer_name;
const use_db: boolean = config.use_db;

let configPath = path.join(__dirname, 'nextblock.txt');
const channelName = 'mychannel';
const chaincodeName = 'geo';
const org1 = 'Org1MSP';
const Org1UserId = 'org1User1';
const org2 = 'Org2MSP';
const Org2UserId = 'org2User1';

const RED = '\x1b[31m\n';
const GREEN = '\x1b[32m\n';
const YELLOW = '\x1b[33m\n';
const BLUE = '\x1b[34m\n';
const MAGENTA = '\x1b[35m\n';
const CYAN = '\x1b[36m\n';
const RESET = '\x1b[0m';

const ProcessingMap = new Map<string, any>();

const postgisConfig = {
    //基本属性
    user: 'admin', //postgreSQL数据库默认用户postgres
    host: 'localhost',
    database: 'blockchain', //空间数据库名称
    password: 'adminpw',
    port: 25432,

    // 扩展属性
    max: 20, // 连接池最大连接数
    idleTimeoutMillis: 3000 // 连接最大空闲时间 3s
};

async function main() {
    const gatewayOrg1 = await initGatewayForOrg1(Org1UserId);
    if (gatewayOrg1 == undefined) {
        throw new Error('获取不到GateWway');
    }
    const network = await gatewayOrg1.getNetwork(channelName);

    const database = process.argv.splice(2)[0];
    if (database == '1') {
        postgisConfig.port = 25433;
        configPath = path.join(__dirname, 'nextblock1.txt');
    } else if (database == '2') {
        postgisConfig.port = 25434;
        configPath = path.join(__dirname, 'nextblock2.txt');
    } else if (database == '3') {
        postgisConfig.port = 25435;
        configPath = path.join(__dirname, 'nextblock3.txt');
    }
    try {
        const pool = new pg.Pool(postgisConfig);

        //  初始化Block记录为0
        let nextBlock = 0;
        // check to see if there is a next block already defined
        if (fs.existsSync(configPath)) {
            // read file containing the next block to read
            nextBlock = parseInt(fs.readFileSync(configPath, 'utf8'));
        } else {
            // store the next block as 0
            fs.writeFileSync(configPath, nextBlock.toString());
        }

        const listener = async (blockEvent: BlockEvent) => {
            // console.log(blockEvent)
            const blockNumber: Long = blockEvent.blockNumber;
            const blockData = blockEvent.blockData;
            // 按区块编号将区块添加到ProcessingMap中
            const blockNum: string = parseInt(blockNumber.toString(), 10).toString();
            await ProcessingMap.set(blockNum, blockData);
            console.log(ProcessingMap);
            console.log(`Added block ${blockNum} to ProcessingMap`);
        };
        const options = {
            startBlock: nextBlock
        };

        await network.addBlockListener(listener, options);

        console.log(`Listening for block events, nextblock: ${nextBlock}`);

        // start processing, looking for entries in the ProcessingMap
        processPendingBlocks(pool, ProcessingMap);
    } catch (runError: any) {
        console.error(`Error in transaction: ${runError}`);
        if (runError.stack) {
            console.error(runError.stack);
        }
        process.exit(1);
    }
}

// listener function to check for blocks in the ProcessingMap
async function processPendingBlocks(pool: pg.Pool, ProcessingMap: Map<string, any>) {
    setTimeout(async () => {
        // get the next block number from nextblock.txt
        let nextBlockNumber: string = fs.readFileSync(configPath, 'utf8');
        let processBlock: any;

        do {
            // get the next block to process from the ProcessingMap
            processBlock = ProcessingMap.get(nextBlockNumber);

            if (processBlock == undefined) {
                break;
            }

            try {
                await processBlockEvent(configPath, pool, channelid, processBlock, use_db);
            } catch (error) {
                console.error(`Failed to process block: ${error}`);
            }

            // if successful, remove the block from the ProcessingMap
            ProcessingMap.delete(nextBlockNumber);

            // increment the next block number to the next block
            let data = parseInt(nextBlockNumber, 10) + 1;
            fs.writeFileSync(configPath, data.toString());

            // retrive the next block number to process
            nextBlockNumber = fs.readFileSync(configPath, 'utf8');
            console.log('nextBlockNumber:', nextBlockNumber);
        } while (true);

        processPendingBlocks(pool, ProcessingMap);
    }, 250);
}

main().catch((e) => {
    console.log('Error in setup: .');
    console.log(e);
    console.log(e.stack);
    process.exit(-1);
});
