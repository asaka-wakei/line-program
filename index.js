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

// ユーザーごとの選択日付を一時記録（簡易セッション）
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

// 日付ボタン生成（明日から12日分）
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

// 時間ボタン生成
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

// 日付形式判定
function isDateFormat(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

// 時間形式判定
function isTimeFormat(str) {
  return /^(9|10|11):00$|^1[3-6]:45$/.test(str);
}

// メイン処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const userMessage = event.message.text;

  // 「予約」と送られたら → 日付を提示
  if (userMessage === '予約') {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ご希望の日付をお選びください👇',
      quickReply: {
        items: generateDateQuickReplies()
      }
    });
  }

  // 日付が選ばれたら記録 → 時間を提示
  if (isDateFormat(userMessage)) {
    userDateMap.set(userId, userMessage);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `「${userMessage}」ですね。ご希望の時間帯をお選びください👇`,
      quickReply: {
        items: generateTimeQuickReplies()
      }
    });
  }

  // 時間が選ばれたら、日付と組み合わせて返信
  if (isTimeFormat(userMessage)) {
    const selectedDate = userDateMap.get(userId);
    if (selectedDate) {
      userDateMap.delete(userId); // 一度使ったら削除（1回きりのセッションとして）
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `「${selectedDate} の ${userMessage}」にて承知しました。担当者からご連絡させていただきます。※返信は営業時間内になります。ご了承ください`
      });
    } else {
      // 日付未選択で時間だけ送られた場合
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '先に日付をお選びください。'
      });
    }
  }

  // その他の入力には無反応
  return Promise.resolve(null);
}

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
