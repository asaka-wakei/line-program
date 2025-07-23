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

const userDateMap = new Map();

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('Error:', err);
      res.status(500).end();
    });
});

function isDateFormat(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isTimeFormat(str) {
  return /^(9|10|11):00$|^(13:30|14:00|15:00|16:00)$/.test(str);
}

// 日付Flex Message生成
function generateDateFlexMessage() {
  const dateButtons = [];
  for (let i = 1; i <= 12; i++) {
    const date = dayjs().add(i, 'day');
    const label = date.format('M/D (dd)');
    const text = date.format('YYYY-MM-DD');
    dateButtons.push({
      type: 'button',
      action: {
        type: 'message',
        label,
        text
      },
      style: 'primary',
      margin: 'sm'
    });
  }

  return {
    type: 'flex',
    altText: '日付を選択してください',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'ご希望の日付をお選びください👇',
            wrap: true,
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          ...dateButtons
        ]
      }
    }
  };
}

// 時間Flex Message生成
function generateTimeFlexMessage(selectedDate) {
  const times = ['9:00', '10:00', '11:00', '13:30', '14:00', '15:00', '16:00'];
  const timeButtons = times.map(time => ({
    type: 'button',
    action: {
      type: 'message',
      label: time,
      text: time
    },
    style: 'primary',
    margin: 'sm'
  }));

  return {
    type: 'flex',
    altText: '時間帯を選択してください',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: `「${selectedDate}」ですね。\nご希望の時間帯をお選びください👇`,
            wrap: true,
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          ...timeButtons
        ]
      }
    }
  };
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;

  if (userMessage === '予約') {
    return client.replyMessage(event.replyToken, generateDateFlexMessage());
  }

  if (isDateFormat(userMessage)) {
    userDateMap.set(userId, userMessage);
    return client.replyMessage(event.replyToken, generateTimeFlexMessage(userMessage));
  }

  if (isTimeFormat(userMessage)) {
    const selectedDate = userDateMap.get(userId);
    if (selectedDate) {
      userDateMap.delete(userId);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `「${selectedDate} の ${userMessage}」にて承知しました。担当者からご連絡させていただきます。※返信は営業時間内になります。ご了承ください`
      });
    } else {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '先に日付をお選びください。'
      });
    }
  }

  return Promise.resolve(null);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
