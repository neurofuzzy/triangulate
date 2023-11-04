const EPSILON = 0.001;

class Point {
  /**
   * @param {number} x
   * @param {number} y
   * @param {any} [data]
   */
  constructor(x, y, data = null) {
    this.x = x;
    this.y = y;
    this.data = data;
  }
  /**
   * @param {Point} pt
   */
  static clone(pt) {
    return new Point(pt.x, pt.y, Object.assign({}, pt.data));
  }
}

class CurvePoint extends Point {

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} cx
   * @param {number} cy
   * @param {number} cx2
   * @param {number} cy2
   * @param {number} x2
   * @param {number} y2
   * @param {any} [data]
   */
  constructor(x, y, cx, cy, cx2, cy2, x2, y2, data = null) {
    super(x, y, data);
    this.cx = cx;
    this.cy = cy;
    this.cx2 = cx2;
    this.cy2 = cy2;
    this.x2 = x2;
    this.y2 = y2;
    this.data = data;
  }

  /**
   * @param {CurvePoint} pt
   */
  static clone(pt) {
    return new CurvePoint(pt.x, pt.y, pt.cx, pt.cy, pt.cx2, pt.cy2, pt.x2, pt.y2, Object.assign({}, pt.data));
  }

  static fromArray (arr, data = null) {
    return new CurvePoint(arr[0][0], arr[0][1], arr[1][0], arr[1][1], arr[2][0], arr[2][1], arr[3][0], arr[3][1], data)
  }

}

class Curve {

  /**
   * 
   * @param {CurvePoint[]} pts 
   */
  constructor(pts, data = null) {
    this._points = pts;
    this.data = data;
  }

  toPoints(local) {
    return this._points;
  }

  static fromArray(arr, data = null) {
    return new Curve(arr.map(a => CurvePoint.fromArray(a), data));
  }

  /**
   * @returns {BoundingBox}
   */
  getBoundingBox() {
    const bb = new BoundingBox(1000000, 1000000, -1000000, -1000000);
    const pts = this.toPoints();
    pts.forEach((pt) => {
      bb.minX = Math.min(bb.minX, pt.x);
      bb.minY = Math.min(bb.minY, pt.y);
      bb.maxX = Math.max(bb.maxX, pt.x);
      bb.maxY = Math.max(bb.maxY, pt.y);
    });
    return bb;
  }

}

class BoundingBox {
  /**
   * @param {number} minX
   * @param {number} minY
   * @param {number} maxX
   * @param {number} maxY
   */
  constructor(minX, minY, maxX, maxY) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }
  width() {
    return Math.abs(this.maxX - this.minX);
  }
  height() {
    return Math.abs(this.maxY - this.minY);
  }
  center() {
    return new Point(
      this.minX + (this.maxX - this.minX) * 0.5,
      this.minY + (this.maxY - this.minY) * 0.5,
    )
  }
  equals(bb) {
    const ptAA = new Point(this.minX, this.minY);
    const ptAB = new Point(this.maxX, this.maxY);
    const ptBA = new Point(bb.minX, bb.minY);
    const ptBB = new Point(bb.maxX, bb.maxY);
    return GeomUtil.pointsEqual(ptAA, ptBA, 10) && GeomUtil.pointsEqual(ptAB, ptBB, 10);
  }
}

class BoundingCircle {
  /**
   *
   * @param {number} r radius
   */
  constructor(r = 0) {
    this.r = r;
  }
}

class Segment {
  /**
   *
   * @param {Point} a start point
   * @param {Point} b end point
   * @param {any} [data]
   */
  constructor(a, b, data = null) {
    this.a = a;
    this.b = b;
    this.data = data;
    this.tags = {};
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   * @param {number} [scale]
   */
  static isEqual(segA, segB, scale = 1, noReverse = false) {
    return (
      (GeomUtil.pointsEqual(segA.a, segB.a, scale) && GeomUtil.pointsEqual(segA.b, segB.b, scale)) ||
      (!noReverse && (GeomUtil.pointsEqual(segA.b, segB.a, scale) && GeomUtil.pointsEqual(segA.a, segB.b, scale)))
    );
  }

  length() {
    return GeomUtil.distanceBetween(this.a, this.b);
  }

  lengthSquared() {
    return GeomUtil.distanceBetweenSquared(this.a, this.b);
  }

  angle() {
    return GeomUtil.normalizeAngle(GeomUtil.angleBetween(this.a, this.b));
  }

  /**
   * @param {Segment} seg
   */
  static clone(seg) {
    return new Segment(new Point(seg.a.x, seg.a.y, seg.a.data), new Point(seg.b.x, seg.b.y, seg.b.data), Object.assign({}, seg.data));
  }

  /**
   * @param {Segment[]} segs
   * @returns {Segment[]}
   */
  static reverse(segs) {
    segs = segs.concat().reverse();
    segs.forEach(seg => {
      const tmp = seg.a;
      seg.a = seg.b;
      seg.b = tmp;
    })
    return segs;
  }
}

class SegmentCollection {
  constructor() {
    this.pivot = new Point(0, 0);
    this.data = {};
    this.rotation = 0;
    this.isOpen = true;
    this.isGroup = false;
    this.isStrong = false;
    /**
     *
     * @param {Point[]} pts
     */
    this._makeAbsolute = (pts) => {
      let rot = (this.rotation * Math.PI) / 180;
      pts.forEach((pt, idx) => {
        const ptA = Point.clone(pt);
        GeomUtil.rotatePoint(ptA, rot);
        ptA.x += this.pivot.x;
        ptA.y += this.pivot.y;
        pts[idx] = ptA;
      });
    };
    /**
     *
     * @param {Segment[]} segs
     */
    this._makeSegsAbsolute = (segs) => {
      let rot = (this.rotation * Math.PI) / 180;
      segs.forEach((seg) => {
        const ptA = Point.clone(seg.a);
        const ptB = Point.clone(seg.b);
        GeomUtil.rotatePoint(ptA, rot);
        GeomUtil.rotatePoint(ptB, rot);
        GeomUtil.addToPoint(ptA, this.pivot);
        GeomUtil.addToPoint(ptB, this.pivot);
        seg.a = ptA;
        seg.b = ptB;
      });
    };
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    throw "not implemented";
  }

  /**
   *
   * @param {boolean} local
   * @returns {Segment[]};
   */
  toSegments(local = false) {
    throw "not implemented";
  }

  /**
   *
   * @param {boolean} local
   * @returns {BoundingBox}
   */
  getBoundingBox(local = false) {
    const bb = new BoundingBox(1000000, 1000000, -1000000, -1000000);
    const pts = this.toPoints(local);
    pts.forEach((pt) => {
      bb.minX = Math.min(bb.minX, pt.x);
      bb.minY = Math.min(bb.minY, pt.y);
      bb.maxX = Math.max(bb.maxX, pt.x);
      bb.maxY = Math.max(bb.maxY, pt.y);
    });

    return bb;
  }

  /**
   * @returns {BoundingCircle}
   */
  getBoundingCircle() {
    const bc = new BoundingCircle();
    const pts = this.toPoints(true);
    pts.forEach((pt) => {
      bc.r = Math.max(bc.r, Math.sqrt(pt.x * pt.x + pt.y * pt.y));
    });
    return bc;
  }
}

class Segments extends SegmentCollection {
  /**
   *
   * @param {Segment[]} segments
   */
  constructor(segments) {
    super();
    /** @type {Segment[]} */
    this._segments = segments;
  }

  /**
   * @param {Segment[]} segs
   */
  add(...segs) {
    this._segments = this._segments.concat(segs);
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    return this.toSegments(local).reduce((arr, seg) => {
      return seg ? arr.concat([seg.a, seg.b]) : arr;
    }, []);
  }
  /**
   *
   * @param {boolean} local
   * @returns {Segment[]};
   */
  toSegments(local = false) {
    let segs = this._segments.reduce((arr, seg) => {
      return seg ? arr.concat(Segment.clone(seg)) : arr;
      }, []);
    if (!local) {
      this._makeSegsAbsolute(segs);
    }
    return segs;
  }

  bake() {
    // noOp
  }

  result() {
    return Segments.clone(this);
  }

  /**
   *
   * @param {Segments} segs
   */
  static clone(segs) {
    let sA = segs._segments;
    let sB = [];
    let i = sA.length;
    while (i--) {
      sB.unshift(Segment.clone(sA[i]));
    }
    let s = new Segments(sB);
    s.pivot.x = segs.pivot.x;
    s.pivot.y = segs.pivot.y;
    s.rotation = segs.rotation;
    s.data = Object.assign({}, segs.data);
    return s;
  }
}

class GeomUtil {
  /**
   *
   * @param {number} a
   * @param {number} b
   * @param {number} d
   * @returns {number}
   */
  static lerp(a, b, d) {
    return (1 - d) * a + d * b;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   */
  static angleBetween(ptA, ptB) {
    return Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);
  }

  /**
   * @param {number} ang
   * @returns {number}
   */
  static normalizeAngle(ang) {
    while (ang > Math.PI) {
      ang -= Math.PI * 2;
    }
    while (ang < 0 - Math.PI) {
      ang += Math.PI * 2;
    }
    return ang;
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   */
  static sameAngle(segA, segB) {
    let aA = GeomUtil.angleBetween(segA.a, segA.b);
    let aB = GeomUtil.angleBetween(segB.a, segB.b);

    return Math.abs(aA - aB) < EPSILON;
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   */
  static sameAngleRev(segA, segB) {
    let aA = GeomUtil.angleBetween(segA.a, segA.b);
    let aB = GeomUtil.angleBetween(segB.b, segB.a);

    return Math.abs(aA - aB) < EPSILON;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {number} d
   * @returns {Point}
   */
  static lerpPoints(ptA, ptB, d) {
    return new Point(
      GeomUtil.lerp(ptA.x, ptB.x, d),
      GeomUtil.lerp(ptA.y, ptB.y, d),
      Object.assign({}, d < 0.5 ? ptA.data : ptB.data),
    );
  }

  /**
   *
   * @param {Point} pt the point to rotate in place
   * @param {number} deg angle in degrees
   */
  static rotatePointDeg(pt, deg) {
    GeomUtil.rotatePoint(pt, (deg * Math.PI) / 180);
  }

  /**
   *
   * @param {Point} pt
   * @param {*} rad
   */
  static rotatePoint(pt, rad) {
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const oldY = pt.y;
    const oldX = pt.x;

    pt.y = cos * oldY - sin * oldX;
    pt.x = sin * oldY + cos * oldX;
  }

  /**
   *
   * @param {number} rad
   * @param  {...Point} points
   */
  static rotatePoints(rad, ...points) {
    points.forEach((pt) => {
      GeomUtil.rotatePoint(pt, rad);
    });
  }

  /**
   *
   * @param {number} deg
   * @param  {...Point} points
   */
  static rotatePointsDeg(deg, ...points) {
    let rad = (deg * Math.PI) / 180;
    points.forEach((pt) => {
      GeomUtil.rotatePoint(pt, rad);
    });
  }

  /**
   *
   * @param {number} deg
   * @param  {...Segment} segs
   */
  static rotateSegsDeg(deg, ...segs) {
    let rad = (deg * Math.PI) / 180;
    segs.forEach(seg => {
      GeomUtil.rotatePoint(seg.a, rad);
      GeomUtil.rotatePoint(seg.b, rad);
    });
  }

  // Based on http://stackoverflow.com/a/12037737

  static outerTangents(ptA, rA, ptB, rB) {
    var dx = ptB.x - ptA.x;
    var dy = ptB.y - ptA.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= Math.abs(rB - rA)) return []; // no valid tangents

    // Rotation from x-axis
    var angle1 = Math.atan2(dy, dx);
    var angle2 = Math.acos((rA - rB) / dist);

    return [
      new Segment(
        new Point(
          ptA.x + rA * Math.cos(angle1 + angle2),
          ptA.y + rA * Math.sin(angle1 + angle2),
        ),
        new Point(
          ptB.x + rB * Math.cos(angle1 + angle2),
          ptB.y + rB * Math.sin(angle1 + angle2),
        )
      ),
      new Segment(
        new Point(
          ptA.x + rA * Math.cos(angle1 - angle2),
          ptA.y + rA * Math.sin(angle1 - angle2),
        ),
        new Point(
          ptB.x + rB * Math.cos(angle1 - angle2),
          ptB.y + rB * Math.sin(angle1 - angle2),
        )
      ),
    ];
  }

  /**
   *
   * @param {Point} pt
   */
  static cartesian2Polar(pt) {
    const d = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
    const r = Math.atan2(pt.y, pt.x);
    pt.x = d;
    pt.y = r;
  }

  static polar2Cartesian(pt) {
    let x = pt.x;
    let y = pt.y;
    pt.x = x * Math.cos(y);
    pt.y = x * Math.sin(y);
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {number} [scale]
   * @returns {boolean}
   */
  static pointsEqual(ptA, ptB, scale = 1) {
    return (
      Math.round(ptA.x * 10000 / scale) == Math.round(ptB.x * 10000 / scale) && Math.round(ptA.y * 10000 / scale) == Math.round(ptB.y * 10000 / scale)
    );
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   * @param {number} [scale]
   * @returns {boolean}
   */
  static segmentsEqual(segA, segB, scale = 1) {
    return (
      (GeomUtil.pointsEqual(segA.a, segB.a, scale) && GeomUtil.pointsEqual(segA.b, segB.b, scale)) ||
      (GeomUtil.pointsEqual(segA.a, segB.b, scale) && GeomUtil.pointsEqual(segA.b, segB.a, scale)) 
    )
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @returns {number}
   */
  static distanceBetween(ptA, ptB) {
    const dx = ptB.x - ptA.x;
    const dy = ptB.y - ptA.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @returns {number}
   */
  static distanceBetweenSquared(ptA, ptB) {
    const dx = ptB.x - ptA.x;
    const dy = ptB.y - ptA.y;
    return dx * dx + dy * dy;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {number} numSegs
   * @returns {Point[]}
   */
  static interpolatePoints(ptA, ptB, numSegs) {
    let pts = [Point.clone(ptA)];
    let perc = 1 / numSegs;
    let deltaX = (ptB.x - ptA.x) * perc;
    let deltaY = (ptB.y - ptA.y) * perc;
    for (var i = 1; i < numSegs; i++) {
      pts.push(
        new Point(
          ptA.x + deltaX * i,
          ptA.y + deltaY * i,
          Object.assign({}, i < numSegs * 0.5 ? ptA.data : ptB.data),
        )
      );
    }
    pts.push(Point.clone(ptB));
    return pts;
  }

  /**
   *
   * @param  {...Point} pts
   */
  static averagePoints(...pts) {
    if (!pts || !pts.length) return null;
    let a = new Point(0, 0, Object.assign({}, pts[0].data));
    pts.forEach((pt) => {
      a.x += pt.x;
      a.y += pt.y;
    });
    a.x /= pts.length;
    a.y /= pts.length;
    return a;
  }

  /**
   * 
   * @param {Point[]} pts 
   * @param {number} scale 
   * @returns {Point[]}
   */
  static removeCoincidentPoints(pts, scale = 1) {
    let newPts = [];
    pts.forEach((pt, idx) => {
      if (idx == 0) {
        newPts.push(pt);
      } else {
        if (!GeomUtil.pointsEqual(pt, pts[idx - 1], scale)) {
          newPts.push(pt);
        }
      }
    });
    return newPts;
  }


  /**
   *
   * @param {Point} targetPt the point that will be added to
   * @param {Point} sourcePt the point to add to the target
   */
  static addToPoint(targetPt, sourcePt) {
    targetPt.x += sourcePt.x;
    targetPt.y += sourcePt.y;
  }

  /**
   *
   * @param {Point} targetPt the point that will be subtracted from
   * @param {Point} sourcePt the point tosubtract from the target
   */
  static subFromPoint(targetPt, sourcePt) {
    targetPt.x -= sourcePt.x;
    targetPt.y -= sourcePt.y;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {number} delta
   * @returns {Point[]}
   */
  static subdivideByDistance(ptA, ptB, delta) {
    if (delta === 0) {
      return [ptA, ptB];
    }
    let pts = [Point.clone(ptA)];
    let dist = GeomUtil.distanceBetween(ptA, ptB);
    let perc = delta / dist;
    let numFit = Math.floor(1 / perc);
    let remain = dist % delta;
    delta += remain / numFit;
    perc = delta / dist;
    let travel = perc;
    let i = 1;
    let deltaX = (ptB.x - ptA.x) * perc;
    let deltaY = (ptB.y - ptA.y) * perc;
    while (travel < 1) {
      const pt = new Point(
        ptA.x + deltaX * i,
        ptA.y + deltaY * i,
        Object.assign({}, travel < 0.5 ? ptA.data : ptB.data),
      );
      pts.push(pt);
      travel += perc;
      i++;
    }
    pts.push(Point.clone(ptB));
    return pts;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {number} delta
   * @returns {Point[]}
   */
  static subdivideByDistanceExact(ptA, ptB, delta) {
    if (delta === 0) {
      return [ptA, ptB];
    }
    let pts = [];
    let dist = GeomUtil.distanceBetween(ptA, ptB);
    let perc = delta / dist;
    let travel = perc;
    let i = 0;
    let deltaX = (ptB.x - ptA.x) * perc;
    let deltaY = (ptB.y - ptA.y) * perc;
    while (travel <= 1) {
      const pt = new Point(
        ptA.x + deltaX * i,
        ptA.y + deltaY * i,
        {
          dist: perc * i * dist,
        }
      );
      pts.push(pt);
      travel += perc;
      i++;
    }
    return pts;
  }
  
  /**
   *
   * @param {Segment[]} segs
   * @param {number} delta
   * @returns {Segment[]}
   */
  static subdivideSegmentsByDistance(segs, delta) {
    let out = [];
    segs.forEach(seg => {
      let s = GeomUtil.subdivideSegmentByDistance(seg, delta);
      out.push(...s);
    });
    return out;
  }

  /**
   *
   * @param {Segment} seg
   * @param {number} delta
   * @returns {Segment[]}
   */
  static subdivideSegmentByDistance(seg, delta) {
    const pts = GeomUtil.subdivideByDistance(seg.a, seg.b, delta);
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      segs.push(new Segment(pts[i], pts[i + 1], Object.assign({}, seg.data)));
    }
    return segs;
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   * @param {number} [scale]
   */
  static segmentsConnected(segA, segB, scale = 1) {
    return GeomUtil.pointsEqual(segA.b, segB.a, scale) || GeomUtil.pointsEqual(segA.a, segB.b, scale);
  }

  /**
   *
   * @param {Segment[]} segs
   * @returns {Point[]}
   */
  static segmentsToPoints(segs) {
    let pts = segs.reduce((arr, seg) => {
      return arr.concat(seg.a, seg.b);
    }, []);
    let i = pts.length;
    while (i--) {
      let pt = pts[i];
      if (i > 0 && GeomUtil.pointsEqual(pt, pts[i - 1])) {
        pts.splice(i, 1);
      }
    }
    return pts;
  }

  /**
   *
   * @param {Point[]} pts
   * @returns {number}
   */
  static polygonArea(pts) {
    let area = 0;
    let j = pts.length - 1;
    for (var i = 0; i < pts.length; i++) {
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
      j = i;
    }
    return area / 2;
  }

  /**
   *
   * @param {Point[]} pts
   * @returns {BoundingBox}
   */
  static pointsBoundingBox(pts) {
    const b = new BoundingBox(1000000, 1000000, -1000000, -1000000);

    pts.forEach((pt) => {
      b.minX = Math.min(b.minX, pt.x);
      b.minY = Math.min(b.minY, pt.y);
      b.maxX = Math.max(b.maxX, pt.x);
      b.maxY = Math.max(b.maxY, pt.y);
    });

    return b;
  }

  /**
   *
   * @param {BoundingBox[]} bbs
   * @returns {BoundingBox}
   */
  static boundingBoxesBoundingBox(bbs) {
    const b = new BoundingBox(1000000, 1000000, -1000000, -1000000);

    bbs.forEach((bb) => {
      if (bb) {
        b.minX = Math.min(b.minX, bb.minX);
        b.minY = Math.min(b.minY, bb.minY);
        b.maxX = Math.max(b.maxX, bb.maxX);
        b.maxY = Math.max(b.maxY, bb.maxY);
      }
    });

    return b;
  }

  /**
   *
   * @param {Segment[]} segs
   * @returns {BoundingBox}
   */
  static segmentsBoundingBox(segs) {
    const pts = [];
    if (!Array.isArray(segs)) {
      return null;
    }
    segs.forEach((seg) => {
      pts.push(seg.a);
      pts.push(seg.b);
    });
    return GeomUtil.pointsBoundingBox(pts);
  }

  /**
   *
   * @param {BoundingBox} ab
   * @param {BoundingBox} bb
   */
  static boundingBoxesIntersect(ab, bb) {
    return ab.maxX >= bb.minX && ab.maxY >= bb.minY && ab.minX <= bb.maxX && ab.minY <= bb.maxY;
  }

  /**
   *
   * @param {Point[]} pts
   * @returns {boolean}
   */
  static polygonIsClockwise(pts) {
    return GeomUtil.polygonArea(pts) > 0;
  }

  /**
   *
   * @param {Point} p1
   * @param {Point} p2
   * @param {Point} p3
   */
  static ccw(p1, p2, p3) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   * @returns {boolean}
   */
  static segmentsIntersect(segA, segB) {
    const fn = GeomUtil.ccw;
    return (
      fn(segA.a, segB.a, segB.b) != fn(segA.b, segB.a, segB.b) &&
      fn(segA.a, segA.b, segB.a) != fn(segA.a, segA.b, segB.b)
    );
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment} segB
   * @returns {Point}
   */
  static segmentSegmentIntersect(segA, segB, ignoreTouching = false) {
    const x1 = segA.a.x;
    const y1 = segA.a.y;
    const x2 = segA.b.x;
    const y2 = segA.b.y;
    const x3 = segB.a.x;
    const y3 = segB.a.y;
    const x4 = segB.b.x;
    const y4 = segB.b.y;

    const s1_x = x2 - x1;
    const s1_y = y2 - y1;
    const s2_x = x4 - x3;
    const s2_y = y4 - y3;

    const s = (-s1_y * (x1 - x3) + s1_x * (y1 - y3)) / (-s2_x * s1_y + s1_x * s2_y);
    const t = (s2_x * (y1 - y3) - s2_y * (x1 - x3)) / (-s2_x * s1_y + s1_x * s2_y);

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      const atX = x1 + t * s1_x;
      const atY = y1 + t * s1_y;
      let intPt = new Point(atX, atY);
      if (ignoreTouching) {
        if (GeomUtil.pointsEqual(intPt, segB.a) || GeomUtil.pointsEqual(intPt, segB.b)) {
          return;
        }
        if (GeomUtil.pointsEqual(intPt, segA.a) || GeomUtil.pointsEqual(intPt, segA.b)) {
          return;
        }
      }
      intPt.data = Object.assign({}, segB.data);
      intPt.data.dist = GeomUtil.distanceBetween(segA.a, intPt);
      return intPt;
    }

    return null;
  }

  /**
   *
   * @param {Segment} segA
   * @param {Segment[]} segs
   * @param {boolean} ignoreTouching
   * @param {boolean} removeDuplicates
   * @returns {Point[]}
   */
  static segmentSegmentsIntersections(segA, segs, ignoreTouching = false, removeDuplicates = false) {
    let pts = [];
    segs.forEach((seg) => {
      if (seg == segA) {
        return;
      }
      let intPt = GeomUtil.segmentSegmentIntersect(segA, seg, ignoreTouching);
      if (intPt) {
        let exists = false;
        if (removeDuplicates) {
          for (let pt of pts) {
            if (GeomUtil.pointsEqual(pt, intPt)) {
              exists = true;
              break;
            }
          }
        }
        if (!exists) {
          pts.push(intPt);
        }
      }
    });
    return pts;
  }

  /**
   * 
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {Segment[]} segs 
   * @param {number} minDist
   * @returns {Point[]}
   */
  static raycast(ptA, ptB, segs, minDist = 0) {

    let hitPts = GeomUtil.segmentSegmentsIntersections(new Segment(ptA, ptB), segs, false);

    hitPts.sort((a, b) => {
      const distA = a.data.dist;
      const distB = b.data.dist;
      if (distA > distB) {
        return 1;
      } else if (distA < distB) {
        return -1;
      }
      return 0;
    });

    if (hitPts.length) {
      if (GeomUtil.pointsEqual(hitPts[0], ptA, 10)) {
        hitPts.shift();
      }
    }

    if (hitPts.length && minDist) {
      while (hitPts.length && GeomUtil.distanceBetween(hitPts[0], ptA) < minDist) {
        hitPts.shift();
      }
    }

    if (hitPts.length) {
      return hitPts;
    }

    return [ptB];

  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   */
  static dot(ptA, ptB) {
    return ptA.x * ptB.x + ptA.y * ptB.y;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   */
  static cross(ptA, ptB) {
    return ptA.x * ptB.y - ptA.y * ptB.x;
  }

  /**
   * 
   * @param {Point} pt 
   * @param {Point} ptA 
   * @param {Point} ptB 
   */
  static lineSide (pt, ptA, ptB) {
    return Math.round(((ptB.x - ptA.x) * (pt.y - ptA.y) - (ptB.y - ptA.y) * (pt.x - ptA.x)) * 100) / 100;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   */
  static sub(ptA, ptB) {
    return new Point(ptA.x - ptB.x, ptA.y - ptB.y, Object.assign({}, ptA.data));
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   */
  static add(ptA, ptB) {
    return new Point(ptA.x + ptB.x, ptA.y + ptB.y, Object.assign({}, ptA.data));
  }

  /**
   *
   * @param {Point} pt
   * @param {Segment} seg
   * @returns {Point}
   */
  static closestPtPointSegment(pt, seg) {
    var ab = GeomUtil.sub(seg.b, seg.a);
    var ca = GeomUtil.sub(pt, seg.a);
    var t = GeomUtil.dot(ca, ab);

    if (t < 0) {
      pt = seg.a;
    } else {
      var denom = GeomUtil.dot(ab, ab);
      if (t >= denom) {
        pt = seg.b;
      } else {
        t /= denom;
        // reuse ca
        ca.x = seg.a.x + t * ab.x;
        ca.y = seg.a.y + t * ab.y;
        pt = ca;
      }
    }

    return Point.clone(pt);
  }

  /**
   *
   * @param {Point} pt
   * @param {Segment[]} segs
   * @returns {Point}
   */
  static closestPtPointSegments(pt, segs) {

    let closestPt = null;
    let closestDist = 100000000;

    segs.forEach((seg) => {
      let ptB = GeomUtil.closestPtPointSegment(pt, seg);
      let dist = GeomUtil.distanceBetween(pt, ptB);
      if (dist < closestDist) {
        closestPt = ptB;
        closestDist = dist;
      }
    });

    return closestPt;

  }

  /**
   *
   * @param {Point} pt
   * @param {Segment} seg
   */
  static distancePointSegment(pt, seg) {
    return GeomUtil.distanceBetween(pt, GeomUtil.closestPtPointSegment(pt, seg));
  }

  /**
   *
   * @param {*} pt
   * @param {*} boundingBox
   * @returns {boolean}
   */
  static pointWithinBoundingBox(pt, boundingBox) {
    return pt.x >= boundingBox.minX && pt.y >= boundingBox.minY && pt.x <= boundingBox.maxX && pt.y <= boundingBox.maxY;
  }

  /**
   *
   * @param {Point} pt
   * @param {Segment[]} polySegs
   * @returns {boolean}
   */
  static pointWithinPolygon(pt, polySegs, ignoreTouching) {
    const b = GeomUtil.segmentsBoundingBox(polySegs);
    // early out
    if (!this.pointWithinBoundingBox(pt, b)) {
      return false;
    }

    let startPt = new Point(b.minX - Math.PI * 72, b.minY - Math.PI * 100);
    let seg = new Segment(startPt, pt);

    let pts = GeomUtil.segmentSegmentsIntersections(seg, polySegs);

    if (!(pts.length % 2 == 0)) {
      startPt = new Point(b.maxX + Math.PI * 100, b.maxY + Math.PI * 72);
      seg = new Segment(startPt, pt);
      pts = GeomUtil.segmentSegmentsIntersections(seg, polySegs);
    }

    if (!(pts.length % 2 == 0)) {
      if (ignoreTouching && GeomUtil.pointsEqual(pt, pts[0])) {
        return false;
      }
    }

    return !(pts.length % 2 == 0);
  }

  /**
   *
   * @param {Segment} seg
   * @param {Segment[]} polySegs
   * @returns {boolean}
   */
  static segmentWithinPolygon(seg, polySegs, scale = 1) {
    if (scale !== 1) {
      let originalSeg = seg;
      seg = Segment.clone(seg);
      seg.a = GeomUtil.lerpPoints(originalSeg.a, originalSeg.b, scale - 1);
      seg.b = GeomUtil.lerpPoints(originalSeg.a, originalSeg.b, 2 - scale);
    }
    let aTouching = this.pointWithinPolygon(seg.a, polySegs, false);
    let bTouching = this.pointWithinPolygon(seg.b, polySegs, false);
    let aWithin = this.pointWithinPolygon(seg.a, polySegs, true);
    let bWithin = this.pointWithinPolygon(seg.b, polySegs, true);
    return (aWithin && bWithin) || (aWithin && bTouching) || (bWithin && aTouching);
  }

  static sign(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  /**
   *
   * @param {Point} pt
   * @param {Point} v1
   * @param {Point} v2
   * @param {Point} v3
   * @returns {boolean}
   */
  static pointWithinTriangle(pt, v1, v2, v3, ignoreTouching) {
    const d1 = GeomUtil.sign(pt, v1, v2);
    const d2 = GeomUtil.sign(pt, v2, v3);
    const d3 = GeomUtil.sign(pt, v3, v1);

    const has_neg = d1 < 0 || d2 < 0 || d3 < 0;
    const has_pos = d1 > 0 || d2 > 0 || d3 > 0;

    if (!(has_neg && has_pos) && ignoreTouching) {
      let seg = new Segment(v1, v2);
      if (GeomUtil.distancePointSegment(pt, seg) < 1) return false;
      seg.a = v2;
      seg.b = v3;
      if (GeomUtil.distancePointSegment(pt, seg) < 1) return false;
      seg.a = v3;
      seg.b = v1;
      if (GeomUtil.distancePointSegment(pt, seg) < 1) return false;
    }

    return !(has_neg && has_pos);
  }

  /**
   *
   * @param {Segment} seg
   * @param {Point} v1
   * @param {Point} v2
   * @param {Point} v3
   * @returns {boolean}
   */
  static segmentWithinTriangle(seg, v1, v2, v3) {
    let aTouching = this.pointWithinTriangle(seg.a, v1, v2, v3, false);
    let bTouching = this.pointWithinTriangle(seg.b, v1, v2, v3, false);
    let aWithin = this.pointWithinTriangle(seg.a, v1, v2, v3, true);
    let bWithin = this.pointWithinTriangle(seg.b, v1, v2, v3, true);
    let pt = GeomUtil.averagePoints(seg.a, seg.b);
    return (aWithin && bWithin) || (aWithin && bTouching) || (bWithin && aTouching) || (aTouching && bTouching);
  }

  /**
   *
   * @param {Point[]} pts
   * @returns {Segment[]}
   */
  static pointsToClosedPolySegments(...pts) {
    let out = [];
    for (let i = 0; i < pts.length; i++) {
      out.push(new Segment(pts[i], i < pts.length - 1 ? pts[i + 1] : pts[0], pts[i].data));
    }
    return out;
  }

  /**
   *
   * @param {Segment[]} polySegsA
   * @param {Segment[]} polySegsB
   * @returns {boolean}
   */
  static polygonWithinPolygon(polySegsA, polySegsB) {
    const ab = GeomUtil.segmentsBoundingBox(polySegsA);
    const bb = GeomUtil.segmentsBoundingBox(polySegsB);

    // early out
    if (!GeomUtil.boundingBoxesIntersect(ab, bb)) {
      return false;
    }

    const startPt = new Point(bb.minX - 100, bb.minY - 100);

    for (let i = 0; i < polySegsA.length; i++) {
      let seg = polySegsA[i];
      let pts = GeomUtil.segmentSegmentsIntersections(seg, polySegsB);

      if (pts.length % 2 == 0) {
        return false;
      }
    }

    return true;
  }

  /**
   *
   * @param {Point} ptA
   * @param {Point} ptB
   * @param {Point} ptC
   * @param {number} iterations
   */
  static splinePoints(ptA, ptB, ptC, iterations = 0) {
    let divide = (pts) => {
      let out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        let pt = new Point(0, 0, Object.assign({}, ptA.data));
        if (i + 1 < pts.length * 0.4) {
          pt.x = (pts[i].x * 40 + pts[i + 1].x * 60) * 0.01;
          pt.y = (pts[i].y * 40 + pts[i + 1].y * 60) * 0.01;
        } else if (i + 1 > pts.length * 0.6) {
          pt.x = (pts[i].x * 60 + pts[i + 1].x * 40) * 0.01;
          pt.y = (pts[i].y * 60 + pts[i + 1].y * 40) * 0.01;
        } else {
          pt.x = (pts[i].x + pts[i + 1].x) * 0.5;
          pt.y = (pts[i].y + pts[i + 1].y) * 0.5;
        }
        out.push(pt);
      }
      out.push(pts[pts.length - 1]);
      return out;
    };

    let spts = [ptA, ptB, ptC];

    for (let i = 0; i < iterations; i++) {
      spts = divide(spts);
    }

    return spts;
  }

  /**
   * @param {Point[]} pts
   * @param {number} iterations
   * @param {number} minDist
   * @returns {Point[]}
   */
  static smoothLine(pts, iterations, minDist = 5, closed = false, d1 = 0.25, d2 = 0.75) {

    let inn = pts.concat();
    let out = [];
    let prev = inn.concat();

    for (let j = 0; j < iterations; j++) {

      out = [];

      if (prev.length && !closed) {
        out.push(prev[0])
      }

      let len = prev.length - 1;
      if (closed) len++;

      for (let i = 0; i < len; i++) {

        let p1 = prev[i];
        let p2 = prev[i + 1] || prev[0];

        if (i > 1 && i < len - 2) {
          let p0 = prev[i - 1];
          let p3 = prev[i + 2];
          if (p0 && p1 && p2 && p3) {
            if (p0.x == p1.x && p1.x == p2.x && p2.x == p3.x) {
              out.push(Point.clone(p1));
              continue;
            }
            if (p0.y == p1.y && p1.y == p2.y && p2.y == p3.y) {
              out.push(Point.clone(p1));
              continue;
            }
          }
        }

        if (!p2) continue;

        if (GeomUtil.distanceBetween(p1, p2) > minDist * 2) {

          let mx = d2 * p1.x + d1 * p2.x;
          let my = d2 * p1.y + d1 * p2.y;
          let nx = d1 * p1.x + d2 * p2.x;
          let ny = d1 * p1.y + d2 * p2.y;

          out.push(new Point(mx, my));
          out.push(new Point(nx, ny));

        } else if (!closed) {
          out.push(Point.clone(p2));
        } else {
          out.push(GeomUtil.averagePoints(p1, p2));
        }

      }

      prev = out;

    }

    if (closed && out.length) {
      out.push(out[0]);
    } else {
      out.push(inn[inn.length - 1]);
    }

    return out;

  }

  /**
   * 
   * @param {Segment[]} segs 
   * @param {number} iterations
   * @param {number} minDist
   * @returns {Segment[]} 
   */
  static smoothSegments(segs, iterations, minDist = 5, d1 = 0.25, d2 = 0.75) {

    let outSegs = [];

    let groups = [];
    let buffer = [];
    /** @type {Segment} */
    let pseg;

    for (let seg of segs) {

      if (pseg && !GeomUtil.pointsEqual(pseg.b, seg.a)) {
        groups.push(buffer);
        buffer = [];
      }

      buffer.push(seg);
      pseg = seg;

    }

    if (buffer.length) {
      groups.push(buffer);
    }

    for (let group of groups) {

      let closed = GeomUtil.pointsEqual(group[0].a, group[group.length - 1].b);

      let pts = [];
      group.forEach((bseg, idx) => {
        if (idx === 0 && !closed) {
          pts.push(bseg.a);
        }
        pts.push(bseg.b);
      });

      if (iterations > 0) {
        pts = GeomUtil.smoothLine(pts, iterations, minDist, closed, d1, d2);
      }

      for (let i = 0; i < pts.length - 1; i++) {
        outSegs.push(new Segment(pts[i], pts[i + 1]));
      }

    }


    return outSegs;

  }

  /**
   * 
   * @param {SegmentCollection[]} shapes 
   * @returns {Segments}
   */
  static mergeShapes (shapes, subtract = false, center = false, cleanup = false, jitter = true) {

    // this is magic
    if (jitter) {
      shapes.forEach((s, idx) => {
        s.pivot = s.pivot || new Point(0, 0);
        s.pivot.x += 0.007549 - idx * 0.0017;
        s.pivot.y += 0.007549 - idx * 0.0017;
      });
    }

    shapes = shapes.map(s => new Segments(s.toSegments()));

    /** @type {Segment[][]} */
    const segSets = shapes.map(shape => shape.toSegments());

    segSets.forEach((setA, idxA) => {
      segSets.forEach((setB, idxB) => {
        if (idxA !== idxB) {
          setA.forEach(segA => {
            let iPts = GeomUtil.segmentSegmentsIntersections(segA, setB, true, true);
            if (iPts) {
              iPts = iPts.filter(pt => !GeomUtil.pointsEqual(segA.a, pt) && !GeomUtil.pointsEqual(segA.b, pt));
            }
            if (iPts && iPts.length) {
              if (!segA.data.intersectPoints) {
                segA.data.intersectPoints = [];
              }
              segA.data.intersectPoints.push(...iPts);
            }
          });
        }
      });
    });

    // split intersecting segs

    const originalSets = [];

    segSets.forEach(set => {

      originalSets.push(set.concat());

      let s = set.length;
      while (s--) {
        let seg = set[s];
        let intPts = seg.data.intersectPoints;
        if (intPts && intPts.length) {
          intPts = intPts.concat();
          intPts.sort((a, b) => {
            const ad = GeomUtil.distanceBetweenSquared(seg.a, a);
            const bd = GeomUtil.distanceBetweenSquared(seg.a, b);
            if (ad > bd) {
              return 1;
            } else if (ad < bd) {
              return -1;
            }
            return 0;
          });
          intPts.unshift(seg.a);
          intPts.push(seg.b);
          const innerSegs = [];
          for (let s2 = 1; s2 < intPts.length; s2++) {
            innerSegs.push(new Segment(Point.clone(intPts[s2 - 1]), Point.clone(intPts[s2]), {}));
          }
          //set.splice(s, 1);
          set.splice(s, 1, ...innerSegs);        
        }
      }

    });

    // delete new interior segs

    segSets.forEach((setA, idxA) => {
      segSets.forEach((setB, idxB) => {
        if (setA !== setB) {
          setA.forEach(segA => {
            if (!subtract || idxA === 0) {
              if (GeomUtil.segmentWithinPolygon(segA, originalSets[idxB], 1.01)) {
                segA.data.deleted = true;
              }
            } else {
              if (idxB === 0 && !GeomUtil.segmentWithinPolygon(segA, originalSets[idxB], 1.01)) {
                segA.data.deleted = true;
              }
            }
          });
        }
      });
    });

    if (subtract) {
      segSets.forEach((set, idx) => {
        if (idx === 0) return;
        Segment.reverse(set);
      });
    }

    let segs = segSets.reduce((arr, set) => arr.concat(set), []);
    segs = segs.filter(seg => !seg.data.deleted);

    // weld in proper order

    let orderedSegs = [segs.shift()];

    while (segs.length) {
      const segA = orderedSegs[orderedSegs.length - 1];
      let match = false;
      for (let i = 0; i < segs.length; i++) {
        let segB = segs[i];
        if (GeomUtil.pointsEqual(segA.b, segB.a, 10000)) {
          // weld broken joins
          if (!GeomUtil.pointsEqual(segA.b, segB.a)) {
            const pt = GeomUtil.averagePoints(segA.b, segB.a);
            segA.b = pt;
            segB.a = Point.clone(pt);
          }
          orderedSegs.push(segs.splice(i, 1)[0]);
          match = true;
          break;
        }
      }
      if (!match) {
        orderedSegs.push(segs.shift());
      }
    }

    let i = orderedSegs.length;

    while (i--) {

      const seg = orderedSegs[i];

      if (seg.length() < 0.1) {
        if (orderedSegs[i + 1]) {
          if (GeomUtil.pointsEqual(orderedSegs[i + 1].a, seg.b)) {
            orderedSegs[i + 1].a = seg.a;
          }
        }
        orderedSegs.splice(i, 1);
        continue;
      }
      
    }

    if (cleanup) {

      let i = orderedSegs.length;

      while (i--) {
  
        const seg = orderedSegs[i];
        const prevSeg = orderedSegs[i > 0 ? i - 1 : orderedSegs.length - 1];
        const nextSeg = orderedSegs[(i + 1) % orderedSegs.length];

        let maxLen = i === 0 || i === orderedSegs.length - 1 ? 5 : 1000;
        let orphaned = true;
        if (seg.length() < maxLen) {
          for (let j = 0; j < orderedSegs.length; j++) {
            let segB = orderedSegs[j];
            if (seg !== segB) {
              if (GeomUtil.pointsEqual(seg.a, segB.b, 10000) ||
                GeomUtil.pointsEqual(seg.b, segB.a, 10000)) {
                  orphaned = false;
                  break;
              }
            }
          }
          if (orphaned) {
            orderedSegs.splice(i, 1);
          }
        }
        
      }

    }

    if (center) {

      let pts = orderedSegs.map(seg => seg.a);

      let cen = GeomUtil.averagePoints(...pts);

      orderedSegs.forEach(seg => {
        GeomUtil.subFromPoint(seg.a, cen);
        GeomUtil.subFromPoint(seg.b, cen);
      });

    }

    return new Segments(orderedSegs);

  }

  /**
   * 
   * @param {Segment[]} segs 
   * @param {number} dist 
   * @param {boolean} isOpen 
   * @returns {Segment[]}
   */
  static offsetSegs (segs, dist, isOpen = false) {

    let offsetSegs = [];

    segs.forEach((seg, idx) => {

      let prevSeg, thisSeg, nextSeg, op, ang, len;

      prevSeg = Segment.clone(idx > 0 ? segs[idx - 1] : segs[segs.length - 1]);
      thisSeg = Segment.clone(seg);
      nextSeg = Segment.clone(segs[(idx + 1) % segs.length]);

      let segz = [prevSeg, thisSeg, nextSeg];

      for (let seg of segz) {
        len = seg.length();
        ang = seg.angle();
        op = new Point(dist, 0);
        GeomUtil.rotatePoints(0 - ang + Math.PI * 0.5, op);
        let na = GeomUtil.lerpPoints(seg.a, seg.b, 0 - dist / len * 2);
        if (isOpen && idx === 0 && seg === thisSeg) na = Point.clone(seg.a);
        let nb = GeomUtil.lerpPoints(seg.b, seg.a, 0 - dist / len * 2);
        if (isOpen && idx === segs.length - 1 && seg === thisSeg) nb = Point.clone(seg.b);
        GeomUtil.addToPoint(na, op);
        GeomUtil.addToPoint(nb, op);
        seg.a = na;
        seg.b = nb;
      }

      let a = GeomUtil.segmentSegmentIntersect(segz[0], segz[1]);
      let b = GeomUtil.segmentSegmentIntersect(segz[1], segz[2]);

      if (a) {
        thisSeg.a = a;
      }

      if (b) {
        thisSeg.b = b;    
      }

      if (Math.round(thisSeg.angle() * 100) === Math.round(seg.angle() * 100)) {
        offsetSegs.push(thisSeg);
      }

    });

    return offsetSegs;

  }

  /**
   * 
   * @param {Point[]} points
   * @param {number} dist 
   * @returns {Point[]}
   */
  static offsetPoints (points, dist) {

    let segs = [];

    if (dist < 0) {
      dist = 0 - dist;
      points.reverse();
    }

    for (let i = 1; i < points.length; i++) {
      segs.push(new Segment(new Point(points[i - 1].x, points[i - 1].y), new Point(points[i].x, points[i].y)));
    }

    let offsetSegs = GeomUtil.offsetSegs(segs, dist, true);

    let offsetPoints = offsetSegs.map(seg => seg.b);
    offsetPoints.unshift(offsetSegs[0].a);

    return offsetPoints;

  }

  /**
   * 
   * @param {Segment[]} segs 
   */
  static centerSegments (segs) {

    let pts = segs.map(seg => seg.a);

    let cen = GeomUtil.averagePoints(...pts);

    segs.forEach(seg => {
      seg.a = Point.clone(seg.a);
      seg.b = Point.clone(seg.b);
      GeomUtil.subFromPoint(seg.a, cen);
      GeomUtil.subFromPoint(seg.b, cen);
    });

  }

  /**
   * 
   * @param {Segment[]} segs 
   * @returns {Segment[]}
   */
  static orderSegments (segs) {

    segs = segs.concat();

    // weld in proper order

    let orderedSegs = [segs.shift()];

    while (segs.length) {
      const segA = orderedSegs[orderedSegs.length - 1];
      let match = false;
      for (let i = 0; i < segs.length; i++) {
        let segB = segs[i];
        if (GeomUtil.pointsEqual(segA.b, segB.a)) {
          orderedSegs.push(segs.splice(i, 1)[0]);
          match = true;
          break;
        }
      }
      if (!match) {
        orderedSegs.push(segs.shift());
      }
    }

    return orderedSegs;
    
  }

  /**
   * 
   * @param {Segment[]} path 
   * @param {number} totalPoints
   * @param {boolean} allowFlex
   * @returns { { pt: Point, ang: number }[] }
   */
  static pointsAlongPath(path, totalPoints, allowFlex) {

    const ptAngs = [];

    const totalLength = path.reduce((len, seg) => len + seg.length(), 0);
    let separation = totalLength / totalPoints;

    for (let j = 0; j < totalPoints; j++) {

      let pointDelta = separation * j;
      let accumulatedLength = 0;

      let i = 0;
      let seg = path[i];

      while (i < path.length - 1 && (accumulatedLength + seg.length() < pointDelta - 0.0001 || seg.length() === 0)) {
        accumulatedLength += seg.length();
        i++;
        seg = path[i];
      }

      const prevSeg = path[i > 0 ? i - 1 : path.length - 1];
      const nextSeg = path[(i + 1) % path.length];

      let len = seg.length();

      if (seg && len) {
        pointDelta -= accumulatedLength;
        let pt = GeomUtil.lerpPoints(seg.a, seg.b, pointDelta / len);
        let ang = Math.PI - seg.angle();
        if (prevSeg && pointDelta / len < 0.01) {
          ang += Math.PI - prevSeg.angle();
          ang *= 0.5;
        }
        if (nextSeg && pointDelta / len > 0.99) {
          ang += Math.PI - nextSeg.angle();
          ang *= 0.5;
        }
        ptAngs.push({ pt, ang });
      }

    }

    return ptAngs;

  } 

  /**
   * 
   * @param {Segment[]} path
   * @returns { { pt: Point, ang: number }[] }
   */
  static midpointsInPath(path) {

    const ptAngs = [];

    for (let j = 0; j < path.length; j++) {

      let seg = path[j];
      let pt = GeomUtil.lerpPoints(seg.a, seg.b, 0.5);
      let ang = Math.PI - seg.angle();
      ptAngs.push({ pt, ang });

    }

    return ptAngs;

  }

  /**
   * 
   * @param {SVGPathElement} pathElement
   * @param {BoundingBox} bb 
   */
  static cropSVGPathToBoundingBox(pathElement, bb) {

    let pathData = pathElement.getAttribute("d");
    let isClosed = pathData.toLowerCase().indexOf("z") !== -1;
    
    let segs = [];

    let polys = pathData.split(/z/gi);

    polys.forEach(pathData => {

      let commands = pathData.split(/(?=M|L)/gi);

      let zeroPt = new Point(0, 0);
      let cursor = new Point(0, 0);

      commands.forEach((cmd, idx) => {
        cmd = cmd.trim();
        let directive = cmd.charAt(0).toUpperCase();
        let coords = cmd.slice(1).split(/\,| /g);
        let seg;
        if (coords[0] === "") {
          coords.shift();
        }
        if (coords.length === 2) {
          let x = parseFloat(coords[0]);
          let y = parseFloat(coords[1]);
          if (idx === 0) {
            zeroPt.x = x;
            zeroPt.y = y;
          }
          switch (directive) {
            case "L":
              seg = new Segment(Point.clone(cursor), new Point(x, y));
              segs.push(seg);
            case "M":
              cursor.x = x;
              cursor.y = y;
              break;
          }
        }
      });

      if (isClosed) {
        segs.push(
          new Segment(cursor, zeroPt),
        )
      }

    });

    GeomUtil.cropSegsToBoundingBox(segs, bb);

    let pointsStr = "";

    for (let i = 0; i < segs.length; i++) {
      let ps = "";
      if (i == 0 || !GeomUtil.pointsEqual(segs[i - 1].b, segs[i].a)) {
        ps = `M ${segs[i].a.x} ${segs[i].a.y} `;
        pointsStr += ps;
      }      
      ps = `L ${segs[i].b.x} ${segs[i].b.y} `;
      pointsStr += ps;
    }

    pathElement.setAttribute("d", pointsStr);

  }
  
  /**
   * 
   * @param {Segment[]} segs 
   * @param {BoundingBox} bb 
   * @param {boolean} addBorder
   */
  static cropSegsToBoundingBox (segs, bb, addBorder = false) {

    let i = segs.length;
    let tl = new Point(bb.minX, bb.minY);
    let tr = new Point(bb.maxX, bb.minY);
    let bl = new Point(bb.minX, bb.maxY);
    let br = new Point(bb.maxX, bb.maxY);

    let borderSegs = [
      new Segment(tl, tr),
      new Segment(tr, br),
      new Segment(br, bl),
      new Segment(bl, tl),
    ];

    while (i--) {

      let seg = segs[i];
      let aok = GeomUtil.pointWithinBoundingBox(seg.a, bb);
      let bok = GeomUtil.pointWithinBoundingBox(seg.b, bb);

      if (aok && bok) {
        continue;
      }

      let intPts = GeomUtil.segmentSegmentsIntersections(seg, borderSegs, false, false);

      if (!aok && !bok) {
        if (intPts && intPts.length > 1) {
          seg.a = intPts[0];
          seg.b = intPts[intPts.length - 1];
          continue;
        }
        segs.splice(i, 1);
        continue;
      }

      if (aok && !bok) {
        if (intPts && intPts.length) {
          seg.b = intPts[0];
          continue;
        }
      }

      if (!aok && bok) {
        if (intPts && intPts.length) {
          seg.a = intPts[0];
          continue;
        }
      }

    }

    if (addBorder) {
      segs.push(...borderSegs);
    }

  }

  /**
   * 
   * @param {Segment[]} segs 
   * @param {Segment[]} borderSegs 
   */
  static cropSegsToShape (segs, borderSegs) {

    let i = segs.length;

    while (i--) {

      let seg = segs[i];
      let aok = GeomUtil.pointWithinPolygon(seg.a, borderSegs);
      let bok = GeomUtil.pointWithinPolygon(seg.b, borderSegs);

      if (aok && bok) {
        continue;
      }

      let intPts = GeomUtil.segmentSegmentsIntersections(seg, borderSegs, false, false);

      if (!aok && !bok) {
        if (intPts && intPts.length > 1) {
          seg.a = intPts[0];
          seg.b = intPts[intPts.length - 1];
          continue;
        }
        segs.splice(i, 1);
        continue;
      }

      if (aok && !bok) {
        if (intPts && intPts.length) {
          seg.b = intPts[0];
          continue;
        }
      }

      if (!aok && bok) {
        if (intPts && intPts.length) {
          seg.a = intPts[0];
          continue;
        }
      }

    }

  }

  /**
   * 
   * @param {Segment[]} targetSegs 
   * @param {Segment[]} shapeSegs 
   */
  static cutShapeFromSegs (targetSegs, shapeSegs) {

    let i = targetSegs.length;

    while (i--) {

      let seg = targetSegs[i];
      let aok = GeomUtil.pointWithinPolygon(seg.a, shapeSegs, false);
      let bok = GeomUtil.pointWithinPolygon(seg.b, shapeSegs, false);

      if (aok && bok) {
        targetSegs.splice(i, 1);
        continue;
      }

      let intPts = GeomUtil.segmentSegmentsIntersections(seg, shapeSegs, false, false);

      if (!aok && !bok) {
        if (intPts && intPts.length > 1) {

          let segA = new Segment(seg.a, intPts[0]);
          let segB = new Segment(intPts[intPts.length - 1], seg.b);
          targetSegs.splice(i, 1, segA, segB);
          continue;
        }
        continue;
      }

      if (aok && !bok) {
        if (intPts && intPts.length) {
          seg.a = intPts[0];
          continue;
        }
      }

      if (!aok && bok) {
        if (intPts && intPts.length) {
          seg.b = intPts[0];
          continue;
        }
      }

    }

  }

  /**
   * 
   * @param {Segment[]} segs 
   */
  static findEndpoints(segs) {
      
      let endpoints = [];
  
      let i = segs.length;
      while (i--) {
        let seg = segs[i];
        const len = seg.length();
        if (len <= EPSILON) {
          continue;
        }
        let j = segs.length;
        let aIsEndpoint = true;
        let bIsEndpoint = true;
        while (j--) {
          let otherSeg = segs[j];
          if (seg === otherSeg) {
            continue;
          }
          if (GeomUtil.pointsEqual(seg.a, otherSeg.a)) {
            aIsEndpoint = false;
          }
          if (GeomUtil.pointsEqual(seg.a, otherSeg.b)) {
            aIsEndpoint = false;
          }
          if (GeomUtil.pointsEqual(seg.b, otherSeg.a)) {
            bIsEndpoint = false;
          }
          if (GeomUtil.pointsEqual(seg.b, otherSeg.b)) {
            bIsEndpoint = false;
          }
        }
        if (aIsEndpoint) {
          seg.a.data = { offsetX: (seg.a.x - seg.b.x) / len, offsetY: (seg.a.y - seg.b.y) / len };
          endpoints.push(seg.a);
        }
        if (bIsEndpoint) {
          seg.b.data = { offsetX: (seg.b.x - seg.a.x) / len, offsetY: (seg.b.y - seg.a.y) / len };
          endpoints.push(seg.b);
        }
      }
  
      return endpoints;
  
  }

}

module.exports = {
  Point,
  CurvePoint,
  Curve,
  BoundingBox,
  Segment,
  Segments,
  SegmentCollection,
  GeomUtil,
};
