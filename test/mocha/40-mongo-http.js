const axios = require('axios');
const https = require('https');
const database = require('bedrock-mongodb');
const _util = require('./util');

const axiosInstance = axios.create({
  baseURL: 'https://bedrock.localhost:18443',
  timeout: 1000,
  httpsAgent: new https.Agent({rejectUnauthorized: false}),
  keepAlive: true,
});

describe.skip('mongo-http', () => {
  it.skip('works', async () => {
    await axiosInstance.post('/gossip', {x: 'y'});
  });
  it('does series for different values', async function() {
    this.timeout(0);
    const collection1 = database.collections['event-1'];
    const collection2 = database.collections['event-2'];
    const dumpEventHashes = await _util.getDumpEventHashes(
      {collection: collection1});
    const results = [];
    for(let depth = 60; depth <= 400; depth += 10) {
      console.log('DEPTH', depth);
      let creatorGenerations = await _util.getCreatorMaxGenerations(
        {collection: collection2});
      const masterTimer = _util.getTimer();
      let rounds = 0;
      let done = false;
      const creators = new Map();
      const eventHash = [];
      while(!done) {
        // console.log('111111111', creatorGenerations);
        rounds++;
        // console.log('ROUNDS', rounds);
        const {data: y} = await axiosInstance.post(
          '/gossip', {depth, query: creatorGenerations});

        // console.log('YYYYYYYYY', JSON.stringify(y, null, 2));

        if(y.length === 0) {
          done = true;
          continue;
        }
        for(const e of y) {
          const {meta: {creator, generation}} = e;
          eventHash.push(e.meta.eventHash);
          const c = creators.get(creator);
          if(c === undefined || c < generation) {
            creators.set(creator, generation);
          }
        }
        // console.log('UUUUUUUU', Array.from(creators).sort((a, b) => {
        //   return a[0].localeCompare(b[0]);
        // }));
        creatorGenerations = _util.strMapToObj(creators);
      }
      const elapsedTime = Math.ceil(masterTimer.elapsed());
      // console.log('AAAAav', dumpEventHashes.length);
      // console.log('BBBBBbbb', eventHash.length);
      // console.log('CCCCC', JSON.stringify(eventHash, null, 2));
      // console.log('diff', dumpEventHashes
      //   .filter(e => !eventHash.includes(e)));
      dumpEventHashes.filter(e => !eventHash.includes(e))
        .should.have.same.members(
          ['zQmPTdMXGxd6UGKhVbZ5NYTnJBMWsFimeFZEEfQAJvZNrFu']);

      results.push({
        depth,
        elapsedTime,
        rounds,
      });
    }
    const csv = _util.toCsv(results);
    console.log('------------ CSV ------------');
    process.stdout.write(csv + '\n');
  });
});
