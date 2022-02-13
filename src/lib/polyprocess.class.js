
/** 
 * @typedef Point
 * @property {string} [id]
 * @property {number} x
 * @property {number} y
 * @property {Point[]} [adjacentPoints]
 * @property {Object} [data]
 */

/**
 * @typedef Triangle
 * @property {string} id
 * @property {Point} a
 * @property {Point} b
 * @property {Point} c
 */

/**
 * @typedef Path
 * @property {Point[]} points
 */

/**
 * 
 * @param {Point} pt1 
 * @param {Point} pt2 
 * @returns {number}
 */
function distanceBetweenPoints(pt1, pt2) {

  return Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));

}

function averagePoints (...points) {

  const x = points.reduce((acc, pt) => acc + pt.x, 0) / points.length;
  const y = points.reduce((acc, pt) => acc + pt.y, 0) / points.length;

  return {
    x,
    y,
  };

}

/**
 * 
 * @param {Point} startPt 
 * @param {Point} midPt 
 * @param {Point} endPt 
 * @returns {number}
 */
function angleBetweenSegments(startPt, midPt, endPt) {

  var dAx = midPt.x - startPt.x;
  var dAy = midPt.y - startPt.y;
  var dBx = endPt.x - midPt.x;
  var dBy = endPt.y - midPt.y;

  //dAx = dBx; // vertical
  //dAy = dBy; // horizontal
  
  var angle = Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy);
  if (angle < 0) {angle = angle * -1;}

  return angle;

}

/**
 * 
 * @param {Point} startPt 
 * @param {Point} midPt 
 * @param {Point} endPt 
 * @returns {number}
 */
function absoluteAngleBetweenSegments(startPt, midPt, endPt) {

  return Math.abs(angleBetweenSegments(startPt, midPt, endPt));

}

/**
 * 
 * @param {number[]} arr 
 * @param {{[key:string]: Point}} pointsCache 
 * @returns {Point}
 */
function arrayToPoint(arr, pointsCache) {

  const id = `${Math.round(arr[0])}-${Math.round(arr[1])}`;

  if (pointsCache[id]) {
    return pointsCache[id];
  }

  const pt = {
    id,
    x: arr[0],
    y: arr[1],
    adjacentPoints: [],
    data: {},
  };

  pointsCache[id] = pt;
  
  return pt;

}

/**
 * 
 * @param {number[][]} triangleArr 
 * @param {{[key:string]: Point}} pointsCache 
 * @returns {Point[]}
 */
function triangleArrayToPoints(triangleArr, pointsCache) {

  const pts = triangleArr.map(arr => arrayToPoint(arr, pointsCache));

  pts.forEach(ptA => {
    pts.forEach(ptB => {
      if (ptA !== ptB && ptA.adjacentPoints.indexOf(ptB) === -1) {
        ptA.adjacentPoints.push(ptB);
      }
      if (ptA !== ptB && ptB.adjacentPoints.indexOf(ptA) === -1) {
        ptB.adjacentPoints.push(ptA);
      }
    });
  });

  return pts;

}

/**
 * 
 * @param {number[][][]} triangles 
 * @param {{[key:string]: Point}} pointsCache
 * @returns {Point[]}
 */
function trianglesToPoints(triangles, pointsCache) {

  const pts = triangles.map(t => triangleArrayToPoints(t, pointsCache)).reduce((acc, p) => acc.concat(p), []);
  
  // return unique pts;
  return pts.filter((pt, idx) => pts.indexOf(pt) === idx);

}

export default class PolyProcess {
  
  /**
   * 
   * @param {number[][][]} triangles 
   */
  constructor(triangles) {

    this.triangles = triangles;
    this.triangles.sort((a, b) => a[0][1] - b[0][1]);
    /** @type {{[key:string]: Point}} */
    this.pointsCache = {};
    this.points = trianglesToPoints(triangles, this.pointsCache);

  }

  /**
   * 
   * @param {Point} startPt 
   * @param {Point} nextPt 
   * @param {number} angleThresholdDegrees 
   * @param {Point[]} globalUsedPoints
   */
  findPath(startPt, nextPt, angleThresholdDegrees = 0, lengthThreshold = 0, globalUsedPoints = []) {
    
    let threshold = angleThresholdDegrees * Math.PI / 180;

    let path = [];

    let usedPoints = [startPt, nextPt];

    let prevPt = startPt;
    let currentPt = nextPt;
    let prevRegAng = NaN;
    let reversed = false;

    while (prevPt && currentPt) {

      /** @type {{ pt: Point, ang: number, regAng: number }[]} */
      let candidates = [];

      currentPt.adjacentPoints.forEach(adjPt => {
        if (adjPt !== prevPt && usedPoints.indexOf(adjPt) === -1 && globalUsedPoints.indexOf(adjPt) === -1) {
          // if nextPt is adjacent to prevPt, then they are on the same triangle and we can't go back
          if (prevPt && adjPt.adjacentPoints.indexOf(prevPt) !== -1) {
            return;
          }
          let newRegAng = angleBetweenSegments(prevPt, currentPt, adjPt);
          candidates.push({
            pt: adjPt,
            //ang: !isNaN(prevRegAng) ? Math.abs(prevRegAng - newRegAng) : Math.abs(newRegAng),
            ang: Math.abs(newRegAng),
            regAng: angleBetweenSegments(prevPt, currentPt, adjPt),
          });
        }
      });

      if (!candidates.length) {
        break;
      } 

      candidates.sort((a, b) => a.ang - b.ang);

      let bestCandidate = candidates[0];
      prevRegAng = bestCandidate.regAng;

      if (
        (threshold > 0 && bestCandidate.ang > threshold * 5) ||
        (lengthThreshold > 0 && distanceBetweenPoints(prevPt, bestCandidate.pt) > lengthThreshold)
        ) {
        if (reversed || (path.length < 2 && reversed)) {
          break;
        }
        reversed = true;
        path.reverse();
        prevPt = path[path.length - 2];
        currentPt = path[path.length - 1];
        continue;
      }

      usedPoints.push(bestCandidate.pt);
      path.push(bestCandidate.pt);

      prevPt = currentPt;
      currentPt = bestCandidate.pt;

    }

    if (reversed) {
      path.reverse();
    }

    return path;

  }

  findPaths(angleThresholdDegrees = 15, lengthThreshold = 0, pathLengthThreshold = 5, points = this.points.concat(), globalUsedPoints = []) {

    points.sort((a, b) => a.x * a.y - b.x * b.y);

    const paths = [];

    const numPts = points.length;
    const maxTries = numPts * 3;
    let tries = 0;

    while (points.length) {

      tries++;

      let startPt = points.shift();

      if (globalUsedPoints.indexOf(startPt) !== -1) {
        continue;
      }

      const ap = startPt.adjacentPoints;

      /** @type {Point[][]} */
      let candidatePaths = [];

      ap.forEach(adjPt => {
        const path = this.findPath(startPt, adjPt, angleThresholdDegrees, lengthThreshold, globalUsedPoints);
        if (path.length > Math.max(1, pathLengthThreshold)) {
          candidatePaths.push(path);
        }
      });

      if (candidatePaths.length) {

        candidatePaths.sort((a, b) => b.length - a.length);

        const bestPath = candidatePaths[0];
        paths.push(bestPath);
        bestPath.forEach(pt => globalUsedPoints.push(pt));
        const lastPt = bestPath[bestPath.length - 1];
        points.sort((a, b) => distanceBetweenPoints(lastPt, a) - distanceBetweenPoints(lastPt, b));
        
      } else {

        points.push(startPt);

      }

      if (tries > maxTries) {
        break;
      }

    }

    for (let i = 0; i < 3; i++) {

      paths.forEach(path => {
        let prevStartPt = path[1];
        let startPt = path[0];
        let prevEndPt = path[path.length - 2];
        let endPt = path[path.length - 1];

        if (!startPt.adjacentPoints || !endPt.adjacentPoints) {
          return;
        }
        let unusedAdjacentStartPts = startPt.adjacentPoints.filter(adjPt => globalUsedPoints.indexOf(adjPt) === -1);
        let unusedAdjacentEndPts = endPt.adjacentPoints.filter(adjPt => globalUsedPoints.indexOf(adjPt) === -1);

        if (unusedAdjacentStartPts.length) {

          let candidates = [];

          unusedAdjacentStartPts.forEach(adjPt => {
            let newRegAng = angleBetweenSegments(prevStartPt, startPt, adjPt);
            candidates.push({
              pt: adjPt,
              ang: Math.abs(newRegAng),
            });
          });
    
          candidates.sort((a, b) => a.ang - b.ang);
          path.unshift(candidates[0]);
          globalUsedPoints.push(candidates[0]);

        }

        if (unusedAdjacentEndPts.length) {

          let candidates = [];

          unusedAdjacentEndPts.forEach(adjPt => {
            let newRegAng = angleBetweenSegments(prevEndPt, endPt, adjPt);
            candidates.push({
              pt: adjPt,
              ang: Math.abs(newRegAng),
            });
          });
    
          candidates.sort((a, b) => a.ang - b.ang);
          path.unshift(candidates[0]);
          globalUsedPoints.push(candidates[0]);

        }

      });

    }

    console.log(this.points.length, globalUsedPoints.length)
    
    return paths;

  }

}