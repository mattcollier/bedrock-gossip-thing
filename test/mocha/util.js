/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {Parser} = require('json2csv');

exports.getCreatorMaxGenerations = async ({collection}) => {
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
};

exports.getDumpEventHashes = async ({collection}) => {
  const x = await collection.find({}, {
    _id: 0,
    'meta.eventHash': 1,
  }).toArray();
  return x.map(r => r.meta.eventHash);
};

exports.getTimer = () => {
  const NS_PER_SEC = 1000000000;
  const NS_PER_MS = 1000000;
  const time = process.hrtime();

  return {
    elapsed() {
      const [seconds, nanoseconds] = process.hrtime(time);
      return (seconds * NS_PER_SEC + nanoseconds) / NS_PER_MS;
    }
  };
};

exports.strMapToObj = strMap => {
  const obj = Object.create(null);
  for(const [k, v] of strMap) {
    // We don’t escape the key '__proto__'
    // which can cause problems on older engines
    obj[k] = v;
  }
  return obj;
};

exports.toCsv = json => {
  let csv;
  try {
    const parser = new Parser({delimiter: ' '});
    csv = parser.parse(json);
  } catch(e) {
    console.error(e);
    throw e;
  }
  return csv;
};
