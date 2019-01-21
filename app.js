require('@babel/register')({
  ignore: [
    /node_modules\/(?!@sequencemedia)/
  ]
})

const { app } = require('./src')

app()
