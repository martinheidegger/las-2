// (MIT LICENSE)
//
// Copyright 2017 Martin Heidegger
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
/**
 * Stat module for Node.js to collect averages of Memory & CPU consumption over
 * a given period of time.
 */
module.exports = ({
    resolution, // Maximum resolution of frames
    interval // Time interval between each recording
  } = {
    // defaults
    resolution: 20,
    interval: 500
  }) => {
  const snapShots = []
  const snapStep = 1 / (resolution - 1)
  const cpuFrame = process.cpuUsage()
  let frame = initFrame()
  let finished = false

  const nextSnap = (time) => {
    if (finished) return

    // To reduce the code complexity and have a better first frame
    // lest start after the nextSnap
    setTimeout(() => {
      if (snapShots.length === resolution) {
        let ratio = 1 - snapStep
        for (let i = 1; i < snapShots.length - 1; i++, ratio -= snapStep) {
          let next
          if (i === resolution - 1) {
            next = frame
          } else {
            next = snapShots[i + 1]
          }
          merge(snapShots[i], next, ratio)
        }
        snapShots[snapShots.length - 1] = frame
        // The new resolution (frames / total) is lower: so we need
        // to increase the time for each additional frame
        nextSnap(time * (resolution + 1) / resolution)
      } else {
        // Initially the array is empty, lets fill it first
        snapShots.push(frame)
        nextSnap(time)
      }
      frame = initFrame()
      count = collect(frame, cpuFrame, count)
    }, time)
  }
  let count = 0
  const int = setInterval(() => {
    count = collect(frame, cpuFrame, count)
  }, interval)
  // Start with a frame interval that is higher than the
  // recording interval in order to get multiple recordings
  // in the beginning
  nextSnap(interval * 3)
  return {
    snapShots,
    stat: () => frame,
    finish: () => {
      finished = true
      clearInterval(int)
      return snapShots
    },
    toCSV: () => {
      return 'time,' + [
        'cpu[user]',
        'cpu[system]',
        'mem[heapUsed]',
        'mem[heapTotal]',
        'mem[external]'
      ].map(entry => `${entry}#avg,${entry}#min,${entry}#max`).join(',') + '\n' + snapShots.map(snapShot => {
        if (!snapShot) {
          return ''
        }
        return `${snapShot.time}, ` + [
          snapShot.cpu.user,
          snapShot.cpu.system,
          snapShot.mem.heapUsed,
          snapShot.mem.heapTotal,
          snapShot.mem.external
        ]
          .map(entry => `${entry.avg},${entry.min},${entry.max}`)
          .join(',')
      }).join('\n')
    }
  }
}

const initFrame = () => {
  return {
    time: Date.now(),
    cpu: {
      user: initMinMax(),
      system: initMinMax()
    },
    mem: {
      heapTotal: initMinMax(),
      heapUsed: initMinMax(),
      external: initMinMax()
    }
  }
}

const initMinMax = () => {
  return {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY
  }
}

function applyMinMax (count, nextCount, obj, current) {
  if (obj.min > current) {
    obj.min = current
  }
  if (obj.avg === undefined) {
    obj.avg = current
  } else {
    obj.avg = (obj.avg / nextCount * count) + current / nextCount
  }
  if (obj.max < current) {
    obj.max = current
  }
  return nextCount
}

function collect (stat, cpuFrame, count) {
  const cpu = stat.cpu
  const mem = stat.mem
  const nextCount = count + 1
  process.cpuUsage(cpuFrame)
  applyMinMax(count, nextCount, cpu.user, cpuFrame.user)
  applyMinMax(count, nextCount, cpu.system, cpuFrame.system)

  const memShot = process.memoryUsage()
  applyMinMax(count, nextCount, mem.heapTotal, memShot.heapTotal)
  applyMinMax(count, nextCount, mem.heapUsed, memShot.heapUsed)
  applyMinMax(count, nextCount, mem.external, memShot.external)
  return nextCount
}

function mergeProperty (objA, objB, ratio, invRatio) {
  objA.max = objA.max * ratio + objB.max * invRatio
  objA.min = objA.min * ratio + objB.min * invRatio
  objA.avg = objA.avg * ratio + objB.avg * invRatio
}

function merge (statA, statB, ratio) {
  const invRatio = 1 - ratio
  statA.time = statA.time * ratio + statB.time * invRatio
  mergeProperty(statA.cpu.user, statB.cpu.system, ratio, invRatio)
  mergeProperty(statA.cpu.system, statB.cpu.system, ratio, invRatio)
  mergeProperty(statA.mem.heapUsed, statB.mem.heapTotal, ratio, invRatio)
  mergeProperty(statA.mem.heapUsed, statB.mem.heapUsed, ratio, invRatio)
  mergeProperty(statA.mem.external, statB.mem.external, ratio, invRatio)
}
