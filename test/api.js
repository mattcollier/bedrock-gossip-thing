const _util = require('./mocha/util');

exports.queryNode = async ({query, collection, depth = 10}) => {
  const localGenerations = await _util.getCreatorMaxGenerations({collection});
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
};
