const {spawn} = require('child_process')
const path = require('path')
const {performance} = require('perf_hooks')
const fs = require('fs')

const pureOut = path.join(__dirname, 'pure-js.dat')

function readOutFile (outFile) {
  let offset = 0
  fs.createReadStream(outFile).on('data', (data) => {
    var dataOff = 0
    while (dataOff < data.length) {
      if (offset % 3 === 0) {
        process.stdout.write('\n')
      }
      process.stdout.write(`${data.readDoubleLE(dataOff)}, `)
      offset += 1
      dataOff += 8
    }
  })
}

function processPointCloud (command, args, outFile) {
  const inFile = path.join(__dirname, 'Serpent Mound Model LAS Data.las')
  fs.open(inFile, 'r', (err, inFd) => {
    if (err) {
      throw err
    }
    fs.open(outFile, 'w', (err, outFd) => {
      if (err) {
        throw err
      }
      const inStream = fs.createReadStream(inFile, {
        fd: inFd
      })
      const outStream = fs.createWriteStream(outFile, {
        fd: outFd
      })
      const child = spawn(command, args, {
        stdio: [inStream, outStream, 'pipe']
      })
      child.on('error', (e) => console.error(`-- error --\n${e.stack}`))
      child.stderr.pipe(process.stdout)

      performance.mark('start')
      const report = () => {
        performance.mark('stop')
        stats.finish()
        fs.writeFileSync(`${outFile}.stats.csv`, stats.toCSV())
        performance.measure('duration', 'start', 'stop')
        const {duration} = performance.getEntriesByName('duration')[0]
        console.log(`${duration}ms`)
      }
      /*
      Simple time!
      const start = process.hrtime()
      const report = () => {
        console.log(require('pretty-hrtime')(process.hrtime(start)))
      }
      */
      child.on('close', report)
    })
  })
}

// readOutFile(pureOut)
/*

// Simple call
processPointCloud(
  path.join(__dirname, '..', 'pure-js', 'index.js'),
  [],
  pureOut
)

// Creating profile data
processPointCloud(
  '/usr/bin/env',
  ['node', '--prof', path.join(__dirname, '..', 'pure-js', 'index.js')],
  pureOut
)
*/

// Connecting to Chrome Debugger
processPointCloud(
  '/usr/bin/env',
  ['node', '--inspect-brk', path.join(__dirname, '..', 'pure-js', 'index.js')],
  pureOut
)

const stats = require('./perf/stats')()
