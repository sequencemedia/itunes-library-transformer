import { createWriteStream } from 'fs'
import { resolve } from 'path'
import { ensureFile } from 'fs-extra'
import { unescape } from 'querystring'
import {
  LIBRARY
} from '@sequencemedia/itunes-library-stream'

import {
  getFilePath,

  filterPlaylists
} from './common'

export const transformPlaylistsToM3U8 = (destination, ext) => ({ [LIBRARY]: library }) => {
  if (library) {
    const tracks = library.get('Tracks')
    const playlists = library.get('Playlists')

    Array.from(playlists)
      .filter(filterPlaylists)
      .forEach((playlist) => {
        const filePath = resolve(`${destination}/Playlists/${getFilePath(playlist, playlists)}.${ext}`)

        ensureFile(filePath, (e) => {
          if (e) {
            console.error(e)
          } else {
            const stream = createWriteStream(filePath, 'utf8')

            stream.write(`#EXTM3U\n`)

            playlist.get('Playlist Items')
              .forEach((item) => {
                const id = item.get('Track ID')

                const track = tracks.get(id)

                const time = parseInt(track.get('Total Time') / 1000, 10) || -1
                const name = track.get('Name')
                const artist = track.get('Artist') || track.get('Album Artist')
                const file = unescape((track.get('Location') || '').replace('file://', ''))

                const fileData = `#EXTINF:${time},${name} - ${artist}\n${file}\n`

                stream.write(fileData)
              })

            stream.end()
          }
        })
      })
  }
}
