const dfd = require('danfojs-node');
const axios = require('axios');

async function getData() {
  const currency = process.env.currency.split(',');
  const url = 'https://quotation-api-cdn.dunamu.com/v1/forex/recent';
  const promises = [];

  for (const c of currency) {
    const params = { codes: `FRX.KRW${c}` };
    promises.push(axios.get(url, { params }));
  }

  const responses = await Promise.all(promises);
  return responses.map(response => new dfd.DataFrame(response.data));
}

async function getTable() {
  const dataFrames = await getData();
  let df = dfd.concat({ dfList: dataFrames, axis: 0 });
  df.setIndex({ column: 'code', inplace: true });
  df.index = df.index.map(value => value.replace('FRX.KRW', ''));
  df = df.loc({ columns: ['basePrice', 'currencyUnit', 'date', 'time'] });
  return df;
}

async function sendIssue(title, body) {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
  const headers = { Authorization: `Bearer ${token}` };
  const data = { title, body };

  await axios.post(url, data, { headers });
}

function getKSTTime(format) {
  return (new Date()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

(async function main() {
  const df = await getTable();
  const title = `환율 모니터링 (${getKSTTime()})`;
  const body = df.toString();
  await sendIssue(title, body);
})();