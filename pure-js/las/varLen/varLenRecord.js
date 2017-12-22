const varLenRecordHeader = require('./varLenRecordHeader')
const headerSize = varLenRecordHeader.size
module.exports = (op, next) => {
  return {
    size: headerSize,
    parse: (buffer, offset) => {
      const header = varLenRecordHeader.parse(buffer, offset)
      const size = header['Record Length After Header']
      return {
        size,
        parse: (buffer, offset) => {
          header.data = buffer.slice(offset, offset + size)
          op(header)
          return next
        }
      }
    }
  }
}
