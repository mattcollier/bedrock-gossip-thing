/*!
 * Copyright (c) 2016-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const crypto = require('crypto');
const {documentLoader} = require('./document-loader');
const jsonld = require('jsonld');
const multibase = require('multibase');
const multihash = require('multihashes');
const {canonize} = require('rdf-canonize');

exports.hash = async data => {
  if(!data) {
    throw new TypeError('The `data` parameter must be a JSON-LD document.');
  }
  // canonize ledger event to nquads
  const canonized = await jsonld.canonize(data, {
    algorithm: 'URDNA2015',
    documentLoader,
    format: 'application/n-quads'
  });
  const canonizedBuffer = Buffer.from(canonized, 'utf8');
  const canonizedBytes = canonizedBuffer.length;
  const hash = crypto.createHash('sha256').update(canonizedBuffer).digest();
  const mh = multihash.encode(hash, 'sha2-256');
  const mb = multibase.encode('base58btc', mh).toString();
  return {canonizedBytes, hash: mb};
};

exports.canonizeMergeEvent = async event => {
  const dataset = _mergeEventToDataset(event);
  const canonized = await canonize(dataset, {
    algorithm: 'URDNA2015',
    format: 'application/n-quads'
  });
  return _hashCanonized(canonized);
};

exports.canonizeOperationEvent = async event => {
  const {basisBlockHeight} = event;
  let canonized =
    '_:c14n0 <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> ' +
      '<https://w3id.org/webledger#WebLedgerOperationEvent> .\n' +
    '_:c14n0 <https://w3id.org/webledger#basisBlockHeight> ' +
      `"${basisBlockHeight}"^^<http://www.w3.org/2001/XMLSchema#integer> .\n`;

  let operationHashes;
  if(Array.isArray(event.operationHash)) {
    operationHashes = event.operationHash.slice();
    operationHashes.sort();
  } else {
    operationHashes = [event.operationHash];
  }
  const opQuads = operationHashes.map(h =>
    `_:c14n0 <https://w3id.org/webledger#operationHash> "${h}" .\n`);
  canonized += opQuads.join('');

  let parentHashes;
  if(Array.isArray(event.parentHash)) {
    parentHashes = event.parentHash.slice();
    parentHashes.sort();
  } else {
    parentHashes = [event.parentHash];
  }
  const parentQuads = parentHashes.map(h =>
    `_:c14n0 <https://w3id.org/webledger#parentHash> "${h}" .\n`);
  canonized += parentQuads.join('');

  if(event.treeHash) {
    canonized +=
      `_:c14n0 <https://w3id.org/webledger#treeHash> "${event.treeHash}" .\n`;
  }

  return _hashCanonized(canonized);
};

function _mergeEventToDataset(event) {
  const dataset = [{
    subject: {termType: 'BlankNode', value: '_:b0'},
    predicate: {
      termType: 'NamedNode',
      value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    },
    object: {
      termType: 'NamedNode',
      value: 'https://w3id.org/webledger#ContinuityMergeEvent'
    },
    graph: {termType: 'DefaultGraph', value: ''}
  }, {
    subject: {termType: 'BlankNode', value: '_:b0'},
    predicate: {
      termType: 'NamedNode',
      value: 'https://w3id.org/security#proof'
    },
    object: {termType: 'BlankNode', value: '_:b1'},
    graph: {termType: 'DefaultGraph', value: ''}
  }];

  const parentHashes = Array.isArray(event.parentHash) ?
    event.parentHash : [event.parentHash];
  dataset.push(...parentHashes.map(h => ({
    subject: {termType: 'BlankNode', value: '_:b0'},
    predicate: {
      termType: 'NamedNode',
      value: 'https://w3id.org/webledger#parentHash'
    },
    object: {
      termType: 'Literal',
      value: h,
      datatype: {
        termType: 'NamedNode',
        value: 'http://www.w3.org/2001/XMLSchema#string'
      }
    },
    graph: {termType: 'DefaultGraph', value: ''}
  })));

  if(event.treeHash) {
    dataset.push({
      subject: {termType: 'BlankNode', value: '_:b0'},
      predicate: {
        termType: 'NamedNode',
        value: 'https://w3id.org/webledger#treeHash'
      },
      object: {
        termType: 'Literal',
        value: event.treeHash,
        datatype: {
          termType: 'NamedNode',
          value: 'http://www.w3.org/2001/XMLSchema#string'
        }
      },
      graph: {termType: 'DefaultGraph', value: ''}
    });
  }

  // proof quads
  dataset.push(...[{
    subject: {termType: 'BlankNode', value: '_:b2'},
    predicate: {
      termType: 'NamedNode',
      value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    },
    object: {
      termType: 'NamedNode',
      value: 'https://w3id.org/security#Ed25519Signature2018'
    },
    graph: {termType: 'BlankNode', value: '_:b1'}
  }, {
    subject: {termType: 'BlankNode', value: '_:b2'},
    predicate: {
      termType: 'NamedNode',
      value: 'http://purl.org/dc/terms/created'
    },
    object: {
      termType: 'Literal',
      value: event.proof.created,
      datatype: {
        termType: 'NamedNode',
        value: 'http://www.w3.org/2001/XMLSchema#dateTime'
      }
    },
    graph: {termType: 'BlankNode', value: '_:b1'}
  }, {
    subject: {termType: 'BlankNode', value: '_:b2'},
    predicate: {
      termType: 'NamedNode',
      value: 'https://w3id.org/security#jws'
    },
    object: {
      termType: 'Literal',
      value: event.proof.jws,
      datatype: {
        termType: 'NamedNode',
        value: 'http://www.w3.org/2001/XMLSchema#string'
      }
    },
    graph: {termType: 'BlankNode', value: '_:b1'}
  }, {
    subject: {termType: 'BlankNode', value: '_:b2'},
    predicate: {
      termType: 'NamedNode',
      value: 'https://w3id.org/security#proofPurpose'
    },
    object: {
      termType: 'NamedNode',
      value: 'https://w3id.org/security#assertionMethod'
    },
    graph: {termType: 'BlankNode', value: '_:b1'}
  }, {
    subject: {termType: 'BlankNode', value: '_:b2'},
    predicate: {
      termType: 'NamedNode',
      value: 'https://w3id.org/security#verificationMethod'
    },
    object: {
      termType: 'NamedNode',
      value: event.proof.verificationMethod
    },
    graph: {termType: 'BlankNode', value: '_:b1'}
  }]);

  return dataset;
}

function _hashCanonized(canonized) {
  const canonizedBuffer = Buffer.from(canonized, 'utf8');
  const canonizedBytes = canonizedBuffer.length;
  const hash = crypto.createHash('sha256').update(canonizedBuffer).digest();
  const mh = multihash.encode(hash, 'sha2-256');
  const mb = multibase.encode('base58btc', mh).toString();
  return {canonizedBytes, hash: mb};
}
