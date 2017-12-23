const {table, uShort, uChar, long, double, postProcess} = require('../../util/parser')

module.exports = (op, next) => {
  return postProcess(table([
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
    {field: 'Point Source ID', type: uShort},
    {field: 'GPS Time', type: double}
  ]), (data) => {
    data.version = 1
    op(data)
    return next
  })
}
