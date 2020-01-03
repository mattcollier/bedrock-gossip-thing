const chunk = require('lodash.chunk');
const fs = require('fs');
// const referenceOperations = require('./reference-operations');
const poolApi = require('./pool-init');
const readline = require('readline');
const referenceOperations = require('./reference-operations');
const _util = require('./util');

describe('event processing pool', () => {
  it('works', async function() {
    this.timeout(0);
    const rl = readline.createInterface({
      input: fs.createReadStream('events.txt'),
    });
    let counter = 0;
    let eventHash;
    const events = [];
    const eventHashes = [];
    for await (const line of rl) {
      // even lines are meta data
      if(counter % 2 === 0) {
        ({eventHash} = JSON.parse(line));
        counter++;
        eventHashes.push(eventHash);
        continue;
      }
      events.push(line);
      counter++;
    }
    let pool;
    let report = {};
    for(let maxWorkers = 1; maxWorkers <= 8; ++maxWorkers) {
      if(pool) {
        pool.terminate();
      }
      pool = poolApi.init({maxWorkers});
      report[maxWorkers] = {};
      for(let chunkSize = 100; chunkSize <= 100; chunkSize += 50) {
        const timer = _util.getTimer();
        const chunks = chunk(events, chunkSize);
        const result = await Promise.all(chunks.map(chunk =>
          pool.exec('processEvents', [{events: chunk}])
        ));
        const elapsedTime = timer.elapsed();
        report[maxWorkers][chunkSize] = elapsedTime;
        console.log('WWW', maxWorkers, chunkSize, elapsedTime);

        const operationHash = [].concat(...result.map(c => c.operationHash));
        const targetOperationHashes = referenceOperations
          .map(o => o.meta.operationHash);
        targetOperationHashes.should.have.same.members(operationHash);
      }
    }
    console.log('TTTTT', JSON.stringify(report, null, 2));
    const csv = _util.toCsv(report);
    console.log('------------ CSV ------------');
    process.stdout.write(csv + '\n');
  });
});
