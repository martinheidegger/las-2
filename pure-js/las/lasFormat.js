'use strict'
const lasHeader = require('./lasHeader')
const varLenRecord = require('./varLen/varLenRecord')
const {noop, ignoreUntil, iter} = require('../util/parser')

module.exports = (handlers) => {
  return {
    size: lasHeader.size,
    parse: (buffer) => {
      handlers.onHeader(buffer, lasHeader)
      const xScale = lasHeader.xScaleFactor(buffer)
      const yScale = lasHeader.yScaleFactor(buffer)
      const zScale = lasHeader.zScaleFactor(buffer)
      const xOffset = lasHeader.xOffset(buffer)
      const yOffset = lasHeader.yOffset(buffer)
      const zOffset = lasHeader.zOffset(buffer)
      const masterFormat = lasHeader.pdFormatType(buffer)
      const pdFormatType = Object.create(masterFormat)
      pdFormatType.xProj = (buffer) => masterFormat.X(buffer) * xScale + xOffset
      pdFormatType.yProj = (buffer) => masterFormat.Y(buffer) * yScale + yOffset
      pdFormatType.zProj = (buffer) => masterFormat.Z(buffer) * zScale + zOffset
      return iter(
        varLenRecord,
        lasHeader.varLenRecords(buffer),
        handlers.onVarLengthRecord,
        ignoreUntil(lasHeader.offsetToPointData(buffer),
          iter(
            (op, next) => {
              return {
                size: pdFormatType.size,
                parse: (buffer) => {
                  op(buffer, pdFormatType)
                  return next
                }
              }
            },
            lasHeader.pdRecords(buffer),
            handlers.onPDRecord,
            noop
          )
        )
       )
    }
  }
}
