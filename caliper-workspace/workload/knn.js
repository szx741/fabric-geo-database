/*
 * @Author: szx
 * @Date: 2021-10-31 15:53:30
 * @LastEditTime: 2021-11-07 18:55:21
 * @Description:
 * @FilePath: /commercial-paper/caliper-workspace/workload/knn.js
 */
'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { randomRadius, randomPoint, singlePolygon, randomPoints, randomLineString, randomPolygon, singlePoint } = require('./randomCreate');

// const contract_userID = '_Org2MSP_Org2MSPuser2';
const contract_userID = 'Org1MSPuser1';


class MyWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        // const n = 2000;
        // for (let i = 0; i < this.roundArguments.objects; i++) {
        //     const arr = randomPolygon(this.roundArguments.count);
        //     for (let j = 0; j < this.roundArguments.count; j++) {
        //         const request = {
        //             contractId: this.roundArguments.contractId,
        //             contractFunction: 'createGeoJSON',
        //             invokerIdentity: contract_userID,
        //             contractArguments: [this.workerIndex + '_' + (j + n).toString(), JSON.stringify(arr[j])],
        //             readOnly: false
        //         };
        //         const res = await this.sutAdapter.sendRequests(request);
        //         console.log('Worker' + this.workerIndex + ' create Polygon' + '_' + i + '_' + j + '_' + res.status.result.toString());
        //     }
        // }
    }

    // 和多边形相交
    async submitTransaction() {
        const queryString = JSON.stringify({
            g: singlePoint(),
            nearest: true,
            limit: 200
        });
        const myArgs = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'queryGeo',
            invokerIdentity: contract_userID,
            contractArguments: ['mychannel_geo', queryString],
            readOnly: true
        };


        // luncene
        // const point = randomPoint();
        // const queryString = JSON.stringify({
        //     q: '*:*',
        //     sort: `"<distance,lon,lat,${point[0]},${point[1]},km>"`,
        //     limit: 50
        // });
        // const myArgs = {
        //     contractId: this.roundArguments.contractId,
        //     contractFunction: 'queryLucene',
        //     invokerIdentity: contract_userID,
        //     contractArguments: ['mychannel_geo', queryString],
        //     readOnly: true
        // };
        await this.sutAdapter.sendRequests(myArgs);

        // const res = await this.sutAdapter.sendRequests(myArgs);
        // console.log(res.status.result.toString());

        // const res = await this.sutAdapter.sendRequests(myArgs);
        // const tmp = JSON.parse(res.status.result.toString());
        // console.log(tmp.features.length);
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
