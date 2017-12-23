const {table, str16, str32, uShort} = require('../../util/parser')

const header = table([
  {field: 'Reserved', type: uShort},
  {field: 'User ID', type: str16},
  {field: 'Record ID', type: uShort},
  {field: 'Record Length After Header', type: uShort},
  {field: 'Description', type: str32},
  {
    field: 'Data',
    type: {
      size: 0,
      parse: (buffer, start) => {
        const size = header.recordLengthAfterHeader(buffer)
        return buffer.slice(start, start + size)
      }
    }
  }
])
header.recordLengthAfterHeader = header['Record Length After Header']
module.exports = header
