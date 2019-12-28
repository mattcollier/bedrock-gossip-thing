const axios = require('axios');
const https = require('https');
const _util = require('./util');
const chunk = require('lodash.chunk');
const readline = require('readline');
// const ndjson = require('ndjson');
const pool = require('./pool');
const {Readable} = require('stream');

const axiosInstance = axios.create({
  baseURL: 'https://bedrock.localhost:18443',
  timeout: 1000,
  httpsAgent: new https.Agent({rejectUnauthorized: false}),
  keepAlive: true,
});

describe('node-catchup', () => {
  it('does something', async function() {
    this.timeout(0);
    /* eslint-disable max-len */
    const gossipUrl = '/consensus/continuity2017/voters/z6Mkw3PA7LEHxGUJbMyMWA5oma9bkKJ7rFxrebwjqXgwuDEk/gossip';
    /* eslint-enable */
    const peerId = 'https://example.com/abc';

    const results = [];
    const maxDepth = 100;
    for(let chunkSize = 150; chunkSize <= 150; chunkSize += 0) {
      let totalEvents = 0;
      const masterTimer = _util.getTimer();
      let rounds = 0;
      let done = false;
      const creatorHeadsMap = new Map();
      while(!done) {
        // console.log('LLLLLLLLLL', _util.strMapToObj(creatorHeadsMap));
        rounds ++;
        const {data} = await axiosInstance.post(gossipUrl, {
          creatorHeads: _util.strMapToObj(creatorHeadsMap),
          maxDepth,
          peerId
        });
        // console.log('DDDDDdv', data);
        const {history: eventHash} = data;
        if(eventHash.length === 0) {
          done = true;
          continue;
        }

        const chunks = chunk(eventHash, chunkSize);
        const x = await Promise.all(chunks.map(async chunk => {
          const eventsResult = await pool.exec(
            'getEvents', [{eventHash: chunk}]);
          return eventsResult;
        }));

        for(let chunk of x) {
          if(typeof chunk !== 'string') {
            console.log('ZZZZZZZ', chunk);
            chunk = JSON.stringify(chunk);
          }
          const s = new Readable();
          s.push(chunk);
          s.push(null);
          const readInterface = readline.createInterface({
            input: s,
            crlfDelay: Infinity
          });
          for await (const eventText of readInterface) {
            totalEvents++;
            const e = JSON.parse(eventText);
            if(e.event.type !== 'ContinuityMergeEvent') {
              continue;
            }
            const {_index, event: {proof: {verificationMethod: creator}}} = e;
            // eventHash.push(e.meta.eventHash);
            const c = creatorHeadsMap.get(creator) || {generation: 0};
            creatorHeadsMap.set(creator, {
              eventHash: eventHash[_index],
              generation: c.generation + 1,
            });
          }
        }
      }
      const elapsedTime = Math.ceil(masterTimer.elapsed());
      console.log('CHUNKSIZE / TOTAL EVENT / ELAPSED',
        chunkSize, totalEvents, elapsedTime);
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
      const masterTimer = _util.getTimer();
      let rounds = 0;
      let done = false;
      const creatorHeadsMap = new Map();
      while(!done) {
        // console.log('LLLLLLLLLL', _util.strMapToObj(creatorHeadsMap));
        rounds ++;
        const {data} = await axiosInstance.post(gossipUrl, {
          creatorHeads: _util.strMapToObj(creatorHeadsMap),
          maxDepth,
          peerId
        });
        // console.log('DDDDDdv', data);
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
              counter++;
              continue;
            }
            e._index = counter;
            eventsResult.push(e);
            counter++;
          }
          return eventsResult;
        }));

        for(const chunk of x) {
          for(const e of chunk) {
            const {_index, event: {proof: {verificationMethod: creator}}} = e;
            // eventHash.push(e.meta.eventHash);
            const c = creatorHeadsMap.get(creator) || {generation: 0};
            creatorHeadsMap.set(creator, {
              eventHash: eventHash[_index],
              generation: c.generation + 1,
            });
          }
        }
      }
      const elapsedTime = Math.ceil(masterTimer.elapsed());
      console.log('CHUNK SIZE / TOTAL EVENT / ELAPSED',
        chunkSize, totalEvents, elapsedTime);
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
  it('test maxDepth', async function() {
    this.timeout(0);
    /* eslint-disable max-len */
    const gossipUrl = '/consensus/continuity2017/voters/z6Mkw3PA7LEHxGUJbMyMWA5oma9bkKJ7rFxrebwjqXgwuDEk/gossip';
    const eventUrl = '/consensus/continuity2017/voters/z6Mkw3PA7LEHxGUJbMyMWA5oma9bkKJ7rFxrebwjqXgwuDEk/events-query';
    /* eslint-enable */
    const peerId = 'https://example.com/abc';

    const results = [];
    for(let maxDepth = 10; maxDepth <= 400; maxDepth += 10) {
      let totalEvents = 0;
      const masterTimer = _util.getTimer();
      let rounds = 0;
      let done = false;
      const creatorHeadsMap = new Map();
      while(!done) {
        // console.log('LLLLLLLLLL', _util.strMapToObj(creatorHeadsMap));
        rounds ++;
        const {data} = await axiosInstance.post(gossipUrl, {
          creatorHeads: _util.strMapToObj(creatorHeadsMap),
          maxDepth,
          peerId
        });
        // console.log('DDDDDdv', data);
        const {history: eventHash} = data;
        if(eventHash.length === 0) {
          done = true;
          continue;
        }

        const {data: events} = await axiosInstance.post(eventUrl, {
          eventHash,
        }, {responseType: 'stream'});
        // console.log('EEEEee', events);
        // events.pipe(ndjson.parse()).on('data', d => {
        //   console.log('DDDDD', d);
        // });
        const readline = require('readline');
        const readInterface = readline.createInterface({
          input: events,
          crlfDelay: Infinity
        });
        let counter = 0;
        for await (const x of readInterface) {
          totalEvents++;
          // if(totalEvents % 500 === 0) {
          //   console.log('Total', maxDepth, totalEvents, eventHash.length);
          // }
          // console.log('XXXXxxx', JSON.parse(x));
          const e = JSON.parse(x);
          if(e.event.type !== 'ContinuityMergeEvent') {
            counter++;
            continue;
          }
          const {event: {proof: {verificationMethod: creator}}} = e;
          // eventHash.push(e.meta.eventHash);
          const c = creatorHeadsMap.get(creator) || {generation: 0};
          creatorHeadsMap.set(creator, {
            eventHash: eventHash[counter],
            generation: c.generation + 1,
          });
          counter++;
        }
      }
      const elapsedTime = Math.ceil(masterTimer.elapsed());
      console.log('MAXDEPTH /TOTAL EVENT / ELAPSED',
        maxDepth, totalEvents, elapsedTime);
      results.push({
        maxDepth,
        elapsedTime,
        rounds,
      });
    }

    const csv = _util.toCsv(results);
    console.log('------------ CSV ------------');
    process.stdout.write(csv + '\n');
  });
});
