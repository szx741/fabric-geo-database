/*
 * @Author: szx
 * @Date: 2021-10-31 15:53:30
 * @LastEditTime: 2021-11-07 18:36:11
 * @Description:
 * @FilePath: /commercial-paper/caliper-workspace/workload/circle.js
 */
'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { randomRadius, randomPoint, randomPoints,importLineString, randomLineString, randomPolygon } = require('./randomCreate');

const contract_userID = '_Org2MSP_Org2MSPuser2';

class MyWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        const n =1000;
        for (let i = 0; i < this.roundArguments.objects; i++) {
            let arr = randomPoints(this.roundArguments.count);
            // let arr = randomLineString(this.roundArguments.count);
            // let arr = randomPolygon(this.roundArguments.count);

            // let arr = importLineString();
            for (let j = 0; j < this.roundArguments.count; j++) {
                const request = {
                    contractId: this.roundArguments.contractId,
                    contractFunction: 'createGeoJSON',
                    invokerIdentity: contract_userID,
                    contractArguments: [this.workerIndex + '_' + (j+n).toString(), JSON.stringify(arr[j])],
                    readOnly: false
                };
                await this.sutAdapter.sendRequests(request);
                // const res = await this.sutAdapter.sendRequests(request);
                // console.log('Worker' + this.workerIndex + ' create point' + '_' + i + '_' + j + '_' + res.status.result.toString());
            }

            // arr = randomLineString(this.roundArguments.count);
            // for (let j = 0; j < this.roundArguments.count; j++) {
            //     const request = {
            //         contractId: this.roundArguments.contractId,
            //         contractFunction: 'createGeoJSON',
            //         invokerIdentity: contract_userID,
            //         contractArguments: [this.workerIndex + '_' + (j + n*2).toString(), JSON.stringify(arr[j])],
            //         readOnly: false
            //     };
            //     const res = await this.sutAdapter.sendRequests(request);
            //     console.log('Worker' + this.workerIndex + ' create LineString' + '_' + i + '_' + j + '_' + res.status.result.toString());
            // }

            // arr = randomPolygon(this.roundArguments.count);
            // for (let j = 0; j < this.roundArguments.count; j++) {
            //     const request = {
            //         contractId: this.roundArguments.contractId,
            //         contractFunction: 'createGeoJSON',
            //         invokerIdentity: contract_userID,
            //         contractArguments: [this.workerIndex + '_' + (j + n*3).toString(), JSON.stringify(arr[j])],
            //         readOnly: false
            //     };
            //     const res = await this.sutAdapter.sendRequests(request);
            //     console.log('Worker' + this.workerIndex + ' create Polygon' + '_' + i + '_' + j + '_' + res.status.result.toString());
            // }
        }
    }

    async submitTransaction() {
  
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
