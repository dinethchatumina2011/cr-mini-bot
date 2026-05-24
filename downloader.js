const ytdl = require('ytdl-core')
const yts = require('yt-search')

async function ytVideo(query) {
    const search = await yts(query)
    const vid = search.videos[0]
    if (!vid) return { error: 'Not found' }

    const info = await ytdl.getInfo(vid.url)
    const format = ytdl.chooseFormat(info.formats, { quality: '18' }) // 360p

    return {
        title: vid.title,
        url: format.url,
        thumb: vid.thumbnail,
        duration: vid.timestamp
    }
}

async function ytSong(query) {
    const search = await yts(query)
    const vid = search.videos[0]
    if (!vid) return { error: 'Not found' }

    const info = await ytdl.getInfo(vid.url)
    const format = ytdl.chooseFormat(info.formats, { quality: '140' }) // audio only

    return {
        title: vid.title,
        url: format.url,
        thumb: vid.thumbnail,
        duration: vid.timestamp
    }
}

module.exports = { ytVideo, ytSong }
