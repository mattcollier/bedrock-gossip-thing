const {canonizeMergeEvent, canonizeOperationEvent, hash} = require('./hasher');
const workerpool = require('workerpool');

async function processEvents({events}) {
  const eventHash = [];
  const operationHash = [];
  for(const eventTxt of events) {
    const {event} = JSON.parse(eventTxt);
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
    eventHash.push(result.hash);
  }
  return {eventHash, operationHash};
}

// create a worker and register public functions
workerpool.worker({processEvents});

async function _tranformOperationEvent({event}) {
  event.operationHash = await Promise.all(event.operation.map(async o => {
    const {hash: h} = await hash(o);
    return h;
  }));
  delete event.operation;
}
