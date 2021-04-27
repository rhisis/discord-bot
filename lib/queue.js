const fs = require('fs')
const path = require('path')
const ytdl = require('ytdl-core')
const { MessageEmbed } = require('discord.js')

const config = require('../config')

class Queue {
  constructor (client) {
    this.client = client
    this.file = path.join(__dirname, 'list.db')
    this.list = []
    this.channel = null
    this.connection = null
    this.playing = false
    this.joined = false
  }

  async add (url) {
    this.list = this.get()
    const songInfo = await ytdl.getInfo(url)
    this.list.push({
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url
    })
    fs.writeFileSync(this.file, JSON.stringify(this.list))
    return songInfo
  }

  get () {
    return JSON.parse(fs.readFileSync(this.file, 'utf8'))
  }

  async del (index) {
    this.list = this.get()
    this.list.splice(index, 1)
    fs.writeFileSync(this.file, JSON.stringify(this.list))
  }

  async join (channel) {
    this.channel = channel
    this.joined = true
    const connection = await this.channel.join()
    this.connection = connection
  }

  async play () {
    if (!this.joined) return
    this.list = this.get()
    this.playing = true
    const embed = new MessageEmbed()
      .setColor('RANDOM')
    embed.setDescription(`Now playing ${this.list[0].title}`)
    const text = await this.client.channels.fetch(config.text)
    text.send({ embed })
    this.connection.play(ytdl(this.list[0].url))
      .on('finish', async () => {
        await this.del(0)
        await this.play()
      })
      .on('error', error => console.error(error))
  }

  async skip () {
    if (!this.playing) return
    this.list = this.get()
    if (this.list.length > 1) {
      await this.del(0)
      await this.play()
    }
  }

  async stop () {
    if (!this.playing) return
    await this.connection.dispatcher.pause()
    // await this.leave()
  }

  async leave () {
    if (!this.channel) return
    this.playing = false
    this.joined = false
    await this.channel.leave()
  }

  empty () {
    fs.writeFileSync(this.file, JSON.stringify([]))
  }
}

module.exports = Queue