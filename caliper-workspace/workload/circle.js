/*
 * @Author: szx
 * @Date: 2021-10-31 15:53:30
 * @LastEditTime: 2021-11-07 18:36:11
 * @Description:
 * @FilePath: /commercial-paper/caliper-workspace/workload/circle.js
 */
'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { randomRadius, randomPoint, randomPoints, randomLineString, randomPolygon } = require('./randomCreate');

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

        const point = randomPoint();
        const radius = randomRadius(500, 5000);

        const queryString = JSON.stringify({
            lon: point[0].toString(),
            lat: point[1].toString(),
            radius: radius.toString(),
            limit:200
        });
        const myArgs = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'queryGeo',
            invokerIdentity: contract_userID,
            contractArguments: ['mychannel_geo', queryString],
            readOnly: true
        };


        // ======================lucene=========
        
        // const myArgs = {
        //     contractId: this.roundArguments.contractId,
        //     contractFunction: 'queryCircle',
        //     invokerIdentity: contract_userID,
        //     contractArguments: ['mychannel_geo',point[0],point[1],radius ,1],
        //     readOnly: true
        // };

        await this.sutAdapter.sendRequests(myArgs);
                // console.log(res.status.result.toString());
        // console.log(res);


        // const res = await this.sutAdapter.sendRequests(myArgs);
        // const tmp = JSON.parse(res.status.result.toString());
        // if(tmp.features.length>100) 
            // console.log(tmp.features.length);
    }


    // async submitTransaction() {
    //     // const workerIndex = Math.floor(Math.random()*20);
    //     // const j =Math.floor( Math.random()*500+1000);
    //     // const gid = workerIndex.toString()+'_'+j.toString();
        
    //     // const myArgs = {
    //     //     contractId: this.roundArguments.contractId,
    //     //     contractFunction: 'getGeoJSON',
    //     //     invokerIdentity: contract_userID,
    //     //     contractArguments: [gid],
    //     //     readOnly: true
    //     // };
    //     // let res=1;
    //     // await this.sutAdapter.sendRequests(myArgs);
    //     // const res = await this.sutAdapter.sendRequests(myArgs);
    //     // console.log(res.status.result.toString());
    // }

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
