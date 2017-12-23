'use strict'
const varLenRecordHeader = require('./varLenRecordHeader')
module.exports = (op, next) => {
  return {
    size: varLenRecordHeader.size,
    parse: (headerBuffer) => {
      return {
        size: varLenRecordHeader.recordLengthAfterHeader(headerBuffer),
        parse: (dataBuffer) => {
          op(Buffer.concat([headerBuffer, dataBuffer]), varLenRecordHeader)
          return next
        }
      }
    }
  }
}
