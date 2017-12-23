const {str4, str8, str32, short, uChar, uLong, uShort, uLong5, double, table} = require('../util/parser')

const lasHeader = table([
  {field: 'File Signature (“LASF”)', type: str4},
  {field: 'File Source ID', type: uShort},
  {field: 'Global Encoding', type: uShort},
  {field: 'Project ID - GUID data 1', type: uLong},
  {field: 'Project ID - GUID data 2', type: uShort},
  {field: 'Project ID - GUID data 3', type: uShort},
  {field: 'Project ID - GUID data 4', type: str8},
  {field: 'Version Major', type: uChar},
  {field: 'Version Minor', type: uChar},
  {field: 'System Identifier', type: str32},
  {field: 'Generating Software', type: str32},
  {field: 'File Creation Day of Year', type: uShort},
  {field: 'File Creation Year', type: uShort},
  {field: 'Header Size unsigned', type: short},
  {field: 'Offset to point data', type: uLong},
  {field: 'Number of Variable Length Records', type: uLong},
  {field: 'Point Data Format ID (0-99 for spec)', type: uChar},
  {field: 'Point Data Record Length unsigned', type: short},
  {field: 'Number of point records', type: uLong},
  {field: 'Number of points by return', type: uLong5},
  {field: 'X scale factor', type: double},
  {field: 'Y scale factor', type: double},
  {field: 'Z scale factor', type: double},
  {field: 'X offset', type: double},
  {field: 'Y offset', type: double},
  {field: 'Z offset', type: double},
  {field: 'Max X', type: double},
  {field: 'Min X', type: double},
  {field: 'Max Y', type: double},
  {field: 'Min Y', type: double},
  {field: 'Max Z', type: double},
  {field: 'Min Z', type: double}
])
lasHeader.pdFormat = lasHeader['Point Data Format ID (0-99 for spec)']
lasHeader.pdFormatType = function (buffer) {
  const formatID = this.pdFormat(buffer)
  if (formatID === 0) {
    return require('./pd/pdRecord0')
  }
  if (formatID === 1) {
    return require('./pd/pdRecord1')
  }
  if (formatID === 2) {
    return require('./pd/pdRecord2')
  }
  if (formatID === 3) {
    return require('./pd/pdRecord3')
  }
  throw new Error(`Unsupported Point Data Format ${formatID}`)
}
lasHeader.xScaleFactor = lasHeader['X scale factor']
lasHeader.yScaleFactor = lasHeader['Y scale factor']
lasHeader.zScaleFactor = lasHeader['Z scale factor']
lasHeader.xOffset = lasHeader['X offset']
lasHeader.yOffset = lasHeader['Y offset']
lasHeader.zOffset = lasHeader['Z offset']
lasHeader.varLenRecords = lasHeader['Number of Variable Length Records']
lasHeader.offsetToPointData = lasHeader['Offset to point data']
lasHeader.pdRecords = lasHeader['Number of point records']

module.exports = lasHeader
