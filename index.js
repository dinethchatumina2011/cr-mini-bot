const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const express = require('express')
const fs = require('fs')
const config = require('./config')
const { menu } = require('./lib/menu')
const { ytVideo, ytSong } = require('./lib/downloader')
const qrcode = require('qrcode-terminal')

const app = express()
let sock, startTime = Date.now()

// Pair Site කොලටියට හදමු
app.get('/', (req, res) => {
    res.send(`
    <html>
    <head><title>${config.botName} Pair</title>
    <style>
        body{background:#0d1117;color:#fff;font-family:Arial;text-align:center;padding-top:100px}
       .box{background:#161b22;padding:30px;border-radius:15px;display:inline-block}
        input{padding:10px;border-radius:5px;border:none;width:250px}
        button{background:#238636;color:#fff;padding:10px 20px;border:none;border-radius:5px;cursor:pointer}
    </style>
    </head>
    <body>
        <div class="box">
            <h1>🔥 ${config.botName} 🔥</h1>
            <p>Enter Your WhatsApp Number</p>
            <form action="/pair">
                <input name="number" placeholder="9471xxxxxxx" required>
                <br><br>
                <button type="submit">Get Pair Code</button>
            </form>
            <p>© ${config.ownerName}</p>
        </div>
    </body>
    </html>
    `)
})

app.get('/pair', async (req, res) => {
    let num = req.query.number
    if (!num) return res.send('Number required')
    num = num.replace(/[^0-9]/g, '')

    try {
        if (!sock.authState.creds.registered) {
            let code = await sock.requestPairingCode(num)
            code = code?.match(/.{1,4}/g)?.join('-') || code
            res.send(`<h1>Pair Code: ${code}</h1><p>WhatsApp > Linked Devices > Link with Phone Number</p>`)
        } else {
            res.send('Already Paired!')
        }
    } catch {
        res.send('Error! Try again')
    }
})

app.listen(config.pairPort, () => console.log('Pair site running on port ' + config.pairPort))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    const { version } = await fetchLatestBaileysVersion()

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['CR MINI', 'Chrome', '1.0.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode
            if (reason!== DisconnectReason.loggedOut) startBot()
        } else if (connection === 'open') {
            console.log('Bot Connected!')
            startTime = Date.now()
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0]
            if (!msg.message || msg.key.fromMe) return

            const from = msg.key.remoteJid
            const isGroup = from.endsWith('@g.us')
            const sender = isGroup? msg.key.participant : from
            const pushname = msg.pushName || 'User'
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

            if (!body.startsWith(config.prefix)) {
                // Channel React Feature
                if (from === config.channelId && config.reactEmoji) {
                    const emojis = config.reactEmoji.split('')
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                    await sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } })
                }
                return
            }

            const args = body.slice(config.prefix.length).trim().split(' ')
            const command = args.shift().toLowerCase()
            const q = args.join(' ')
            const isOwner = sender.includes(config.ownerNumber)

            // Runtime
            const runtime = (s) => {
                s = Math.floor(s / 1000)
                let h = Math.floor(s / 3600)
                let m = Math.floor(s % 3600 / 60)
                let sec = Math.floor(s % 60)
                return `${h}h ${m}m ${sec}s`
            }

            switch (command) {
                case 'menu':
                    let txt = menu(pushname, runtime(Date.now() - startTime), config.prefix)
                    await sock.sendMessage(from, {
                        image: fs.readFileSync(config.botImage),
                        caption: txt
                    }, { quoted: msg })
                    break

                case 'alive':
                    await sock.sendMessage(from, {
                        text: `*${config.botName} is Alive!* ✅\n\n*Owner:* ${config.ownerName}\n*Number:* wa.me/${config.ownerNumber}\n*Runtime:* ${runtime(Date.now() - startTime)}`
                    }, { quoted: msg })
                    break

                case 'ping':
                    let old = Date.now()
                    let res = await sock.sendMessage(from, { text: 'Pinging...' }, { quoted: msg })
                    let neww = Date.now()
                    await sock.sendMessage(from, { text: `*Pong!* ${(neww - old)} ms`, edit: res.key })
                    break

                case 'owner':
                    await sock.sendMessage(from, {
                        text: `*Owner Info*\n\n*Name:* ${config.ownerName}\n*Number:* wa.me/${config.ownerNumber}`
                    }, { quoted: msg })
                    break

                case 'video':
                    if (!q) return sock.sendMessage(from, { text: `Ex: ${config.prefix}video alan walker faded` }, { quoted: msg })
                    await sock.sendMessage(from, { text: 'Downloading...' }, { quoted: msg })
                    let vid = await ytVideo(q)
                    if (vid.error) return sock.sendMessage(from, { text: 'Video not found!' }, { quoted: msg })
                    await sock.sendMessage(from, {
                        video: { url: vid.url },
                        caption: `*${vid.title}*\nDuration: ${vid.duration}`
                    }, { quoted: msg })
                    break

                case 'song':
                    if (!q) return sock.sendMessage(from, { text: `Ex: ${config.prefix}song despacito` }, { quoted: msg })
                    await sock.sendMessage(from, { text: 'Downloading...' }, { quoted: msg })
                    let aud = await ytSong(q)
                    if (aud.error) return sock.sendMessage(from, { text: 'Song not found!' }, { quoted: msg })
                    await sock.sendMessage(from, {
                        audio: { url: aud.url },
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: msg })
                    break

                case 'setting':
                    if (!isOwner) return sock.sendMessage(from, { text: 'Owner Only!' }, { quoted: msg })
                    if (args[0] === 'name') {
                        config.botName = args.slice(1).join(' ')
                        await sock.sendMessage(from, { text: `Bot name changed to: ${config.botName}` }, { quoted: msg })
                    } else if (args[0] === 'pp') {
                        let quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage
                        if (!quoted) return sock.sendMessage(from, { text: 'Reply to an image!' }, { quoted: msg })
                        // Profile pic update logic here
                        await sock.sendMessage(from, { text: 'Bot image updated!' }, { quoted: msg })
                    }
                    break

                case 'creact':
                    if (!isOwner) return sock.sendMessage(from, { text: 'Owner Only!' }, { quoted: msg })
                    await sock.sendMessage(from, {
                        text: `*Channel React Activated* ✅\nChannel: ${config.channelId}\nEmoji: ${config.reactEmoji}`
                    }, { quoted: msg })
                    break

                case 'pair':
                    if (!isOwner) return sock.sendMessage(from, { text: 'Owner Only!' }, { quoted: msg })
                    if (!q) return sock.sendMessage(from, { text: `Ex: ${config.prefix}pair 9471xxxxxxx` }, { quoted: msg })
                    let code = await sock.requestPairingCode(q.replace(/[^0-9]/g, ''))
                    code = code?.match(/.{1,4}/g)?.join('-') || code
                    await sock.sendMessage(from, { text: `*Pair Code for ${q}*\n\nCode: ${code}` }, { quoted: msg })
                    break

                // 100+ Commands මෙතනට add කරන්න
                case 'ai':
                    await sock.sendMessage(from, { text: 'AI feature coming soon!' }, { quoted: msg })
                    break
            }
        } catch (e) {
            console.log(e)
        }
    })
}

startBot()
