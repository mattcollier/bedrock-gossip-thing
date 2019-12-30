const axios = require('axios');
const https = require('https');
const _util = require('./util');
const chunk = require('lodash.chunk');
const readline = require('readline');

const axiosInstance = axios.create({
  baseURL: 'https://bedrock.localhost:18443',
  timeout: 1000,
  httpsAgent: new https.Agent({rejectUnauthorized: false}),
  keepAlive: true,
});

describe('node-catchup', () => {
  it('chunks with Promise.all', async function() {
    this.timeout(0);
    /* eslint-disable max-len */
    const gossipUrl = '/consensus/continuity2017/voters/z6Mkw3PA7LEHxGUJbMyMWA5oma9bkKJ7rFxrebwjqXgwuDEk/gossip';
    const eventUrl = '/consensus/continuity2017/voters/z6Mkw3PA7LEHxGUJbMyMWA5oma9bkKJ7rFxrebwjqXgwuDEk/events-query';
    /* eslint-enable */
    const peerId = 'https://example.com/abc';

    const results = [];
    const maxDepth = 150;
    for(let chunkSize = 200; chunkSize <= 200; chunkSize += 0) {
      let totalEvents = 0;
      let totalOperations = 0;
      const masterTimer = _util.getTimer();
      let rounds = 0;
      let done = false;
      const creatorHeadsMap = new Map();
      while(!done) {
        rounds ++;
        const {data} = await axiosInstance.post(gossipUrl, {
          creatorHeads: _util.strMapToObj(creatorHeadsMap),
          maxDepth,
          peerId
        });
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
            if(e.event.type !== 'ContinuityMergeEvent') {
              if(e.event.type === 'WebLedgerOperationEvent') {
                totalOperations += e.event.operation.length;
              }
              counter++;
              continue;
            }
            e._index = counter;
            eventsResult.push(e);
            counter++;
          }
          return eventsResult;
        }));

        for(const [chunkIndex, chunk] of x.entries()) {
          for(const e of chunk) {
            const {_index, event: {proof: {verificationMethod: creator}}} = e;
            // eventHash.push(e.meta.eventHash);
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
