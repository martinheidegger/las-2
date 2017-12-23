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
  onHeader: (buffer, type) => {
    console.error('--- HEADER ---')
    console.error(type.toJSON(buffer))
  },
  onVarLengthRecord: (buffer, varLenRecord) => {
    // console.log('--- VAR LENGTH RECORD ---')
    // console.log(varLenRecord.Data(buffer).length, varLenRecord.recordLengthAfterHeader(buffer))
    // console.error(varLenRecord.toJSON(buffer))
  },
  onPDRecord: (buffer, pdType) => {
    // console.log('--- PD RECORD ---')
    const X = pdType.xProj(buffer)
    const Y = pdType.yProj(buffer)
    const Z = pdType.zProj(buffer)
    // console.error({X, Y, Z})
    const buf = bufPool.take()
    buf.writeDoubleLE(X, 0, true)
    buf.writeDoubleLE(Y, 8, true)
    buf.writeDoubleLE(Z, 16, true)

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
// process.on('uncaughtException', (e) => console.error(`-- uncaught --\n${e.stack}`))
