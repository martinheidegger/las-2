const {table, uShort, uChar, long, bitmap, postProcess} = require('./parser')

module.exports = (op, next) => {
  return postProcess(table([
    {field: 'X', type: long},
    {field: 'Y', type: long},
    {field: 'Z', type: long},
    {field: 'Intensity', type: uShort},
    {
      field: '$',
      type: bitmap([
        {field: 'Return Number', size: 3},
        {field: 'Number of Returns', size: 3},
        {field: 'Scan Direction', size: 1},
        {field: 'Edge of Flight Line', size: 1}
      ])
    },
    {field: 'Classification', type: uChar},
    {field: 'Scan Angle Rank (-90 to +90) – Left side', type: uChar},
    {field: 'User Data', type: uChar},
    {field: 'Point Source ID', type: uShort}
  ]), (data) => {
    data.version = 0
    op(data)
    return next
  })
}
