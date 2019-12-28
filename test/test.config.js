/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {config} = require('bedrock');
const path = require('path');

config.mocha.tests.push(path.join(__dirname, 'mocha'));

config.mongodb.name = 'bedrock_gossip_thing_test';

// config.mongodb.dropCollections = {};
// config.mongodb.dropCollections.onInit = true;
// config.mongodb.dropCollections.collections = [];

// logging
config.loggers.app.filename = '/tmp/bedrock-gossip-thing-app.log';
config.loggers.access.filename = '/tmp/bedrock-gossip-thing-access.log';
config.loggers.error.filename = '/tmp/bedrock-gossip-thing-error.log';
