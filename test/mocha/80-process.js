const axios = require('axios');
const https = require('https');
const _util = require('./util');
const chunk = require('lodash.chunk');
const readline = require('readline');
const fs = require('fs').promises;

const pe = require('./process-events');
const referenceOperations = require('./reference-operations');

const axiosInstance = axios.create({
  baseURL: 'https://packet1.orgidpoc.com',
  timeout: 10000,
  httpsAgent: new https.Agent({rejectUnauthorized: false}),
  keepAlive: true,
  headers: {
    'Accept-Encoding': 'gzip',
  }
});

describe('event processing', () => {
  it('works', async function() {
    this.timeout(0);
    const {operationHash} = await pe.go();
    const targetOperationHashes = referenceOperations
      .map(o => o.meta.operationHash);
    targetOperationHashes.should.have.same.members(operationHash);
  });
  it.skip('writes events to file', async function() {
    this.timeout(0);
    /* eslint-disable max-len */
    const gossipUrl = '/consensus/continuity2017/voters/z6MktncRNwn9rQHsiZx7h3N2bJmviEnrYB1His21J6mxbEgq/gossip';
    const eventUrl = '/consensus/continuity2017/voters/z6MktncRNwn9rQHsiZx7h3N2bJmviEnrYB1His21J6mxbEgq/events-query';
    /* eslint-enable */
    const peerId = 'https://example.com/abc';

    const results = [];
    const maxDepth = 150;
    for(let chunkSize = 40; chunkSize <= 40; chunkSize += 5) {
      let totalEvents = 0;
      let totalOperations = 0;
      const masterTimer = _util.getTimer();
      let rounds = 0;
      let done = false;
      const creatorHeadsMap = new Map();
      let data;
      while(!done) {
        rounds ++;
        try {
          ({data} = await axiosInstance.post(gossipUrl, {
            creatorHeads: _util.strMapToObj(creatorHeadsMap),
            // maxDepth,
            peerId
          }));
        } catch(e) {
          console.log('EEEEEEE', e);
        }
        const {history: eventHash} = data;
        if(eventHash.length === 0) {
          done = true;
          continue;
        }

        const chunks = chunk(eventHash, chunkSize);
        const x = await Promise.all(chunks.map(async chunk => {
          const {data: events} = await axiosInstance.post(eventUrl, {
            eventHash: chunk,
          }, {responseType: 'stream'});
          const readInterface = readline.createInterface({
            input: events,
            crlfDelay: Infinity
          });
          let counter = 0;
          const eventsResult = [];
          for await (const x of readInterface) {
            totalEvents++;
            // if(totalEvents % 500 === 0) {
            //   console.log('Total', maxDepth, totalEvents, eventHash.length);
            // }
            const e = JSON.parse(x);
            if(e.event.type === 'WebLedgerOperationEvent') {
              totalOperations += e.event.operation.length;
            }
            e._index = counter;
            eventsResult.push(e);
            counter++;
          }
          return eventsResult;
        }));

        for(const [chunkIndex, chunk] of x.entries()) {
          for(const e of chunk) {
            const {_index, event: {type}} = e;

            const meta = {eventHash: chunks[chunkIndex][_index]};
            await fs.appendFile(
              'events.txt',
              JSON.stringify(meta) + '\n' +
              JSON.stringify(e) + '\n');

            if(type !== 'ContinuityMergeEvent') {
              continue;
            }

            const {event: {proof: {verificationMethod: creator}}} = e;

            const c = creatorHeadsMap.get(creator) || {generation: 0};
            creatorHeadsMap.set(creator, {
              eventHash: chunks[chunkIndex][_index],
              generation: c.generation + 1,
            });
          }
        }
      }
      const elapsedTime = Math.ceil(masterTimer.elapsed());
      console.log('CHUNK SIZE / TOTAL EVENT / TOTAL OPS / ELAPSED',
        chunkSize, totalEvents, totalOperations, elapsedTime);
      results.push({
        maxDepth,
        chunkSize,
        elapsedTime,
        rounds,
      });
    }

    const csv = _util.toCsv(results);
    console.log('------------ CSV ------------');
    process.stdout.write(csv + '\n');
  });
});
