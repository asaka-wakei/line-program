const express = require('express');
const line = require('@line/bot-sdk');
const dayjs = require('dayjs');
require('dayjs/locale/ja');
dayjs.locale('ja');

// LINE構成
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const app = express();
const client = new line.Client(config);

// ユーザーごとの選択日付を一時記録
const userDateMap = new Map();

// Webhookエンドポイント
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error('Error:', err);
      res.status(500).end();
    });
});

// 日付クイックリプライ生成
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

// 時間形式判定
function isTimeFormat(str) {
  return /^(9|10|11):00$|^1[3-6]:45$/.test(str);
}

// 日付形式判定
function isDateFormat(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// メイン処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;

  // 「予約」→ 日付選択
  if (userMessage === '予約') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ご希望の日付をお選びください👇',
      quickReply: {
        items: generateDateQuickReplies()
      }
    });
  }

  // 日付を選んだ場合 → Flex Messageで時間縦並び表示
  if (isDateFormat(userMessage)) {
    userDateMap.set(userId, userMessage);

    const timeButtons = ['9:00', '10:00', '11:00', '13:45', '14:45', '15:45', '16:45'].map(t => {
      return {
        type: 'button',
        action: {
          type: 'message',
          label: t,
          text: t
        },
        style: 'primary',
        margin: 'sm'
      };
    });

    return client.replyMessage(event.replyToken, {
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
              text: `「${userMessage}」ですね。\nご希望の時間帯をお選びください👇`,
              wrap: true,
              weight: 'bold',
              size: 'md',
              margin: 'md'
            },
            ...timeButtons
          ]
        }
      }
    });
  }

  // 時間を選んだ場合 → 日付と組み合わせて確認メッセージ
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

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
