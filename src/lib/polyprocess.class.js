
/** 
 * @typedef Point
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {Point[]} adjacentPoints
 * @property {Object} data
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



function angleBetweenPoints(startPt, endPt) {

  return Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x);

}

function angleBetweenSegments(startPt, midPt, endPt) {

  const angle1 = angleBetweenPoints(startPt, midPt);
  const angle2 = angleBetweenPoints(midPt, endPt);

  return angle2 - angle1;

}

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

  return {
    id,
    x: arr[0],
    y: arr[1],
    adjacentPoints: [],
    data: {},
  };

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
    });
  });

  return pts;

}

/**
 * 
 * @param {number[][]} triangleArr 
 * @param {{[key:string]: Point}} pointsCache 
 * @returns {Triangle}
 */
function triangleArrayToTriangle(triangleArr, pointsCache) {

  const p = triangleArrayToPoints(triangleArr, pointsCache);

  return {
    a: p[0],
    b: p[1],
    c: p[2],
    id: `${p[0].id}-${p[1].id}-${p[2].id}`,
  }

}

/**
 * 
 * @param {number[][][]} triangles 
 * @param {{[key:string]: Point}} pointsCache
 * @returns {Point[]}
 */
function trianglesToPoints(triangles, pointsCache) {

  return triangles.map(t => triangleArrayToPoints(t, pointsCache)).reduce((acc, p) => acc.concat(p), []);

}

export default class PolyProcess {
  
  /**
   * 
   * @param {number[][][]} triangles 
   */
  constructor(triangles) {

    this.triangles = triangles;
    /** @type {{[key:string]: Point}} */
    this.pointsCache = {};
    this.points = trianglesToPoints(triangles, this.pointsCache);

  }

  findPath(startPt, angleThresholdDegrees = 15) {
    
    let ang = angleThresholdDegrees * Math.PI / 180;

    let usedPoints = [startPt];



  }

  findPaths() {

  }

}