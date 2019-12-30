const fs = require('fs');
const readline = require('readline');
const {canonizeMergeEvent, canonizeOperationEvent, hash} = require('./hasher');

exports.go = async () => {
  const rl = readline.createInterface({
    input: fs.createReadStream('events.txt'),
  });
  let counter = 0;
  let eventHash;
  const operationHash = [];
  for await (const line of rl) {
    // even lines are meta data
    if(counter % 2 === 0) {
      ({eventHash} = JSON.parse(line));
      counter++;
      continue;
    }
    // console.log('LLLLL', counter, eventHash, line);
    const {event} = JSON.parse(line);
    // console.log('EEEEEE', event);
    let h;
    if(event.type === 'ContinuityMergeEvent') {
      // h = hash;
      h = canonizeMergeEvent;
    } else {
      h = canonizeOperationEvent;
      await _tranformOperationEvent({event});
      operationHash.push(...event.operationHash);
    }
    const result = await h(event);
    result.hash.should.equal(eventHash);
    counter++;
  }
  console.log('COUNTER', counter);
  return {operationHash};
};

async function _tranformOperationEvent({event}) {
  event.operationHash = await Promise.all(event.operation.map(async o => {
    const {hash: h} = await hash(o);
    return h;
  }));
  delete event.operation;
}
