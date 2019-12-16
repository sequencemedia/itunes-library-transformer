require('@babel/register')({
  ignore: [
    /node_modules\/(?!@sequencemedia)/
  ]
})

const { app } = require('./src')

module.exports = app()
