const express = require('express');
const line = require('@line/bot-sdk');
const dayjs = require('dayjs');
require('dayjs/locale/ja');
dayjs.locale('ja');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('Error handling event:', err);
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
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;

  if (userMessage === '予約') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ご希望の日付をお選びください👇',
      quickReply: {
        items: generateDateQuickReplies()
      }
    });
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `「${userMessage}」を受け付けました。`
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
