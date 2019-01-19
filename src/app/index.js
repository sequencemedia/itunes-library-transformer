import { createReadStream } from 'fs'
import itunes /* , {
  LIBRARY,
  TRACKS,
  PLAYLISTS,
  PLAYLIST_ITEMS,
  PLAYLIST_ITEM
} */ from '@sequencemedia/itunes-library-stream'

export default function (filePath = `${process.cwd()}/Library.xml`) {
  createReadStream(filePath)
    .pipe(itunes.createStream())
    .on('data', () => {})
    .on('end', () => {})
}
