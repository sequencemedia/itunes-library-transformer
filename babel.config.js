const presets = [
  [
    '@babel/env',
    {
      useBuiltIns: 'usage',
      targets: {
        node: '12.9.0'
      },
      corejs: 3
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
