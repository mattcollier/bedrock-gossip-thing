const workerpool = require('workerpool');
const axios = require('axios');
const https = require('https');
// const readline = require('readline');

const axiosInstance = axios.create({
  baseURL: 'https://bedrock.localhost:18443',
  timeout: 1000,
  httpsAgent: new https.Agent({rejectUnauthorized: false}),
  keepAlive: true,
});

/* eslint-disable-next-line max-len */
const eventUrl = '/consensus/continuity2017/voters/z6Mkw3PA7LEHxGUJbMyMWA5oma9bkKJ7rFxrebwjqXgwuDEk/events-query';

async function getEvents({eventHash}) {
  const {data: events} = await axiosInstance.post(eventUrl, {eventHash});
  // const readInterface = readline.createInterface({
  //   input: events,
  //   crlfDelay: Infinity
  // });
  // const eventsResult = [];
  // for await (const x of readInterface) {
  //   const e = JSON.parse(x);
  //   eventsResult.push(e);
  // }
  return events;
}

// create a worker and register public functions
workerpool.worker({getEvents});
