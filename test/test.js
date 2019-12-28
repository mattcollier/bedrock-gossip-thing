/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config} = bedrock;
const database = require('bedrock-mongodb');
const {promisify} = require('util');

// require('./server');

const brOpenCollections = promisify(database.openCollections);
const brCreateIndexes = promisify(database.createIndexes);

bedrock.events.on('bedrock-mongodb.ready', async () => {
  const collections = ['event-1', 'event-2'];
  await brOpenCollections(collections);
  for(const collection of collections) {
    await brCreateIndexes([{
      collection,
      fields: {'meta.creator': 1, 'meta.generation': 1},
      options: {unique: true, background: false}
    }, {
      collection,
      fields: {'meta.eventHash': 1},
      options: {unique: true, background: false}
    }]);
  }
  // await brCreateIndexes([{
  //   collection: 'ledger',
  //   fields: {id: 1},
  //   options: {unique: true, background: false}
  // }, {
  //   collection: 'ledger',
  //   fields: {'block.type': 1, id: 1},
  //   options: {unique: true, background: false}
  // }, {
  //   collection: 'ledger',
  //   fields: {'block.previousBlockHash': 1},
  //   options: {unique: false, background: false}
  // }, {
  //   collection: 'ledger',
  //   fields: {'meta.deleted': 1},
  //   options: {unique: false, background: false}
  // }]);
});

require('bedrock-test');

// logging
config.loggers.app.filename = '/tmp/bedrock-gossip-thing-app.log';
config.loggers.access.filename = '/tmp/bedrock-gossip-thing-access.log';
config.loggers.error.filename = '/tmp/bedrock-gossip-thing-error.log';

bedrock.start();
