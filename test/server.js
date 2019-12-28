const bedrock = require('bedrock');
const {asyncHandler} = require('bedrock-express');
const database = require('bedrock-mongodb');

const api = require('./api');

bedrock.events.on('bedrock-express.configure.routes', app => {
  const collection = database.collections['event-1'];
  app.post('/gossip', asyncHandler(async (req, res) => {
    const {body: {depth, query}} = req;
    const r = await api.queryNode({collection, query, depth});
    res.json(r);
  }));
});

