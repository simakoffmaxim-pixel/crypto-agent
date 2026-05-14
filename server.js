const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.get('/:file', (req, res) => {
  const file = req.params.file;

});

const TWITTER_BEARER = process.env.TWITTER_BEARER;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', twitter: !!TWITTER_BEARER });
});

app.get('/twitter/sentiment/:symbol', async (req, res) => {
  if (!TWITTER_BEARER) {
    return res.status(400).json({ error: 'Twitter token not configured' });
  }
  try {
    const symbol = req.params.symbol.toUpperCase();
    const query = encodeURIComponent(`$${symbol} -is:retweet lang:en`);
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=20&tweet.fields=public_metrics,created_at,author_id`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${TWITTER_BEARER}` }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const tweets = data.data || [];

    const totalLikes = tweets.reduce((a, t) => a + (t.public_metrics?.like_count || 0), 0);
    const totalRT = tweets.reduce((a, t) => a + (t.public_metrics?.retweet_count || 0), 0);
    const totalReplies = tweets.reduce((a, t) => a + (t.public_metrics?.reply_count || 0), 0);

    res.json({
      count: tweets.length,
      likes: totalLikes,
      retweets: totalRT,
      replies: totalReplies,
      engagement: totalLikes + totalRT + totalReplies,
      tweets: tweets.slice(0, 5)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post('/claude', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Crypto Agent proxy running on port ${PORT}`);
});
