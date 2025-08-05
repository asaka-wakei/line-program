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
  return /^(9:00|9:30|10:00|10:30|11:00|13:45|14:15|14:45|15:15|15:45|16:15)$/.test(str);
}

function createTypeSelectionFlex() {
  return {
    type: 'flex',
    altText: 'ご用件をお選びください',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: 'ご用件をお選びください。',
            wrap: true,
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: '初めて予約する方',
              text: '新規予約'
            },
            style: 'primary',
            margin: 'sm'
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: '予約変更・その他お問い合わせ',
              text: '予約変更・その他お問い合わせ'
            },
            style: 'primary',
            color: '#00B900',
            margin: 'sm'
          }
        ]
      }
    }
  };
}

function createDateFlexMessage() {
  const contents = [];
  for (let i = 0; i < 14; i++) {
    const date = dayjs().add(i, 'day');
    contents.push({
      type: 'button',
      action: {
        type: 'message',
        label: date.format('M/D (dd)'),
        text: date.format('YYYY-MM-DD')
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
        contents: [
          {
            type: 'text',
            text: 'ご希望の日付をお選びください👇',
            wrap: true,
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          ...contents
        ]
      }
    }
  };
}

function createTimeFlexMessage(date) {
  const times = ['9:00', '9:30', '10:00', '10:30', '11:00', '13:45', '14:15', '14:45', '15:15', '15:45', '16:15'];
  const buttons = times.map(time => ({
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
        contents: [
          {
            type: 'text',
            text: `「${date}」ですね。\nご希望の時間帯をお選びください👇`,
            wrap: true,
            weight: 'bold',
            size: 'md',
            margin: 'md'
          },
          ...buttons
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
  const text = event.message.text;

  if (text === '用件選択') {
    return client.replyMessage(event.replyToken, createTypeSelectionFlex());
  }

  if (text === '予約変更・その他お問い合わせ') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `ご用件を入力してください。診療時間内にスタッフが応答いたします。\n\n■診療時間\n月～土（日・祝・その他休診日）\n8:45～12:15、13:30～17:30\n※状況や内容により、応答が遅れる場合がございます。お急ぎの場合はお電話ください。TEL：0489851271\n※入力いただいた内容にて予約の確定とはなりませんので、ご了承願います。`
    });
  }

  if (text === '新規予約') {
    return client.replyMessage(event.replyToken, createDateFlexMessage());
  }

  if (isDateFormat(text)) {
    userDateMap.set(userId, text);
    return client.replyMessage(event.replyToken, createTimeFlexMessage(text));
  }

  if (isTimeFormat(text)) {
    const selectedDate = userDateMap.get(userId);
    if (selectedDate) {
      userDateMap.delete(userId);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `「${selectedDate} の ${text}」にて承知しました。\n担当者からご連絡させていただきます。\n※返信は営業時間内に実施いたします。ご返信させていただいてから予約の確定となりますので、ご了承ください。\n※この返信は自動返信となります。また、システム上休診日も表示されています。休診日のご予約はできませんのでご了承ください。\n休診日は当院のHPからご確認ください。`
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
