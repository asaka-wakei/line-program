// LINE Messaging API 用 Node.js 自作Botテンプレート
// 日付を「明日から12日分」自動生成して
// クイックリプライボタンとして表示

const express = require('express');
const line = require('@line/bot-sdk');
const dayjs = require('dayjs');
require('dayjs/locale/ja');
dayjs.locale('ja');

const config = {
  channelAccessToken: 'YOUR_CHANNEL_ACCESS_TOKEN',
  channelSecret: 'YOUR_CHANNEL_SECRET'
};

const app = express();
const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

function generateDateQuickReplies() {
  const items = [];
  for (let i = 1; i <= 12; i++) {
    const date = dayjs().add(i, 'day');
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: date.format('M/D (dd)'),
        text: date.format('YYYY-MM-DD')
      }
    });
  }
  return items;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;

  if (userMessage === '予約') {
    const message = {
      type: 'text',
      text: 'ご希望の日付をお選びください👇',
      quickReply: {
        items: generateDateQuickReplies()
      }
    };
    return client.replyMessage(event.replyToken, message);
  }

  // その他の応答処理（診療内容の選択など）もここに追加可能

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `「${userMessage}」を受け付けました。`
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
