
/** 
 * @typedef Point
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {Point[]} adjacentPoints
 * @property {Object} data
 */

/** 
 * @typedef Edge
 * @property {Point} a
 * @property {Point} b
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
 * @property {Edge[]} edges
 */

const EPSILON = 0.1;

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
 * @returns {Point[]}
 */
function trianglesToPoints(triangles) {
  
  /** @type {{[key:string]: Point}} */
  const pointsCache = {};

  return triangles.map(t => triangleArrayToPoints(t, pointsCache)).reduce((acc, p) => acc.concat(p), []);

}

export default class PolyProcess {
  


}