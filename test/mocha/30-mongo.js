const database = require('bedrock-mongodb');
const _util = require('./util');

/* eslint-disable max-len */

describe('mongod', () => {
  it.skip('inserts', async function() {
    this.timeout(0);
    await _insertEvents();
  });
  it('gets max generation', async () => {
    const collection = database.collections['event-1'];
    await _getCreatorMaxGenerations({collection});
  });
  it.skip('inserts genesis', async () => {
    const collection2 = database.collections['event-2'];
    await _insertGenesisMerge({collection: collection2});
  });
  it.skip('does a query', async () => {
    const collection1 = database.collections['event-1'];
    const collection2 = database.collections['event-2'];
    const query = await _getCreatorMaxGenerations({collection: collection2});
    console.log('QQQQQv', query);

    const x = await _queryNode({collection: collection1, query});
  });
  it('does series for different values', async function() {
    this.timeout(0);
    const collection1 = database.collections['event-1'];
    const collection2 = database.collections['event-2'];
    const dumpEventHashes = await _getDumpEventHashes(
      {collection: collection1});
    const results = [];
    for(let depth = 10; depth <= 1000; depth += 10) {
      console.log('DEPTH', depth);
      let creatorGenerations = await _getCreatorMaxGenerations(
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
        const y = await _queryNode(
          {collection: collection1, query: creatorGenerations, depth});
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
      // console.log('AAAAav', dumpEventHashes.length);
      // console.log('BBBBBbbb', eventHash.length);
      // console.log('CCCCC', JSON.stringify(eventHash, null, 2));
      // console.log('diff', dumpEventHashes
      //   .filter(e => !eventHash.includes(e)));
      // dumpEventHashes.filter(e => !eventHash.includes(e))
      //   .should.have.same.members(
      //     ['zQmPTdMXGxd6UGKhVbZ5NYTnJBMWsFimeFZEEfQAJvZNrFu']);
      results.push({
        depth,
        elapsedTime: Math.ceil(masterTimer.elapsed()),
        rounds,
      });
    }
    const csv = _util.toCsv(results);
    console.log('------------ CSV ------------');
    process.stdout.write(csv + '\n');
  });
});

async function _queryNode({query, collection, depth = 10}) {
  const localGenerations = await _getCreatorMaxGenerations({collection});
  const allCreators = new Set(
    [...Object.keys(localGenerations), ...Object.keys(query)]);
  const combinedCreators = {};
  for(const c of allCreators) {
    combinedCreators[c] = query[c] || 0;
  }
  const startCreatorGenerations = {};
  for(const c of allCreators) {
    startCreatorGenerations[c] = localGenerations[c] ?
      Math.min(localGenerations[c], combinedCreators[c] + depth) : 0;
  }
  // console.log('PPPPP', startCreatorGenerations);

  const startQuery = {$or: []};
  for(const s in startCreatorGenerations) {
    startQuery.$or.push({
      'meta.creator': s,
      'meta.generation': startCreatorGenerations[s],
    });
  }
  // console.log('SSSSSSSSS', startQuery);

  const restrictSearchWithMatch = {$nor: []};
  for(const s in combinedCreators) {
    restrictSearchWithMatch.$nor.push({
      'meta.creator': s,
      'meta.generation': {$lte: combinedCreators[s]},
    });
  }
  // console.log('RRRRRRRRRRR', restrictSearchWithMatch);

  const timer = _util.getTimer();
  const x = await collection.aggregate([{
    $match: startQuery
  }, {
    $group: {
      _id: null,
      startWith: {$addToSet: '$meta.eventHash'}
    }
  }, {
    $graphLookup: {
      from: collection.s.name,
      startWith: '$startWith',
      connectFromField: 'event.parentHash',
      connectToField: 'meta.eventHash',
      as: '_parents',
      restrictSearchWithMatch
    }
  }, {
    $unwind: '$_parents'
  }, {
    $replaceRoot: {newRoot: '$_parents'},
  }]).toArray();
  // }*/]).explain('executionStats');
  // console.log('FFFFFFffff', JSON.stringify(x, null, 2));

  // console.log('QUERY TIME', timer.elapsed());
  // console.log('QUERY RESPONSE LENGTH', x.length);
  return x.map(({event, meta}) => ({event, meta}));
}

async function _getDumpEventHashes({collection}) {
  const x = await collection.find({}, {
    _id: 0,
    'meta.eventHash': 1,
  }).toArray();
  return x.map(r => r.meta.eventHash);
}

async function _getCreatorMaxGenerations({collection}) {
  const creators = await collection.aggregate([{
    $group: {
      _id: '$meta.creator',
      maxGeneration: {$max: '$meta.generation'}
    }
  }]).toArray();

  const result = {};
  for(const c of creators) {
    result[c._id] = c.maxGeneration;
  }
  // console.log('CCCCCCCC', result);
  return result;
}

async function _insertEvents() {
  const mergeHashes = new Set();
  const readline = require('readline');
  const fs = require('fs');
  const readInterface = readline.createInterface({
    input: fs.createReadStream('./mocha/events.dump'),
    // output: process.stdout,
    // console: false,
    crlfDelay: Infinity
  });

  const collection = database.collections['event-1'];

  let counter = 0;
  for await (const line of readInterface) {
    counter++;
    if(counter % 100 === 0) {
      console.log('complete counter', counter);
    }
    const e = JSON.parse(line);
    // e._key = e.meta.eventHash;
    // console.log('EEEEEE', JSON.stringify(e, null, 2));
    if(e.event.type !== 'ContinuityMergeEvent') {
      continue;
    }
    e.meta.generation = e.meta.continuity2017.generation;
    e.meta.creator = e.meta.continuity2017.creator;
    delete e._id;

    mergeHashes.add(e.meta.eventHash);
    const doc = await collection.insert(e);
    // for(const parent of e.event.parentHash) {
    //   if(!mergeHashes.has(parent)) {
    //     continue;
    //   }
    //   const t = await edgeCollection.save({
    //     _from: `vertices/${parent}`,
    //     _to: `vertices/${e.meta.eventHash}`,
    //   });
    // }
    // console.log('DDDDDd', doc);
  }
}

async function _insertGenesisMerge({collection}) {
  const genesisMerge = JSON.parse('{"_id":{"$oid":"5e02216c45d014382fbb7bc9"},"event":{"@context":"https://w3id.org/webledger/v1","type":"ContinuityMergeEvent","parentHash":["zQmNNR93ng1hFf4jK9RX1mP5QgXCH5cFm47BQ23Guz2sugc"],"proof":{"type":"Ed25519Signature2018","created":"2019-12-24T14:32:10Z","verificationMethod":"https://bedrock.localhost:18443/consensus/continuity2017/voters/z6MkjxYwTPo6CL8Qpmnc46qeNXTyAuvukvv8JoCQKs4hPdQ8","proofPurpose":"assertionMethod","jws":"eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..nM4IfuTbXTlJpPrFjjheKk442WjLnXbgQIH8cjtMrDYEFLXd8WCI2uzo42W9_5GsLUKUQTFP3Z1sZuHKUvS7Ag"}},"meta":{"blockHeight":0,"blockOrder":1,"consensus":true,"consensusDate":1.577197932205e+12,"continuity2017":{"creator":"https://bedrock.localhost:18443/consensus/continuity2017/voters/z6MkjxYwTPo6CL8Qpmnc46qeNXTyAuvukvv8JoCQKs4hPdQ8","generation":0,"type":"m"},"created":1.577197932205e+12,"updated":1.577197932205e+12,"eventHash":"zQmPTdMXGxd6UGKhVbZ5NYTnJBMWsFimeFZEEfQAJvZNrFu"}}');
  const e = genesisMerge;
  delete e._id;
  e.meta.generation = e.meta.continuity2017.generation;
  e.meta.creator = e.meta.continuity2017.creator;
  await collection.insert(e);
}
