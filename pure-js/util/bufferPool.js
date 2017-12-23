module.exports = (size) => {
  const pool = {
    take: function () {
      if (this._dataArr !== undefined) {
        try {
          const data = this._dataArr.shift()
          if (this._dataArr.length === 0) {
            this._dataArr = undefined
          }
          return data
        } catch (e) {}
      }
      if (this._data !== undefined) {
        return this._data
      }
      return Buffer.allocUnsafe(size)
    },
    write: (stream, buf) => stream.write(buf, function () {
      pool.putBack(buf)
    }),
    putBack: function (buf) {
      if (this._dataArr !== undefined) {
        this._dataArr.push(buf)
        /*
        if (this._dataArr.length > this.maxLen || this.maxLen === undefined) {
          this.maxLen = this._dataArr.length
        }
        */
        return
      }
      if (this._data !== undefined) {
        this._dataArr = [this._data, buf]
        this._data = undefined
        return
      }
      this._data = buf
    }
  }
  return pool
}