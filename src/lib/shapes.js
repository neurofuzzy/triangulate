// @ts-check

const { Point, Segment, Segments, SegmentCollection, GeomUtil, BoundingBox } = require("./geom");

/** @typedef {import('polygon-clipping').Polygon } Polygon */

class Shape extends SegmentCollection {
  constructor() {
    super();
    this.data = {};
    this.isOpen = false;
    this.isInverted = false;
  }
  open() {
    this.isOpen = true;
    return this;
  }
  invert() {
    this.isInverted = !this.isInverted;
    return this;
  }
  boundingBox() {
    return GeomUtil.pointsBoundingBox(this.toPoints());
  }
  /**
   *
   * @param {boolean} local
   * @returns {Point[]};
   */
  toPoints(local = false) {
    throw "not implemented";
  }
  /**
   * @returns {Polygon}
   */
  toGeomPoints() {
    return [this.toPoints(false).map((pt) => [pt.x, pt.y])];
  }
  /**
   *
   * @param {boolean} local
   * @returns {Segment[]};
   */
  toSegments(local = false) {
    let pts = this.toPoints(local);
    const segs = [];
    let start = 0;
    let len = pts.length;
    let isClockwise = GeomUtil.polygonIsClockwise(pts);
    let doReverse = isClockwise == !this.isInverted;
    if (doReverse) {
      pts = pts.reverse();
    }
    for (let i = start; i < len; i++) {
      let a = pts[i];
      let b = pts[i < pts.length - 1 ? i + 1 : 0];
      if (this.isOpen && i == len - 1) {
        break;
      }
      segs.push(new Segment(a, b, this.data));
    }
    return segs;
  }
  bake() {
    // noOp
  }
  result() {
    return new Segments(this.toSegments());
  }
}

class Circle extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [segs] segments per 360 degrees
   * @param {number} [overdrawSteps] number of steps to overdraw
   */
  constructor(cen, r, segs = 12, overdrawSteps = 0) {
    super();
    this.cen = cen;
    this.r = r;
    this.segs = segs;
    this.overdrawSteps = overdrawSteps;
    this.isOpen = !!this.overdrawSteps;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    for (let i = 0; i < this.segs + this.overdrawSteps; i++) {
      let deg = i * (360 / this.segs);
      let pt = new Point(0, this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg);
      pts.push(pt);
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class Spiral extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [windings] total windings
   * @param {number} [detail] segs multiplier
   * @param {boolean} [removeCenter] reduce close points near center
   * @param {number} distScale
   */
  constructor(cen, r, windings = 6, detail = 1, removeCenter = false, distScale = 1) {
    super();
    this.cen = cen;
    this.r = r;
    this.windings = windings;
    this.segs = 16 * 4 * detail; 
    this.removeCenter = removeCenter;
    this.distScale = distScale;
    this.isOpen = true;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    let sep = this.r / (this.windings);
    for (let j = 0; j < this.windings; j++) {
      for (let i = 0; i <= this.segs; i++) {
        let deg = i * (360 / this.segs);
        let perc = deg / 360;
        let pt = new Point(0, (j * sep + sep * perc) * (this.r - (j * sep + sep * perc) * (1 - this.distScale)) / this.r, this.data);
        GeomUtil.rotatePointDeg(pt, deg);
        if (pts.length === 0 || GeomUtil.distanceBetween(pts[pts.length - 1], pt) > this.r * 0.01) {
          if (!this.removeCenter || j * sep + sep * perc > this.r / this.windings * 0.5) {
            pts.push(pt);
          }
        }
      }
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class MorphSpiral extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [windings] total windings
   * @param {number} [detail] segs multiplier
   */
  constructor(cen, r, windings = 6, detail = 1) {
    super();
    this.cen = cen;
    this.r = r;
    this.windings = windings;
    this.segs = 16 * 4 * detail; 
    this.isOpen = true;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    let sep = this.r / (this.windings);
    let bb = new BoundingBox(0 - this.r, 0 - this.r, this.r, this.r);
    let seg = new Segment(new Point(0, 0), new Point(0, this.r * 2));
    for (let j = 0; j < this.windings; j++) {
      let z = this.segs;
      if (j === this.windings - 1) {
        z *= 0.375;
        z = Math.ceil(z);
      }
      for (let i = 0; i <= z; i++) {
        const deg = i * (360 / this.segs);
        const perc = deg / 360;
        let amt = j / (this.windings - 1) + perc / (this.windings - 1);
        amt *= amt;
        amt *= amt;
        let pt = new Point(0, j * sep + sep * perc, this.data);
        seg.b = new Point(0, this.r * 2);
        GeomUtil.rotatePointDeg(seg.b, deg);
        GeomUtil.cropSegsToBoundingBox([seg], bb);
        let ptB = seg.b;
        GeomUtil.rotatePointDeg(pt, deg);
        pt = GeomUtil.lerpPoints(pt, ptB, amt);
        if (pts.length === 0 || GeomUtil.distanceBetween(pts[pts.length - 1], pt) > this.r * 0.01) {
          pts.push(pt);
        }
      }
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class Winding extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [segs] segments per 360 degrees
   */
  constructor(cen, r, segs = 12, offset = 10) {
    super();
    this.cen = cen;
    this.r = r;
    this.segs = segs;
    this.offset = offset;
    this.isOpen = true;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    let cr = this.r;
    let offset = this.offset;
    let winds = Math.round(this.r / offset);
    for (let j = 0; j < winds; j++) {
      if (offset <= 0) {
        break;
      }
      for (let i = 0; i <= this.segs; i++) {
        if (i == 0) {
          continue;
        }
        let deg = i * (360 / this.segs);
        let pt = new Point(0, cr, this.data);
        GeomUtil.rotatePointDeg(pt, deg);
        if (i === this.segs) {
          let prevPt = pts[pts.length - 1];
          let delta = GeomUtil.distanceBetween(prevPt, pt);
          let newPt = GeomUtil.lerpPoints(pt, prevPt, offset / delta);
          pt = newPt;
        }
        if (j == 0 && i == 2) {
          let prevPt = pts[pts.length - 1];
          let delta = GeomUtil.distanceBetween(prevPt, pt);
          if (offset >= delta) {
            continue;
          }
          if (GeomUtil.distanceBetween(pt, this.cen) < offset * 0.75) {
            continue;
          }
          let newPt = GeomUtil.lerpPoints(prevPt, pt, offset / delta);
          prevPt.x = newPt.x;
          prevPt.y = newPt.y;
        } 
        pts.push(pt);
      }
      cr -= offset;
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class DoubleWinding extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [steps] segments per 360 degrees
   * @param {number} divisionDistance
   * @param {boolean} mergeFinal
   */
  constructor(cen, r, steps = 12, divisionDistance = 0, mergeFinal = false) {
    super();
    this.cen = cen;
    this.r = r;
    this.steps = steps;
    this.divisionDistance = divisionDistance;
    this.mergeFinal = mergeFinal;
    this.isOpen = true;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {

    let r = this.r;
    let steps = this.steps;
    let mergeFinal = this.mergeFinal;
  
    let split = function (ptA, ptB, stepNum = 0) {

      let offset = stepNum === 0 ? 0 : (r / steps);

      let len = r * 2 - offset * stepNum * 2 + offset;
      let ang = GeomUtil.angleBetween(ptA, ptB);

      if (stepNum == 0) {
        len -= (r / steps);
      }

      let pt0 = ptA;
      let pt1 = Point.clone(ptA);
      let pt2 = GeomUtil.averagePoints(ptA, ptB);
      let pt3 = GeomUtil.averagePoints(ptA, ptB);
      let pt4 = Point.clone(ptB);
      let pt5 = ptB;
      
      let offsetPtA = new Point(0, len * 0.5 - offset);
      let offsetPtB = new Point(0, 0 - len * 0.5 + offset);
      GeomUtil.rotatePoint(offsetPtA, 0 - ang);
      GeomUtil.rotatePoint(offsetPtB, 0 - ang);

      GeomUtil.addToPoint(pt0, offsetPtA);
      GeomUtil.addToPoint(pt1, offsetPtA);
      GeomUtil.addToPoint(pt2, offsetPtA);
      GeomUtil.addToPoint(pt3, offsetPtB);
      GeomUtil.addToPoint(pt4, offsetPtB);
      GeomUtil.addToPoint(pt5, offsetPtB);


      if (stepNum === 0) {
        let offsetPtA = new Point(0, (r / steps) * 1.5);
        let offsetPtB = new Point(0, 0 - (r / steps) * 1.5);
        GeomUtil.rotatePoint(offsetPtA, ang + Math.PI * 0.5);
        GeomUtil.rotatePoint(offsetPtB, ang + Math.PI * 0.5);
        GeomUtil.addToPoint(pt0, offsetPtA);
        GeomUtil.addToPoint(pt1, offsetPtA);
        GeomUtil.addToPoint(pt4, offsetPtB);
        GeomUtil.addToPoint(pt5, offsetPtB);
      }

      stepNum++;

      let nextWindPts = [pt2, pt3];

      if (stepNum < steps) {
        nextWindPts = split(pt2, pt3, stepNum);
      } else if (mergeFinal) {
        let avPt = GeomUtil.averagePoints(pt2, pt3);
        nextWindPts = [avPt];
      }

      return [pt0, pt1, ...nextWindPts, pt4, pt5];

    }

    let pts = split(new Point(0 - this.r, 0), new Point(this.r, 0));

    if (this.divisionDistance > 0) {

      let pts2 = [];

      pts.forEach((pt, idx) => {
        if (idx == 0) {
          pts2.push(pt);
        } else {
          pts2.push(...GeomUtil.subdivideByDistance(pts[idx - 1], pt, this.divisionDistance));
        }
      });

      pts = pts2;

    }

    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class SquareWave extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} w width
   * @param {number} h height
   * @param {number} [steps] segments per 360 degrees
   */
  constructor(cen, w, h, steps = 12) {
    super();
    this.cen = cen;
    this.w = w;
    this.h = h;
    this.steps = steps;
    this.isOpen = true;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {

    let w = this.w;
    let h = this.h;
    let pts = [];
    let steps = this.steps;

    if (steps > 0) {

      let delta = h / steps;
      
      pts.push(new Point(0 - w * 0.5, 0 - h * 0.5));
      
      for (let i = 0; i < steps; i++) {

        const ptA = new Point(0 - w * 0.5, 0 - h * 0.5 + delta * i,  { step: i });
        const ptB = new Point(0, 0 - h * 0.5 + delta * i, { step: i });
        const ptC = new Point(w * 0.5, 0 - h * 0.5 + delta * i, { step: i });
        let stepPts = [ptA, ptB, ptC];

        if (i % 2 !== 0) {
          stepPts.reverse();
        }

        pts.push(...stepPts);
        
      }

      pts.push(new Point(0 - w * 0.5, h * 0.5));


    } else {

      pts.push(new Point(0 - w * 0.5, 0 - h * 0.5));
      pts.push(new Point(0 - w * 0.5, h * 0.5));

    }

    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    
    return pts;

  }

}

class LineHatch extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [steps] segments per 360 degrees
   * @param {number} divisionDistance
   * @param {boolean} connected
   * @param {boolean} dashed
   */
  constructor(cen, r, steps = 12, divisionDistance = 0, connected = false, dashed = false) {
    super();
    this.cen = cen;
    this.r = r;
    this.steps = steps;
    this.divisionDistance = divisionDistance;
    this.connected = connected;
    this.dashed = dashed;
    if (dashed) {
      this.divisionDistance = Math.min(this.divisionDistance, this.r / this.steps);
    }
    this.isOpen = true;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {

    let r = this.r;
    let steps = this.steps;
    let delta = r * 2 / steps;
    let pts = [];

    for (let i = 0; i < steps; i++) {

      const ptA = new Point(0 - this.r, 0 - this.r + delta * i,  { step: i });
      const ptB = new Point(this.r, 0 - this.r + delta * i, { step: i });
      let stepPts = [ptA, ptB];

      if (this.divisionDistance > 0) {
        stepPts = GeomUtil.subdivideByDistance(ptA, ptB, this.divisionDistance);
      }

      if (i % 2 !== 0) {
      } else {
        stepPts.reverse();
      }

      pts.push(...stepPts);

    }

    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    
    return pts;

  }

  toSegments(local = false, munge = false) {

    if (this.connected) {
      return super.toSegments(local);
    }

    let segs = super.toSegments(local).filter(seg => seg.a.data.step === seg.b.data.step);
    segs = segs.map(seg => Segment.clone(seg));

    if (!this.dashed) {
      return segs;
    }

    let segsPerStep = segs.filter(seg => seg.a.data.step === 0).length;

    let out = [];
    let step = 0;

    for (let j = 0; j < segs.length; j += segsPerStep) {

      let stepSegs = segs.slice(j, j + segsPerStep);

      stepSegs.forEach((seg, idx) => {
        if ((step + idx + segsPerStep % 2) % 2 === 0) {
          out.push(seg);
        }
      })
      
      step++;
    }



    return out;

  }

}

class RoundShape extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} [segs] segments per 360 degrees
   * @param {number} variance amount of wobble
   */
  constructor(cen, r, segs = 12, variance = 0.08) {
    super();
    this.cen = cen;
    this.r = r;
    this.segs = segs;
    this.variance = variance;
    this.isOpen = false;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    for (let i = 0; i < this.segs; i++) {
      let deg = i * (360 / this.segs);
      let pt = new Point(0, this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg);
      pt.x *= 1 + Math.sin((pt.y + 10000) / this.r * 1.2) * this.variance;
      pt.y *= 1 + Math.cos((pt.x + 10000) / this.r * 1.35) * this.variance;
      pts.push(pt);
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class Capsule extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} len length of shaft
   * @param {number} [segs] segments per 360 degrees
   */
  constructor(cen, r, len, segs = 12) {
    super();
    this.cen = cen;
    this.r = r;
    this.len = len;
    this.segs = segs;
    this.isOpen = false;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    for (let i = 0; i < this.segs; i++) {
      let deg = i * (360 / this.segs);
      let degB = (i + 1) * (360 / this.segs);
      let pt = new Point(0, this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg);
      pts.push(pt);
      if (deg <= 180) {
        pt.x += this.len * 0.5;
      } else {
        pt.x -= this.len * 0.5;
      }
      if (deg === 0) {
        let ptB = Point.clone(pt);
        ptB.x -= this.len;
        pts.unshift(ptB);
      }
      if (deg === 180) {
        let ptB = Point.clone(pt);
        ptB.x -= this.len;
        pts.push(ptB);
      } else if (deg < 180 && degB > 180) {
        let ptA = new Point(0, this.r, this.data);
        GeomUtil.rotatePointDeg(ptA, 180);
        pts.push(ptA);
        ptA.x += this.len * 0.5;
        let ptB = Point.clone(ptA);
        ptB.x -= this.len;
        pts.push(ptB);
      } 
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}


class ArcCapsule extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} len length of capsule
   * @param {number} ang angle of arc
   * @param {number} [segs] segments per 360 degrees
   */
  constructor(cen, r, len, ang, segs = 12) {
    super();
    this.cen = cen;
    this.r = r;
    this.len = len;
    this.ang = ang || 0.01;
    this.segs = segs;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let ptsRt = [];
    let ptsLt = [];

    let angStep = Math.abs(this.ang) / this.segs;

    let arcRadius = this.len / Math.tan(Math.abs(this.ang) * Math.PI / 180);

    for (let deg = 0; deg <= Math.abs(this.ang); deg += angStep) {
      let pt = new Point(0, arcRadius + this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg + 90);
      pt.x -= arcRadius;
      ptsRt.push(pt);
    }

    ptsRt = ptsRt.reverse();

    for (let deg = 0; deg <= Math.abs(this.ang); deg += angStep) {
      let pt = new Point(0, arcRadius - this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg + 90);
      pt.x -= arcRadius;
      ptsLt.push(pt);
    }

    let startCap = new Arc(new Point(0, 0), this.r, -90, 90, this.segs * 4);
    startCap.isOpen = true;
    ptsRt.push(...startCap.toPoints().reverse());

    let pt = new Point(0, arcRadius, this.data);
    GeomUtil.rotatePointDeg(pt, Math.abs(this.ang) + 90);
    pt.x -= arcRadius;
    let endCap = new Arc(pt, this.r, 90, 270, this.segs * 4);
    endCap.isOpen = true;
    endCap.rotation = Math.abs(this.ang);

    ptsLt.push(...endCap.toPoints().reverse());

    let pts = ptsRt.concat(ptsLt);

    if (this.ang < 0) {
      pts.forEach(pt => {
        pt.x = 0 - pt.x;
      });
      pts = pts.reverse();
    }

    GeomUtil.rotatePointsDeg(-90, ...pts);

    if (!local) {
      this._makeAbsolute(pts);
    }

    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });

    return pts;
  }
}

class Hexagon extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   */
  constructor(cen, r) {
    super();
    this.cen = cen;
    this.r = r;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    for (let i = 0; i < 6; i++) {
      let deg = i * 60;
      let pt = new Point(0, this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg + 30);
      pts.push(pt);
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class Arc extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} r radius
   * @param {number} fromAng start angle
   * @param {number} toAng start angle
   * @param {number} [segs] segments per 360 degrees
   */
  constructor(cen, r, fromAng, toAng, segs = 12) {
    super();
    this.cen = cen;
    this.r = r;
    this.fromAng = fromAng;
    this.toAng = toAng;
    while (this.toAng < this.fromAng) {
      this.toAng += 360;
    }
    this.segs = segs;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];

    if (!this.isOpen) {
      pts.push(new Point(0, 0, this.data));
    }

    let angStep = 360 / this.segs;
    let angStart = Math.ceil(this.fromAng / angStep) * angStep;
    let angEnd = Math.floor(this.toAng / angStep) * angStep;

    let pt = new Point(0, this.r, this.data);
    GeomUtil.rotatePointDeg(pt, this.fromAng);
    pts.push(pt);

    for (let deg = angStart; deg <= angEnd; deg += angStep) {
      let pt = new Point(0, this.r, this.data);
      GeomUtil.rotatePointDeg(pt, deg);
      pts.push(pt);
    }

    pt = new Point(0, this.r, this.data);
    GeomUtil.rotatePointDeg(pt, this.toAng);
    pts.push(pt);

    if (!local) {
      this._makeAbsolute(pts);
    }

    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });

    return pts;
  }
}

class Rectangle extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} w width
   * @param {number} h height
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(cen, w, h, divisionDistance = 0) {
    super();
    this.cen = cen;
    this.w = w;
    this.h = h;
    this.divisionDistance = divisionDistance;
  }

  boundingBox(roundValues) {
    const bb = new BoundingBox(this.cen.x - this.w * 0.5, this.cen.y - this.h * 0.5, this.cen.x + this.w * 0.5, this.cen.y + this.h * 0.5);
    if (roundValues) {
      bb.minX = Math.round(bb.minX);
      bb.maxX = Math.round(bb.maxX);
      bb.minY = Math.round(bb.minY);
      bb.maxY = Math.round(bb.maxY);
    }
    return bb;
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let corners = [
      new Point(0 - this.w * 0.5, 0 - this.h * 0.5, this.data),
      new Point(0 - this.w * 0.5, 0 + this.h * 0.5, this.data),
      new Point(0 + this.w * 0.5, 0 + this.h * 0.5, this.data),
      new Point(0 + this.w * 0.5, 0 - this.h * 0.5, this.data),
    ];
    let pts;

    if (this.divisionDistance == 0) {
      pts = corners;
    } else {
      pts = []
        .concat(GeomUtil.subdivideByDistance(corners[0], corners[1], this.divisionDistance))
        .concat(GeomUtil.subdivideByDistance(corners[1], corners[2], this.divisionDistance))
        .concat(GeomUtil.subdivideByDistance(corners[2], corners[3], this.divisionDistance))
        .concat(GeomUtil.subdivideByDistance(corners[3], corners[0], this.divisionDistance));
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class Square extends Rectangle {
  /**
   *
   * @param {Point} cen center
   * @param {number} size side length
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(cen, size, divisionDistance = 0) {
    super(cen, size, size, divisionDistance);
  }
}


class Tape extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} w width
   * @param {number} h height
   * @param {number} [zigzags]
   */
  constructor(cen, w, h, zigzags = 3) {
    super();
    this.cen = cen;
    this.w = w;
    this.h = h;
    this.zigzags = zigzags;
  }

  boundingBox(roundValues) {
    const bb = new BoundingBox(this.cen.x - this.w * 0.5, this.cen.y - this.h * 0.5, this.cen.x + this.w * 0.5, this.cen.y + this.h * 0.5);
    if (roundValues) {
      bb.minX = Math.round(bb.minX);
      bb.maxX = Math.round(bb.maxX);
      bb.minY = Math.round(bb.minY);
      bb.maxY = Math.round(bb.maxY);
    }
    return bb;
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [
      new Point(0 - this.w * 0.5, 0 - this.h * 0.5, this.data),
      new Point(0 - this.w * 0.5, 0 + this.h * 0.5, this.data),
    ];

    let delta = this.w / (this.zigzags * 2);

    for(let i = 0; i < this.zigzags; i++) {

      pts.push(
        new Point(0 - this.w * 0.5 + delta * (i * 2) + delta, 0 + this.h * 0.5 - delta, this.data)
      );

      if (i < this.zigzags - 1) {
        pts.push(
          new Point(0 - this.w * 0.5 + delta * ((i + 1) * 2), 0 + this.h * 0.5, this.data)
        );
      }

    }

    pts = pts.concat([
      new Point(0 + this.w * 0.5, 0 + this.h * 0.5, this.data),
      new Point(0 + this.w * 0.5, 0 - this.h * 0.5, this.data),
    ]);

    for(let i = 0; i < this.zigzags; i++) {

      pts.push(
        new Point(this.w * 0.5 - delta * (i * 2) - delta, 0 - this.h * 0.5 + delta, this.data)
      );

      if (i < this.zigzags - 1) {
        pts.push(
          new Point(this.w * 0.5 - delta * ((i + 1) * 2), 0 - this.h * 0.5, this.data)
        );
      }

    }


    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}


class RoundedRect extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} w width
   * @param {number} h height
   * @param {number} r corner radius
   * @param {number} [segsR] corner arc segments per 360 degrees
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(cen, w, h, r, segsR = 12, divisionDistance = 0) {
    super();
    this.cen = cen;
    this.w = w;
    this.h = h;
    this.r = r;
    this.segsR = segsR;
    this.divisionDistance = divisionDistance;
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    let arcs = [
      new Arc(new Point(0 - this.w * 0.5 + this.r, 0 - this.h * 0.5 + this.r, this.data), this.r, 180, 270, this.segsR).open(),
      new Arc(new Point(0 - this.w * 0.5 + this.r, 0 + this.h * 0.5 - this.r, this.data), this.r, 270, 360, this.segsR).open(),
      new Arc(new Point(0 + this.w * 0.5 - this.r, 0 + this.h * 0.5 - this.r, this.data), this.r, 0, 90, this.segsR).open(),
      new Arc(new Point(0 + this.w * 0.5 - this.r, 0 - this.h * 0.5 + this.r, this.data), this.r, 90, 180, this.segsR).open(),
    ];
    arcs.forEach((arc, idx) => {
      pts = pts.concat(arc.toPoints());
      if (this.divisionDistance > 0) {
        let ptA = pts[pts.length - 1];
        let ptB = arcs[(idx + 1) % arcs.length].toPoints()[0];
        pts = pts.concat(GeomUtil.subdivideByDistance(ptA, ptB, this.divisionDistance));
      }
    });
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}

class CornerRect extends Shape {
  /**
   *
   * @param {number} x
   * @param {number} y
   * @param {number} w width
   * @param {number} h height
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(x, y, w, h, divisionDistance = 0) {
    super();
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.divisionDistance = divisionDistance;
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let corners = [
      new Point(this.x, this.y, this.data),
      new Point(this.x, this.y + this.h, this.data),
      new Point(this.x + this.w, this.y + this.h, this.data),
      new Point(this.x + this.w, this.y, this.data),
    ];
    let pts = []
      .concat(GeomUtil.subdivideByDistance(corners[0], corners[1], this.divisionDistance))
      .concat(GeomUtil.subdivideByDistance(corners[1], corners[2], this.divisionDistance))
      .concat(GeomUtil.subdivideByDistance(corners[2], corners[3], this.divisionDistance))
      .concat(GeomUtil.subdivideByDistance(corners[3], corners[0], this.divisionDistance));
    if (!local) {
      this._makeAbsolute(pts);
    }
    return pts;
  }
}


class BranchRect extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} w width
   * @param {number} h height
   * @param {number} taper
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(cen, w, h, taper = 0, divisionDistance = 0) {
    super();
    this.cen = cen;
    this.w = w;
    this.h = h;
    this.taper = taper;
    this.divisionDistance = divisionDistance;
  }

  endPoint() {
    let pt = new Point(0, this.h, this.data);
    GeomUtil.rotatePointDeg(pt, this.rotation);
    pt.x += this.cen.x;
    pt.y += this.cen.y;
    return pt;
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let corners = [
      new Point(0 - this.w * 0.5, 0, this.data),
      new Point(0 - this.w * 0.5 + this.taper, 0 + this.h, this.data),
      new Point(0 + this.w * 0.5 - this.taper, 0 + this.h, this.data),
      new Point(0 + this.w * 0.5, 0, this.data),
    ];
    let pts;

    if (this.divisionDistance == 0) {
      pts = corners;
    } else {
      pts = []
        .concat(GeomUtil.subdivideByDistance(corners[0], corners[1], this.divisionDistance))
        .concat(GeomUtil.subdivideByDistance(corners[1], corners[2], this.divisionDistance))
        .concat(GeomUtil.subdivideByDistance(corners[2], corners[3], this.divisionDistance))
        .concat(GeomUtil.subdivideByDistance(corners[3], corners[0], this.divisionDistance));
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    return pts;
  }
}


class Star extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} innerRadius inner radius
   * @param {number} outerRadius outer radius
   * @param {number} [segs] points per 360 degrees
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(cen, innerRadius, outerRadius, segs = 5, divisionDistance = 0) {
    super();
    this.cen = cen;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.segs = segs;
    this.divisionDistance = divisionDistance;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = [];
    let pointDivs = this.segs;
    for (let i = 0; i <= pointDivs; i++) {
      let degA = i * (360 / pointDivs);
      let degB = i * (360 / pointDivs) + 0.5 * (360 / pointDivs);
      let ptA = new Point(0, this.innerRadius, this.data);
      let ptB = new Point(0, this.outerRadius, this.data);
      GeomUtil.rotatePointDeg(ptA, degA);
      GeomUtil.rotatePointDeg(ptB, degB);
      pts.push(ptA);
      if (i != pointDivs) {
        pts.push(ptB);
      }
    }
    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    if (this.divisionDistance == 0) {
      return pts;
    } else {
      let dpts = [];
      pts.forEach((ptA, idx) => {
        let ptB = pts[(idx + 1) % pts.length];
        dpts = dpts.concat(GeomUtil.subdivideByDistance(ptA, ptB, this.divisionDistance));
      });
      return dpts;
    }
  }
}

class PolygonShape extends Shape {
  /**
   *
   * @param {Point[]} points
   * @param {number} [divisionDistance] distance between subdivisions, 0 for no subdivisions
   */
  constructor(points, divisionDistance = 0) {
    super();
    this.points = points;
    this.divisionDistance = divisionDistance;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    let pts = this.points ? this.points.concat() : [];
    if (!local) {
      this._makeAbsolute(pts);
    }
    if (this.divisionDistance == 0) {
      return pts;
    } else {
      let dpts = [];
      this.points.forEach((ptA, idx) => {
        let ptB = this.points[(idx + 1) % pts.length];
        dpts = dpts.concat(GeomUtil.subdivideByDistance(ptA, ptB, this.divisionDistance));
      });
      return dpts;
    }
  }
  /**
   * @param {boolean} local
   * @returns {Segment[]}
   */
  toSegments(local = false) {
    let pts = this.toPoints(local);
    let segs = [];
    for (let i = 0; i < pts.length; i++) {
      let a = pts[i];
      let b = pts[i < pts.length - 1 ? i + 1 : 0];
      if (this.isOpen && i == pts.length - 1) {
        continue;
      }
      segs.push(new Segment(a, b, Object.assign({}, this.data)));
    }
    return segs;
  }
  optimize() {
    if (!this.points || this.points.length < 2) {
      return;
    }
    if (this.isOpen) {
      if (GeomUtil.pointsEqual(this.points[0], this.points[this.points.length - 1])) {
        this.isOpen = false;
        this.points.pop();
      }
    }
    if (this.isOpen) {
      return;
    }
    let lastAngle = NaN;
    let maxAngle = 0;
    let maxAngleIdx = 0;
    let i = this.points.length - 1;
    while (i--) {
      let ang = GeomUtil.angleBetween(this.points[i], this.points[i + 1]);
      if (!isNaN(lastAngle)) {
        if (maxAngle <= Math.abs(lastAngle - ang)) {
          maxAngle = Math.abs(lastAngle - ang);
          maxAngleIdx = i;
        }
      }
      lastAngle = ang;
    }
    if (maxAngleIdx > 0) {
      while (maxAngleIdx) {
        this.points.unshift(this.points.pop());
        maxAngleIdx--;
      }
    }
    lastAngle = NaN;
    i = this.points.length - 1;
    while (i--) {
      let ang = GeomUtil.angleBetween(this.points[i], this.points[i + 1]);
      if (!isNaN(lastAngle)) {
        if (Math.abs(lastAngle - ang) < 0.0001) {
          this.points.splice(i + 1, 1);
        }
      }
      lastAngle = ang;
    }
  }
  /**
   *
   * @param {number[][]} geomPts
   */
  static fromGeomPoints(geomPts) {
    const pts = geomPts.map((gpt) => {
      return new Point(gpt[0], gpt[1]);
    });
    return new PolygonShape(pts);
  }
  /**
   *
   * @param {Point[]} pts
   */
  static fromPoints(pts) {
    return new PolygonShape(pts);
  }
}

class ParametricShape extends Shape {
  /**
   *
   * @param {(perc) => Point} pointsFunction function that takes a value between 0 and 1 and returns a {Point}
   * @param {number} segs number of segments to divide between 0 and 1
   */
  constructor(pointsFunction, segs = 12) {
    super();
    this.pointsFunction = pointsFunction;
    this.segs = segs;
  }
  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {
    const pts = [];
    const step = 1 / this.segs;
    let i = 0;
    while (i <= 1) {
      const pt = this.pointsFunction(i);
      if (pt) pts.push(pt);
      i += step;
    }
    return pts;
  }
}

class Paperclip extends Shape {
  /**
   *
   * @param {Point} cen center
   * @param {number} w
   * @param {number} h
   * @param {number} [steps] segments per 360 degrees
   * @param {boolean} enclose
   */
  constructor(cen, w, h, steps = 12, enclose = false) {
    super();
    this.cen = cen;
    this.w = w;
    this.h = h;
    this.steps = steps;
    this.enclose = enclose;
    this.isOpen = true;
  }

  /**
   * @param {boolean} local
   * @returns {Point[]}
   */
  toPoints(local = false) {

    let r = Math.min(this.w, this.h) * 0.5;
    let len = Math.abs(this.w - this.h) * 0.5;
    let steps = this.steps;
    let stepSize = r * 2 / steps;
    let currentRadius = 0;
    let pts = [];

    const ptA = new Point(0 - len, 0)
    const ptB = new Point(len, 0);
    const cen = new Point(0, 0);
    pts.push(new Point(ptA.x, ptA.y + currentRadius));

    for (let j = 0; j < steps; j++) {

      currentRadius += stepSize * 0.5;
      cen.x = ptB.x;
      cen.y += stepSize * 0.5;

      for (let i = -90; i < 90; i += 2) {
        let pt = new Point(cen.x + Math.cos(i * Math.PI / 180) * currentRadius, cen.y + Math.sin(i * Math.PI / 180) * currentRadius);
        pts.push(pt);
      }

      currentRadius += stepSize * 0.5;
      cen.x = ptA.x;
      cen.y -= stepSize * 0.5;

      for (let i = 90; i < 270; i += 2) {
        let pt = new Point(cen.x + Math.cos(i * Math.PI / 180) * currentRadius, cen.y + Math.sin(i * Math.PI / 180) * currentRadius);
        pts.push(pt);
      }

    }

    if (this.enclose) {

      cen.x = ptB.x;

      for (let i = -90; i < 90; i += 2) {
        let pt = new Point(cen.x + Math.cos(i * Math.PI / 180) * currentRadius, cen.y + Math.sin(i * Math.PI / 180) * currentRadius);
        pts.push(pt);
      }

    } else {

      pts.push(new Point(ptB.x, ptA.y - currentRadius));

    }

    if (this.w < this.h) {
      pts.forEach(pt => {
        let tmp = pt.x;
        pt.x = pt.y;
        pt.y = tmp;
      });
    }

    if (!local) {
      this._makeAbsolute(pts);
    }
    pts.forEach((pt) => {
      pt.x += this.cen.x;
      pt.y += this.cen.y;
    });
    
    return pts;

  }

}

module.exports = {
  Point,
  Segment,
  Shape,
  Circle,
  Capsule,
  ArcCapsule,
  Hexagon,
  Star,
  Arc,
  Rectangle,
  Square,
  RoundedRect,
  CornerRect,
  BranchRect,
  PolygonShape,
  ParametricShape,
  RoundShape,
  Tape,
  Spiral,
  MorphSpiral,
  Winding,
  DoubleWinding,
  LineHatch,
  Paperclip,
  SquareWave,
};
