const presets = [
  [
    '@babel/env',
    {
      targets: {
        node: 'current'
      },
      useBuiltIns: 'usage',
      corejs: 3
    }
  ]
]

const plugins = [
  '@babel/transform-runtime',
  '@babel/proposal-export-default-from'
]

module.exports = {
  compact: true,
  comments: false,
  presets,
  plugins
}
