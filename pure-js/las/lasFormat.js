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
      const xScale = header.get('X scale factor')
      const yScale = header.get('Y scale factor')
      const zScale = header.get('Z scale factor')
      const xOffset = header.get('X offset')
      const yOffset = header.get('Y offset')
      const zOffset = header.get('Z offset')
      const pdFormat = getPDFormat(header.get('Point Data Format ID (0-99 for spec)'))
      return varLenRecords(
        header.get('Number of Variable Length Records'),
        handlers.onVarLengthRecord,
        ignoreUntil(header.get('Offset to point data'), pdRecords(pdFormat,
          header.get('Number of point records'),
          (pdRecord) => {
            pdRecord.X = () => (pdRecord.get('X') * xScale) + xOffset
            pdRecord.Y = () => (pdRecord.get('Y') * yScale) + yOffset
            pdRecord.Z = () => (pdRecord.get('Z') * zScale) + zOffset
            handlers.onPDRecord(pdRecord)
          },
          noop
        ))
      )
    }
  }
}
