import { writeFile } from 'fs'
import { resolve } from 'path'
import { ensureFile } from 'fs-extra'
import { unescape } from 'querystring'
import {
  TRACKS
} from '@sequencemedia/itunes-library-stream'

import {
  normalise,
  normaliseForFilePath,

  sortAsNumber,

  filterAlbums
} from './common'

export const transformAlbumsToM3U8 = (destination, ext) => ({ [TRACKS]: tracks }) => {
  if (tracks) {
    const values = Array.from(tracks.values())

    const albums = values
      .filter(filterAlbums)

    albums
      .reduce((accumulator, current) => {
        if (current.has('Album Artist')) {
          const s = normalise(current.get('Album Artist'))

          return (accumulator.includes(s)) ? accumulator : accumulator.concat(s)
        }

        return accumulator
      }, [])
      .sort()
      .forEach((artist) => {
        const byAlbumArtist = albums
          .filter((track) => track.has('Album Artist') && normalise(track.get('Album Artist')) === artist)

        byAlbumArtist
          .reduce((accumulator, current) => {
            const s = normalise(current.get('Album'))

            return accumulator.includes(s) ? accumulator : accumulator.concat(s)
          }, [])
          .sort()
          .forEach((album) => {
            const filePath = resolve(`${destination}/Tracks/${normaliseForFilePath(artist)}/${normaliseForFilePath(album)}.${ext}`)

            const byAlbum = byAlbumArtist
              .filter((track) => normalise(track.get('Album')) === album)

            const fileData = byAlbum
              .reduce((accumulator, current) => {
                const n = Number(current.get('Disc Number'))

                return accumulator.includes(n) ? accumulator : accumulator.concat(n)
              }, [])
              .sort(sortAsNumber)
              .map((discNumber) => {
                const byDiscNumber = byAlbum
                  .filter((track) => Number(track.get('Disc Number')) === discNumber)

                const fileData = byDiscNumber
                  .reduce((accumulator, current) => {
                    const n = Number(current.get('Track Number'))

                    return accumulator.includes(n) ? accumulator : accumulator.concat(n)
                  }, [])
                  .sort(sortAsNumber)
                  .map((trackNumber) => {
                    const byTrackNumber = byDiscNumber
                      .filter((track) => Number(track.get('Track Number')) === trackNumber)

                    const fileData = byTrackNumber
                      .map((track) => {
                        const time = parseInt(track.get('Total Time') / 1000, 10) || -1
                        const name = track.get('Name')
                        const artist = track.get('Artist')
                        const file = unescape((track.get('Location') || '').replace('file://', ''))

                        return (
                          `#EXTINF:${time},${name} - ${artist}\n${file}`
                        )
                      })

                    return (
                      fileData.join('\n')
                    )
                  })

                return (
                  fileData.join('\n')
                )
              })

            ensureFile(filePath, (e) => {
              if (e) {
                console.error(e)

                return
              }

              writeFile(filePath, `#EXTM3U\n${fileData.join('\n')}\n`, 'utf8', (e) => {
                if (e) {
                  console.error(e)
                }
              })
            })
          })
      })

    albums
      .reduce((accumulator, current) => {
        if (current.has('Artist') && (
          !current.has('Album Artist') ||
          !current.get('Album Artist'))) {
          const s = normalise(current.get('Artist'))

          return (accumulator.includes(s)) ? accumulator : accumulator.concat(s)
        }

        return accumulator
      }, [])
      .sort()
      .forEach((artist) => {
        const byAlbumArtist = albums
          .filter((track) => (
            track.has('Artist') && (
              !track.has('Album Artist') ||
              !track.get('Album Artist')) && normalise(track.get('Artist')) === artist)
          )

        byAlbumArtist
          .reduce((accumulator, current) => {
            const s = normalise(current.get('Album'))

            return accumulator.includes(s) ? accumulator : accumulator.concat(s)
          }, [])
          .sort()
          .forEach((album) => {
            const filePath = resolve(`${destination}/Tracks/${normaliseForFilePath(artist)}/${normaliseForFilePath(album)}.${ext}`)

            const byAlbum = byAlbumArtist
              .filter((track) => normalise(track.get('Album')) === album)

            const fileData = byAlbum
              .reduce((accumulator, current) => {
                const n = Number(current.get('Disc Number'))

                return accumulator.includes(n) ? accumulator : accumulator.concat(n)
              }, [])
              .sort(sortAsNumber)
              .map((discNumber) => {
                const byDiscNumber = byAlbum
                  .filter((track) => Number(track.get('Disc Number')) === discNumber)

                const fileData = byDiscNumber
                  .reduce((accumulator, current) => {
                    const n = Number(current.get('Track Number'))

                    return accumulator.includes(n) ? accumulator : accumulator.concat(n)
                  }, [])
                  .sort(sortAsNumber)
                  .map((trackNumber) => {
                    const byTrackNumber = byDiscNumber
                      .filter((track) => Number(track.get('Track Number')) === trackNumber)

                    const fileData = byTrackNumber
                      .map((track) => {
                        const time = parseInt(track.get('Total Time') / 1000, 10) || -1
                        const name = track.get('Name')
                        const artist = track.get('Artist')
                        const file = unescape((track.get('Location') || '').replace('file://', ''))

                        return (
                          `#EXTINF:${time},${name} - ${artist}\n${file}`
                        )
                      })

                    return (
                      fileData.join('\n')
                    )
                  })

                return (
                  fileData.join('\n')
                )
              })

            ensureFile(filePath, (e) => {
              if (e) {
                console.error(e)

                return
              }

              writeFile(filePath, `#EXTM3U\n${fileData.join('\n')}\n`, 'utf8', (e) => {
                if (e) {
                  console.error(e)
                }
              })
            })
          })
      })
  }
}
