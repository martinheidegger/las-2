#!/usr/bin/env node
const out = process.stdout
const {receiveBufferForFormat} = require('./util/parser')
const bufPool = require('./util/bufferPool')(8 * 3)
let pressureId = 0
let firstPressure
let lastPressure
let waitForDrain = false
function releaseDrain () {
  if (firstPressure) {
    do {
      if (!((buf2) => out.write(buf2, () => bufPool.putBack(buf2)))(firstPressure.buf)) {
        waitForDrain = true
        return
      }
      firstPressure = firstPressure.next
    } while (firstPressure !== undefined)
    lastPressure = undefined
  }
}
const lasFormat = require('./las/lasFormat')({
  onHeader: (header) => {
    console.error('--- HEADER ---')
    console.error(header)
  },
  onVarLengthRecord: (varLenRecord) => {
    // console.log('--- VAR LENGTH RECORD ---')
    // console.log(varLenRecord.data.length, varLenRecord['Record Length After Header'])
    // console.log(varLenRecord)
  },
  onPDRecord: (pdRecord) => {
    // console.log('--- PD RECORD ---')
    const buf = bufPool.take()
    // console.error('take')
    buf.writeDoubleLE(pdRecord.X, 0, true)
    buf.writeDoubleLE(pdRecord.Y, 8, true)
    buf.writeDoubleLE(pdRecord.Z, 16, true)

    if (waitForDrain) {
      const node = {buf, id: pressureId}
      pressureId++
      if (!firstPressure) {
        firstPressure = node
        lastPressure = node
      } else {
        lastPressure.next = node
        lastPressure = node
      }
      return
    }

    releaseDrain()

    if (!out.write(buf, () => {
      bufPool.putBack(buf)
    })) {
      waitForDrain = true
      out.on('drain', () => {
        waitForDrain = false
        releaseDrain()
      })
    }
  }
})
process.stdin.on('error', (e) => console.error(e.stack))
process.stdin.on('data', receiveBufferForFormat(lasFormat))
process.stdin.resume()
process.on('SIGINT', (e) => process.exit(1))
process.on('uncaughtException', (e) => console.error(`-- uncaught --\n${e.stack}`))
