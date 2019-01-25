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

  filterCompilationAlbums
} from './common'

export const transformCompilationAlbumsToM3U8 = (destination, ext) => ({ [TRACKS]: tracks }) => {
  if (tracks) {
    const values = Array.from(tracks.values())

    const compilationAlbums = values
      .filter(filterCompilationAlbums)

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

            return
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

              writeFile(filePath, `#EXTM3U\n${fileData.join('\n')}\n`, (e) => {
                if (e) {
                  console.error(e)
                }
              })
            })
        })
      })
  }
}
