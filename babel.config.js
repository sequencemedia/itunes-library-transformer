const presets = [
  [
    '@babel/env',
    {
      useBuiltIns: 'usage',
      targets: {
        node: 'current'
      }
    }
  ]
]

const plugins = [
  '@babel/plugin-proposal-export-default-from'
]

module.exports = {
  compact: true,
  comments: false,
  presets,
  plugins
}
