import { createReadStream, createWriteStream, writeFile, appendFile } from 'fs'
import { resolve } from 'path'
import { ensureFile } from 'fs-extra'
import { unescape } from 'querystring'
import itunes, {
  LIBRARY /*,
  TRACKS,
  PLAYLISTS,
  PLAYLIST_ITEMS,
  PLAYLIST_ITEM */
} from '@sequencemedia/itunes-library-stream'

const includedAudio = [
  'Apple Lossless audio file'
]

const excludedPlaylistName = [
  'Downloaded'
]

const excludedPlaylistType = [
  'Master',
  'Podcasts',
  'Audiobooks',
  'Purchased Music',
  'Movies',
  'Music',
  'TV Shows'
]

const normalise = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const normaliseForFilePath = (s) => normalise(s.replace(/["*/:<>?\\|]/g, '_'))

const filterByPlaylist = (p) => (playlist) => playlist === p
const filterByPlaylistId = (id) => (playlist) => playlist.get('Playlist Persistent ID') === id
const filterByParentId = (id) => (playlist) => playlist.get('Parent Persistent ID') === id
const filterByName = (name) => {
  const s = normaliseForFilePath(name)

  return (playlist) => normaliseForFilePath(playlist.get('Name')) === s
}

const sortAsNumber = (alpha, omega) => alpha - omega

const getByPlaylistId = (playlists, id) => Array.from(playlists).find(filterByPlaylistId(id)) || new Map()

const getFileName = (playlist, playlists) => {
  const parentId = playlist.get('Parent Persistent ID')
  const name = playlist.get('Name')
  const array = Array.from(playlists)
    .filter(filterByParentId(parentId))
    .filter(filterByName(name))

  return (array.length > 1) ? `${normaliseForFilePath(name)} [${array.findIndex(filterByPlaylist(playlist)) + 1}]` : normaliseForFilePath(name)
}

const getFilePath = (playlist, playlists) => (
  playlist.has('Parent Persistent ID')
    ? `${getFilePath(getByPlaylistId(playlists, playlist.get('Parent Persistent ID')), playlists)}/${getFileName(playlist, playlists)}`
    : `${getFileName(playlist, playlists)}`
)

const isExcluded = (playlist) => !!(
  excludedPlaylistName.some((name) => playlist.get('Name') === name) ||
  excludedPlaylistType.some((type) => playlist.has(type) ? playlist.get(type) : false) ||
  playlist.has('Smart Info')
)

const isHidden = (playlist) => playlist.has('Visible') ? !playlist.get('Visible') : false
const isFolder = (playlist) => playlist.has('Folder') ? !!playlist.get('Folder') : false

const filterCompilationAlbums = (track) => (
  includedAudio.includes(track.get('Kind')) &&
  (
    track.has('Compilation') === true &&
    track.get('Compilation') === true
  ) &&
  track.has('Album') &&
  track.has('Disc Number') &&
  track.has('Track Number')
)

const filterAlbums = (track) => (
  includedAudio.includes(track.get('Kind')) &&
  (
    track.has('Compilation') === false ||
            track.get('Compilation') === false
  ) &&
  (
    track.has('Album Artist') ||
    track.has('Artist')
  ) &&
  track.has('Album') &&
  track.has('Disc Number') &&
  track.has('Track Number')
)

const filterPlaylists = (playlist) => !(
  !playlist.has('Playlist Items') || isFolder(playlist) || isHidden(playlist) || isExcluded(playlist)
)

export default function (filePath = './Library.xml', destination = './m3u', ext = 'm3u8') {
  createReadStream(filePath, 'utf8')
    .pipe(itunes.createStream())
    .on('data', ({ [LIBRARY]: library }) => {
      if (library) {
        const tracks = library.get('Tracks')
        const playlists = library.get('Playlists')

        const values = Array.from(tracks.values())

        const compilationAlbums = values
          .filter(filterCompilationAlbums)

        const albums = values
          .filter(filterAlbums)

        compilationAlbums
          .reduce((accumulator, current) => {
            const s = normalise(current.get('Album'))

            return accumulator.includes(s) ? accumulator : accumulator.concat(s)
          }, [])
          .sort()
          .forEach((album) => {
            const filePath = resolve(`${destination}/Tracks/Compilations/${normaliseForFilePath(album)}.${ext}`)

            ensureFile(filePath, (e) => {
              if (e) {
                console.error(e)
              }

              writeFile(filePath, `#EXTM3U\n`, (e) => {
                if (e) {
                  console.error(e)
                }

                const byCompilationAlbum = compilationAlbums
                  .filter((track) => normalise(track.get('Album')) === album)

                byCompilationAlbum
                  .reduce((accumulator, current) => {
                    const n = Number(current.get('Disc Number'))

                    return accumulator.includes(n) ? accumulator : accumulator.concat(n)
                  }, [])
                  .sort(sortAsNumber)
                  .forEach((discNumber) => {
                    const byDiscNumber = byCompilationAlbum
                      .filter((track) => Number(track.get('Disc Number')) === discNumber)

                    byDiscNumber
                      .reduce((accumulator, current) => {
                        const n = Number(current.get('Track Number'))

                        return accumulator.includes(n) ? accumulator : accumulator.concat(n)
                      }, [])
                      .sort(sortAsNumber)
                      .forEach((trackNumber) => {
                        const byTrackNumber = byDiscNumber
                          .filter((track) => Number(track.get('Track Number')) === trackNumber)

                        byTrackNumber
                          .forEach((track) => {
                            const artist = track.get('Artist') || track.get('Album Artist')
                            const time = parseInt(track.get('Total Time') / 1000, 10) || -1
                            const name = track.get('Name')
                            const file = unescape((track.get('Location') || '').replace('file://', ''))

                            const fileData = `#EXTINF:${time},${name} - ${artist}\n${file}\n`

                            appendFile(filePath, fileData, (e) => {
                              if (e) {
                                console.error(e)
                              }
                            })
                          })
                      })
                  })
              })
            })
          })

        albums
          .reduce((accumulator, current) => {
            if (current.has('Album Artist')) {
              const s = normalise(current.get('Album Artist'))

              if (accumulator.includes(s)) return accumulator
              else {
                return accumulator.concat(s)
              }
            } else {
              if (current.has('Artist')) {
                const s = normalise(current.get('Artist'))

                if (accumulator.includes(s)) return accumulator
                else {
                  return accumulator.concat(s)
                }
              }
            }
          }, [])
          .sort()
          .forEach((artist) => {
            const byAlbumArtist = albums
              .filter((track) => {
                if (track.has('Album Artist')) {
                  return normalise(track.get('Album Artist')) === artist
                } else {
                  if (track.has('Artist')) {
                    return normalise(track.get('Artist')) === artist
                  }
                }
              })

            byAlbumArtist
              .reduce((accumulator, current) => {
                const s = normalise(current.get('Album'))

                return accumulator.includes(s) ? accumulator : accumulator.concat(s)
              }, [])
              .sort()
              .forEach((album) => {
                const filePath = resolve(`${destination}/Tracks/${normaliseForFilePath(artist)}/${normaliseForFilePath(album)}.${ext}`)

                ensureFile(filePath, (e) => {
                  if (e) {
                    console.error(e)
                  }

                  writeFile(filePath, `#EXTM3U\n`, (e) => {
                    if (e) {
                      console.error(e)
                    }

                    const byAlbum = byAlbumArtist
                      .filter((track) => normalise(track.get('Album')) === album)

                    byAlbum
                      .reduce((accumulator, current) => {
                        const n = Number(current.get('Disc Number'))

                        return accumulator.includes(n) ? accumulator : accumulator.concat(n)
                      }, [])
                      .sort(sortAsNumber)
                      .forEach((discNumber) => {
                        const byDiscNumber = byAlbum
                          .filter((track) => Number(track.get('Disc Number')) === discNumber)

                        byDiscNumber
                          .reduce((accumulator, current) => {
                            const n = Number(current.get('Track Number'))

                            return accumulator.includes(n) ? accumulator : accumulator.concat(n)
                          }, [])
                          .sort(sortAsNumber)
                          .forEach((trackNumber) => {
                            const byTrackNumber = byDiscNumber
                              .filter((track) => Number(track.get('Track Number')) === trackNumber)

                            byTrackNumber
                              .forEach((track) => {
                                const time = parseInt(track.get('Total Time') / 1000, 10) || -1
                                const name = track.get('Name')
                                const file = unescape((track.get('Location') || '').replace('file://', ''))

                                const fileData = `#EXTINF:${time},${name} - ${artist}\n${file}\n`

                                appendFile(filePath, fileData, (e) => {
                                  if (e) {
                                    console.error(e)
                                  }
                                })
                              })
                          })
                      })
                  })
                })
              })
          })

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

                    stream.write(`#EXTINF:${time},${name} - ${artist}\n`)
                    stream.write(`${file}\n`)
                  })

                stream.end()
              }
            })
          })
      }
    })
    .on('end', () => console.log('End'))
}
