const config = require('../config')
const os = require('os')

exports.menu = (pushname, runtime, prefix) => {
return `
╭───「 ${config.botName} 」───
│ 👤 User: ${pushname}
│ ⏰ Runtime: ${runtime}
│ 💻 Platform: ${os.platform()}
│ 📌 Prefix: ${prefix}
╰────────────────

╭───「 DOWNLOAD 」───
│ • ${prefix}video <name/url>
│ • ${prefix}song <name/url>
│ • ${prefix}tiktok <url>
│ • ${prefix}ig <url>
│ • ${prefix}fb <url>
╰────────────────

╭───「 BOT INFO 」───
│ • ${prefix}alive
│ • ${prefix}ping
│ • ${prefix}owner
│ • ${prefix}menu
╰────────────────

╭───「 OWNER ONLY 」───
│ • ${prefix}setting name <name>
│ • ${prefix}setting pp <reply image>
│ • ${prefix}creact
│ • ${prefix}pair 9471xxxxxxx
╰────────────────

╭───「 100+ COMMANDS 」───
│ • ${prefix}ai <text>
│ • ${prefix}img <text>
│ • ${prefix}sticker
│ • ${prefix}weather <city>
│ • ${prefix}news
│... and 95 more!
╰────────────────
> © ${config.ownerName}
`
}
