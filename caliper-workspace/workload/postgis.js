/*
 * @Author: szx
 * @Date: 2021-10-31 15:53:30
 * @LastEditTime: 2021-11-07 18:36:11
 * @Description:
 * @FilePath: /commercial-paper/caliper-workspace/workload/circle.js
 */
'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { randomRadius, randomPoint, randomPoints, randomLineString, randomPolygon, circleSQL,intersectsSQL,knnSQL } = require('./randomCreate');

// const contract_userID = '_Org2MSP_Org2MSPuser2';
const contract_userID = 'Org1MSPuser1';


class MyWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
    }

    async submitTransaction() {
        // const radius = randomRadius(1000, 10000);
        // const point = randomPoint();

        // const queryString =circleSQL();
        // const queryString =intersectsSQL();
        const queryString =knnSQL();

        const myArgs = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'queryPostgis',
            invokerIdentity: contract_userID,
            contractArguments: ['blockchain', queryString],
            readOnly: true
        };
        await this.sutAdapter.sendRequests(myArgs);

        // const res = await this.sutAdapter.sendRequests(myArgs);
        // const tmp = JSON.parse(res.status.result.toString());
        // console.log(tmp.length);
    }

    async cleanupWorkloadModule() {
        // for (let i = 0; i < this.roundArguments.objects; i++) {
        //     const ticketNumber = this.workerIndex + '000' + i;
        //     console.log(`Worker ${this.workerIndex}: Deleting ticket ${this.workerIndex}000${i}`);
        //     const request = {
        //         contractId: this.roundArguments.contractId,
        //         contractFunction: 'deleteTicket',
        //         invokerIdentity: contract_userID,
        //         contractArguments: [ticketData.issuer, ticketNumber],
        //         readOnly: false
        //     };
        //     let res = await this.sutAdapter.sendRequests(request);
        //     console.log(res.status.result.toString());
        //     // const req = {
        //     //     contractId: this.roundArguments.contractId,
        //     //     contractFunction: 'getTicket',
        //     //     invokerIdentity: contract_userID,
        //     //     contractArguments: [ticketData.issuer, '000' + i],
        //     //     readOnly: true
        //     // };
        //     // res = await this.sutAdapter.sendRequests(req);
        //     // console.log(res.status.result.toString());
        // }
    }
}

function createWorkloadModule() {
    return new MyWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
