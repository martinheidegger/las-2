module.exports = function getPDFormat (formatID) {
  if (formatID === 0) {
    return require('./pdRecord0')
  }
  if (formatID === 1) {
    return require('./pdRecord1')
  }
  if (formatID === 2) {
    return require('./pdRecord2')
  }
  if (formatID === 3) {
    return require('./pdRecord3')
  }
  throw new Error(`Unsupported Point Data Format ${formatID}`)
}