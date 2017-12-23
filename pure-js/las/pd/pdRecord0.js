const {table, uShort, uChar, long} = require('../../util/parser')

const pdRecord0 = table([
  {field: 'X', type: long},
  {field: 'Y', type: long},
  {field: 'Z', type: long},
  {field: 'Intensity', type: uShort},
  {
    bitmap: [
      {field: 'Return Number', size: 3},
      {field: 'Number of Returns', size: 3},
      {field: 'Scan Direction', size: 1},
      {field: 'Edge of Flight Line', size: 1}
    ]
  },
  {field: 'Classification', type: uChar},
  {field: 'Scan Angle Rank (-90 to +90) – Left side', type: uChar},
  {field: 'User Data', type: uChar},
  {field: 'Point Source ID', type: uShort}
])
pdRecord0.version = 0

module.exports = pdRecord0
