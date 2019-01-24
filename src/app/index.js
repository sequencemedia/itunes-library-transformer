import { createReadStream } from 'fs'
import { resolve } from 'path'
import userhome from 'userhome'
import itunes from '@sequencemedia/itunes-library-stream'

import { transformCompilationAlbumsToM3U8 } from './transform-compilation-albums'
import { transformAlbumsToM3U8 } from './transform-albums'
import { transformPlaylistsToM3U8 } from './transform-playlists'

export default function (filePath = resolve(userhome(), 'Music/iTunes/iTunes Library.xml'), destination = resolve('./iTunes Library'), ext = 'm3u8') {
  createReadStream(filePath, 'utf8')
    .pipe(itunes.createStream())
    .on('data', transformCompilationAlbumsToM3U8(destination, ext))
    .on('data', transformAlbumsToM3U8(destination, ext))
    .on('data', transformPlaylistsToM3U8(destination, ext))
}
