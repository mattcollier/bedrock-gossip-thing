
/*!
 * Copyright (c) 2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const creators = exports.creators = {
  a: {id: 'AAAAAAAAAAAAAAA'},
  b: {id: 'BBBBBBBBBBBBBBB'},
  z: {id: 'ZZZZZZZZZZZZZZz'}
};

exports.events = [{
  event: {
    parentHash: []
  },
  meta: {
    eventHash: 'A0',
    creator: creators.a.id,
    generation: 0,
  }
}, {
  event: {
    parentHash: ['A0']
  },
  meta: {
    eventHash: 'A1',
    creator: creators.a.id,
    generation: 1,
  }
}, {
  event: {
    parentHash: ['A1']
  },
  meta: {
    eventHash: 'A2',
    creator: creators.a.id,
    generation: 2,
  }
}, {
  event: {
    parentHash: ['A2'],
  },
  meta: {
    eventHash: 'A3',
    creator: creators.a.id,
    generation: 3,
  }
}, {
  event: {
    parentHash: ['A3']
  },
  meta: {
    eventHash: 'A4',
    creator: creators.a.id,
    generation: 4,
  }
}, {
  event: {
    parentHash: ['A4']
  },
  meta: {
    eventHash: 'A5',
    creator: creators.a.id,
    generation: 5,
  }
}];

exports.events_z = [{
  event: {
    parentHash: ['A0']
  },
  meta: {
    eventHash: 'Z1',
    creator: creators.z.id,
    generation: 1,
  }
}, {
  event: {
    parentHash: ['A0']
  },
  meta: {
    eventHash: 'B1',
    creator: creators.b.id,
    generation: 1,
  }
}, {
  event: {
    parentHash: ['B1', 'A5']
  },
  meta: {
    eventHash: 'B2',
    creator: creators.b.id,
    generation: 2,
  }
}, {
  event: {
    parentHash: ['A5', 'Z1']
  },
  meta: {
    eventHash: 'A6',
    creator: creators.a.id,
    generation: 6,
  }
}, {
  event: {
    parentHash: ['Z1', 'A6']
  },
  meta: {
    eventHash: 'Z2',
    creator: creators.z.id,
    generation: 2,
  }
}, {
  event: {
    parentHash: ['Z2']
  },
  meta: {
    eventHash: 'Z3',
    creator: creators.z.id,
    generation: 3,
  }
}];
