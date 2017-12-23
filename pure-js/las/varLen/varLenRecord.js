const varLenRecordHeader = require('./varLenRecordHeader')
const headerSize = varLenRecordHeader.size
module.exports = (op, next) => {
  return {
    size: headerSize,
    parse: (buffer, offset) => {
      const header = varLenRecordHeader.parse(buffer, offset)
      const size = header.get('Record Length After Header')
      return {
        size,
        parse: (tmpBuffer, offset) => {
          const get = header.get
          const toJSON = header.toJSON
          let buffer = tmpBuffer
          let data
          header.get = (field) => {
            if (field === 'data') {
              if (data === undefined) {
                data = buffer.slice(offset, offset + size)
                buffer = null // Garbage collection!
              }
              return data
            }
            return get(field)
          }
          header.toJSON = () => {
            const json = toJSON()
            json.data = header.get('data')
            return json
          }
          op(header)
          return next
        }
      }
    }
  }
}
