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

function generateTimeQuickReplies() {
  const times = ['9:00', '10:00', '11:00', '13:45', '14:45', '15:45', '16:45'];
  return times.map(time => ({
    type: 'action',
    action: {
      type: 'message',
      label: time,
      text: time
    }
  }));
}

function isDateFormat(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isTimeFormat(str) {
  return /^(9|10|11):00$|^1[3-6]:45$/.test(str);
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

  if (isDateFormat(userMessage)) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `「${userMessage}」ですね。ご希望の時間帯をお選びください👇`,
      quickReply: {
        items: generateTimeQuickReplies()
      }
    });
  }

  if (isTimeFormat(userMessage)) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `「${userMessage}」にて承知しました。担当者からご連絡させていただきます。※返信は営業時間内になります。ご了承ください`
    });
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
