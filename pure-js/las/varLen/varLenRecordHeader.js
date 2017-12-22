const {table, str16, str32, uShort} = require('../../util/parser')

module.exports = table([
  {field: 'Reserved', type: uShort},
  {field: 'User ID', type: str16},
  {field: 'Record ID', type: uShort},
  {field: 'Record Length After Header', type: uShort},
  {field: 'Description', type: str32}
])
