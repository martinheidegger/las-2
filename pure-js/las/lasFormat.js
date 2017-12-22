const lasHeader = require('./lasHeader')
const varLenRecords = require('./varLenRecords')
const pdRecords = require('./pdRecords')
const getPDFormat = require('./pd/getPDFormat')
const {noop, ignoreUntil} = require('../util/parser')

module.exports = (handlers) => {
  return {
    size: lasHeader.size,
    parse: (buffer, offset) => {
      const header = lasHeader.parse(buffer, offset)
      handlers.onHeader(header)
      const xScale = header['X scale factor']
      const yScale = header['Y scale factor']
      const zScale = header['Z scale factor']
      const xOffset = header['X offset']
      const yOffset = header['Y offset']
      const zOffset = header['Z offset']
      const pdFormat = getPDFormat(header['Point Data Format ID (0-99 for spec)'])
      return varLenRecords(
        header['Number of Variable Length Records'],
        handlers.onVarLengthRecord,
        ignoreUntil(header['Offset to point data'], pdRecords(pdFormat,
          header['Number of point records'],
          (pdRecord) => {
            pdRecord.X = (pdRecord.X * xScale) + xOffset
            pdRecord.Y = (pdRecord.Y * yScale) + yOffset
            pdRecord.Z = (pdRecord.Z * zScale) + zOffset
            handlers.onPDRecord(pdRecord)
          },
          noop
        ))
      )
    }
  }
}
