require('@babel/register')({
  ignore: [
    /node_modules\/(?!@sequencemedia)/
  ]
})

const { app } = require('./src')

console.log('?')

app()

console.log('.')
