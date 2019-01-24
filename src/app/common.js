export const normalise = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const normaliseForFilePath = (s) => normalise(s.replace(/["*/:<>?\\|]/g, '_'))

export const filterByPlaylist = (p) => (playlist) => playlist === p
export const filterByPlaylistId = (id) => (playlist) => playlist.get('Playlist Persistent ID') === id
export const filterByParentId = (id) => (playlist) => playlist.get('Parent Persistent ID') === id
export const filterByName = (name) => {
  const s = normaliseForFilePath(name)

  return (playlist) => normaliseForFilePath(playlist.get('Name')) === s
}

export const sortAsNumber = (alpha, omega) => alpha - omega

export const getByPlaylistId = (playlists, id) => Array.from(playlists).find(filterByPlaylistId(id)) || new Map()

export const getFileName = (playlist, playlists) => {
  const parentId = playlist.get('Parent Persistent ID')
  const name = playlist.get('Name')
  const array = Array.from(playlists)
    .filter(filterByParentId(parentId))
    .filter(filterByName(name))

  return (array.length > 1)
    ? `${normaliseForFilePath(name)} [${array.findIndex(filterByPlaylist(playlist)) + 1}]`
    : normaliseForFilePath(name)
}

export const getFilePath = (playlist, playlists) => (
  playlist.has('Parent Persistent ID')
    ? `${getFilePath(getByPlaylistId(playlists, playlist.get('Parent Persistent ID')), playlists)}/${getFileName(playlist, playlists)}`
    : getFileName(playlist, playlists)
)

export const isIncludedTrack = (track) => (
  track.has('Kind') &&
  track.get('Kind').toLowerCase().includes('audio')
)

export const isExcludedPlaylist = (playlist) => (
  playlist.has('Distinguished Kind') || // most likely
  playlist.has('Smart Info') // less likely
)

export const isHiddenPlaylist = (playlist) => playlist.has('Visible') ? !playlist.get('Visible') : false
export const isFolderPlaylist = (playlist) => playlist.has('Folder') ? !!playlist.get('Folder') : false

export const filterCompilationAlbums = (track) => (
  track.get('Track Type') === 'File' &&
  isIncludedTrack(track) && // includedAudio.includes(track.get('Kind')) &&
  (
    track.has('Compilation') === true &&
    track.get('Compilation') === true
  ) &&
  track.has('Album') &&
  track.has('Disc Number') &&
  track.has('Track Number')
)

export const filterAlbums = (track) => (
  track.get('Track Type') === 'File' &&
  isIncludedTrack(track) && // includedAudio.includes(track.get('Kind')) &&
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

export const filterPlaylists = (playlist) => !(
  (
    isFolderPlaylist(playlist) || // most likely
    isHiddenPlaylist(playlist) // less likely
  ) || // likelier than less likely
  isExcludedPlaylist(playlist)
) && playlist.has('Playlist Items') // essential
