/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const workerpool = require('workerpool');
const path = require('path');

exports.init = ({maxWorkers}) => workerpool.pool(
  path.join(__dirname, 'event-process-worker.js'), {
    minWorkers: 'max',
    maxWorkers,
    // maxWorkers: workerpool.cpus
  });
