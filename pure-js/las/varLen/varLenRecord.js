'use strict'
const varLenRecordHeader = require('./varLenRecordHeader')
const headerSize = varLenRecordHeader.size
module.exports = (op, next) => {
  return {
    size: headerSize,
    parse: (headerBuffer) => {
      const size = varLenRecordHeader.recordLengthAfterHeader(headerBuffer)
      return {
        size,
        parse: (dataBuffer) => {
          op(Buffer.concat([headerBuffer, dataBuffer]), varLenRecordHeader)
          return next
        }
      }
    }
  }
}
