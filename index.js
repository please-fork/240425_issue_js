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
  df.addColumn({ column: 'currency',
    value: df.get('code').values.map(
      value => value.replace('FRX.KRW', '')) });
  df = df.loc({ columns: ['currency', 'basePrice', 'currencyUnit', 'date', 'time'] });
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

function dataFrameToMarkdown(df) {
  const columns = df.columns;
  const data = df.values;

  // 열 이름 생성
  const header = `| ${columns.join(' | ')} |`;

  // 구분자 생성
  const separator = `|${columns.map(() => '---').join('|')}|`;

  // 데이터 행 생성
  const rows = data.map(row => `| ${row.join(' | ')} |`);

  // 마크다운 테이블 생성
  const markdownTable = [header, separator, ...rows].join('\n');

  return markdownTable;
}

(async function main() {
  const df = await getTable();
  const title = `환율 모니터링 (${getKSTTime()})`;
  const body = dataFrameToMarkdown(df);
  // console.log(body);
  await sendIssue(title, body);
})();