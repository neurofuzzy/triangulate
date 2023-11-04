const { GeomUtil, BoundingBox, SegmentCollection, Segments, Segment, Point, Curve, CurvePoint } = require("./geom");
const Shape = require("./shapes").Shape;

const svgMarkup = `<svg
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:cc="http://creativecommons.org/ns#"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:svg="http://www.w3.org/2000/svg"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
  xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
  style="background-color: {{bgcolor}}"
  width="{{w}}"
  height="{{h}}"
  viewBox="0 0 {{w}} {{h}}"
  version="1.1"
  id="svg30"
  sodipodi:docname="wfcfield-svg51c-inky.svg"
  inkscape:version="1.0.1 (c497b03c, 2020-09-10)">
  <g id="grid_layer" inkscape:label="grid" inkscape:groupmode="layer"><!--grid--></g>
  <g id="skirt_layer" inkscape:label="skirt" inkscape:groupmode="layer"><!--skirt--></g>
  <g id="title_layer" inkscape:label="title" inkscape:groupmode="layer"><!--title--></g>
  <g id="paths_layer" inkscape:label="paths" inkscape:groupmode="layer"><!--paths--></g>
  <g id="groups_layer" inkscape:label="groups" inkscape:groupmode="layer"><!--groups--></g>
  <g id="outline_layer" inkscape:label="outlines" inkscape:groupmode="layer"><!--shapes--></g>
  <g><!--debug--></g>
</svg>
`;

const pathMarkup = `<g><path d="{{path}}" fill="{{fill}}" stroke="{{stroke}}" stroke-width="{{stroke-width}}" /></g>`;
const shapePathMarkup = `<g><path d="{{path}}" {{fill}} stroke="{{stroke}}" stroke-width="{{stroke-width}}" /></g>`;

function lop(n) {
  let val = Math.round(n * 100) / 100;
  if (val % 1 == 0) {
    return val + ".00";
  }
  return `${val}`;
}

class SVG {
  static getDebugGrid(margin) {
    let s = Math.sqrt(SVG.debugGrid);
    let g = SVG.debugGrid;
    let m = margin;
    let m2 = m % s;

    return `
      <defs>
        <pattern id="smallGrid" width="${s}" height="${s}" patternUnits="userSpaceOnUse">
          <path d="M ${g + m2} ${m2} L 0 ${m2} M ${m2} ${g + m2} L ${m2} 0" fill="none" stroke="gray" stroke-width="2" />
        </pattern>
        <pattern id="grid" width="${g}" height="${g}" patternUnits="userSpaceOnUse">
          <rect width="${g}" height="${g}" fill="url(#smallGrid)"/>
          <path d="M ${g + m} ${m} L 0 ${m} M ${m} ${g + m} L ${m} 0" fill="none" stroke="gray" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    `;
  }
  
  /**
   *
   * @param {SegmentCollection[]} shapes
   * @param {BoundingBox} bb
   * @param {number} [margin]
   */
  static shapesToPaths(shapes, bb, margin = 0, lineWidth = 1, offsetX = 0, offsetY = 0, scale = 1) {
    let paths = "";

    shapes.forEach((shape) => {
      
      let segs = shape.toSegments();
      if (!segs.length) return;

      let stroke = SVG.foregroundColor;
      let fill = "none";
      let strokeWidth = `${lineWidth}`;
      let i = 0;
      let lastSegIdx = 0;

      if (shape.data && shape.data.color) {
        stroke = isNaN(shape.data.color) ? shape.data.color : "#" + shape.data.color.toString(16);
        console.log("color assigned", stroke);
      }

      if (shape.data && shape.data.width) {
        strokeWidth = shape.data.width;
      }

      if (shape.data && shape.data.fillColor) {
        shape.isOpen = false;
        fill = stroke = shape.data.fillColor
        strokeWidth = "1";
      } 

      while (lastSegIdx < segs.length) {

        let pathStr = shapePathMarkup.replace("{{fill}}", shape.isOpen ? `fill="none"` : `fill="${fill}"`);
        pathStr = pathStr.replace("{{stroke}}", stroke);
        pathStr = pathStr.replace("{{stroke-width}}", strokeWidth);

        let pointsStr = "";
        let cache = [];

        for (i = lastSegIdx; i < segs.length; i++) {
          let ps = "";
          let command = "M";
          if (i > lastSegIdx && GeomUtil.segmentsConnected(segs[i - 1], segs[i])) {
            command = "L";
          } else {
            ps = ` ${lop((segs[i].a.x - bb.minX) * scale + offsetX + margin)} ${lop((segs[i].a.y - bb.minY) * scale + offsetY + margin)} `;
            cache = [];
            cache.push("L" + ps);
            pointsStr += "M" + ps;
            command = "L";
          }
          if (i > lastSegIdx && command == "M") {
            if (SVG.drawLinesBackAndForth) {
              //cache.pop();
              cache = cache.reverse();
              pointsStr += cache.join("");
            } else {
              pointsStr += "z";
            }
            cache = [];
            //break;
          }
          // console.log(`${command} ${segs[i].b.x} ${segs[i].b.y}`);
          ps = ` ${lop((segs[i].b.x - bb.minX) * scale + offsetX + margin)} ${lop((segs[i].b.y - bb.minY) * scale + offsetY + margin)} `;
          cache.push(command + ps);
          pointsStr += command + ps;
        }

        // flush last cache line
        if (SVG.drawLinesBackAndForth && cache.length > 1) {
          //cache.pop();
          if (!shape.isOpen) {
           // pointsStr +=  `L ${lop((segs[0].b.x - bb.minX) * scale + offsetX + margin)} ${lop((segs[0].b.y - bb.minY) * scale + offsetY + margin)} `;
          }
          cache = cache.reverse();
          pointsStr += cache.join("");
        }

        if (!shape.isOpen && pointsStr.charAt(pointsStr.length - 1) !== "z") {
          pointsStr += "z";
        }
        
        paths += pathStr.replace("{{path}}", pointsStr) + "\n";
        lastSegIdx = i + 1;

      }

    });

    return paths;
  }

  /**
   *
   * @param {SegmentCollection[]} lines
   * @param {BoundingBox} bb
   * @param {number} [margin]
   * @param {number} [lineWidth]
   * @param {number} [offsetX]
   * @param {number} [offsetY]
   * @param {number} [scale]
   * @param {string} [groupColor]
   */
  static linesToPaths(lines, bb, margin, lineWidth = 1, offsetX = 0, offsetY = 0, scale = 1, groupColor = null) {

    let paths = "";
    let segs = lines.reduce((arr, line) => arr.concat(line.toSegments()), []);

    let stroke = groupColor || SVG.foregroundColor;
    let strokeWidth = `${lineWidth}`;

    if (segs.length) {
      if (segs[0].data && segs[0].data.color) {
        stroke = isNaN(segs[0].data.color) ? segs[0].data.color : "#" + segs[0].data.color.toString(16);
        console.log("color assigned", stroke);
      } else if (segs[0].a.data && segs[0].a.data.color) {
        stroke = segs[0].a.data.color;
      }
      if (segs[0].data && segs[0].data.width) {
        strokeWidth = segs[0].data.width;
      } else if (segs[0].a.data && segs[0].a.data.width) {
        strokeWidth = segs[0].a.data.width;
      }
    }

    let pathStr = pathMarkup;
    pathStr = pathStr.replace("{{fill}}", "none");
    pathStr = pathStr.replace("{{stroke}}", stroke);
    pathStr = pathStr.replace("{{stroke-width}}", strokeWidth);

    let pointsStr = "";
    let cache = [];

    if (segs && segs.length) {
      for (let i = 0; i < segs.length; i++) {
        let ps = "";
        if (i == 0 || (!SVG.noPenUp && !GeomUtil.pointsEqual(segs[i - 1].b, segs[i].a, SVG.equalScale))) {
          if (SVG.drawLinesBackAndForth && cache.length) { 
            cache = cache.reverse();
            cache[0] = 'K' + cache[0].substr(1);
            pointsStr += cache.join("");
          }
          ps = `M ${lop((segs[i].a.x - bb.minX) * scale + offsetX + margin)} ${lop((segs[i].a.y - bb.minY) * scale + offsetY + margin)} `;
          cache = [`L ${lop((segs[i].a.x - bb.minX) * scale + offsetX + margin)} ${lop((segs[i].a.y - bb.minY) * scale + offsetY + margin)} `];
          pointsStr += ps;
        }
        ps = `L ${lop((segs[i].b.x - bb.minX) * scale + offsetX + margin)} ${lop((segs[i].b.y - bb.minY) * scale + offsetY + margin)} `;
        cache.push(ps);
        pointsStr += ps;
      }
    }

    // flush last cache line
    if (SVG.drawLinesBackAndForth && cache.length > 1) {
      cache = cache.reverse();
      cache[0] = 'M' + cache[0].substr(1);
      pointsStr += cache.join("");
    }

    paths += pathStr.replace("{{path}}", pointsStr) + "\n";
    return paths;
  }
  
  /**
   *
   * @param {Curve[]} curves
   * @param {BoundingBox} bb
   * @param {number} [margin]
   */
   static curvesToPaths(curves, bb, margin = 0, lineWidth = 1, offsetX = 0, offsetY = 0, scale = 1) {
    let paths = "";

    curves.forEach((curve) => {
      
      let curvePts = curve.toPoints();
      if (!curvePts.length) return;

      let stroke = SVG.foregroundColor;
      let strokeWidth = `${lineWidth}`;
      let i = 0;

      if (curve.data && curve.data.color) {
        stroke = isNaN(curve.data.color) ? curve.data.color : "#" + curve.data.color.toString(16);
      }

      if (curve.data && curve.data.width) {
        strokeWidth = curve.data.width;
      }

      let pathStr = shapePathMarkup.replace("{{fill}}", `fill="none"`);
      pathStr = pathStr.replace("{{stroke}}", stroke);
      pathStr = pathStr.replace("{{stroke-width}}", strokeWidth);

      let pointsStr = "";

      curvePts.forEach((pt, i) => {

        if (i == 0) {

          pointsStr += "M ";
          pointsStr += `${lop((pt.x - bb.minX) * scale + offsetX + margin)} ${lop((pt.y - bb.minY) * scale + offsetY + margin)} `;

        }
        
        pointsStr += "C ";
        pointsStr += `${lop((pt.cx - bb.minX) * scale + offsetX + margin)} ${lop((pt.cy - bb.minY) * scale + offsetY + margin)} `
        pointsStr += `${lop((pt.cx2 - bb.minX) * scale + offsetX + margin)} ${lop((pt.cy2 - bb.minY) * scale + offsetY + margin)} `
        pointsStr += `${lop((pt.x2 - bb.minX) * scale + offsetX + margin)} ${lop((pt.y2 - bb.minY) * scale + offsetY + margin)} `

      });

      paths += pathStr.replace("{{path}}", pointsStr) + "\n";


    });

    return paths;
    
  }

  /**
   *
   * @param {number} margin
   * @param {(SegmentCollection | Curve)[]} mixed
   * @param {boolean} [forceGrouped]
   * @param {boolean} [forceToShapes]
   * @param {string} [groupColor]
   */
  static mixedToSVG(margin, mixed, forceGrouped = false, forceToShapes = false, groupColor = null) {

    margin = margin || 0;
    margin *= 96;

    mixed = mixed.filter(elem => !!elem);
    /** @type {Curve[]} */ // @ts-ignore
    const curves = mixed.filter(elem => elem instanceof Curve);
    /** @type {SegmentCollection[]} */ // @ts-ignore
    const nonCurves = mixed.filter(elem => !(elem instanceof Curve));

    const bb = GeomUtil.boundingBoxesBoundingBox(mixed.map((elem) => elem && elem.getBoundingBox()));

    let offsetX = 0, offsetY = 0, scale = 1;

    if (SVG.documentSize.w > 0 && SVG.documentSize.h > 0) {
      const docBB = new BoundingBox(0, 0, SVG.documentSize.w * 96 - margin * 2, SVG.documentSize.h * 96 - margin * 2);
      const contentAspect = (bb.maxX - bb.minX) / (bb.maxY - bb.minY);
      const docAspect = docBB.maxX / docBB.maxY;
      if (contentAspect > docAspect) {
        scale = docBB.maxX / (bb.maxX - bb.minX);
        offsetY = (docBB.maxY - (bb.maxY - bb.minY) * scale) * 0.5;
      } else {
        scale = docBB.maxY / (bb.maxY - bb.minY);
        offsetX = (docBB.maxX - (bb.maxX - bb.minX) * scale) * 0.5;
      }
    }

    /** @type {SegmentCollection[]} */
    let shapes = [];
    /** @type {SegmentCollection[]} */
    let lineShapes = [];
    /** @type {SegmentCollection[]} */
    let lines = [];
    /** @type {SegmentCollection[]} */
    let lineGroups = [];

    let linePaths = "";
    let groupPaths = "";
    let shapePaths = "";

    for (let n = 0; n < nonCurves.length; n++) {
      let elem = nonCurves[n];
      if (forceToShapes || (elem instanceof Shape && !elem.isOpen) || elem.data.outline) {
        shapes.push(elem);
      } else if (forceGrouped || (elem instanceof SegmentCollection && elem.isGroup)) {
        lineGroups.push(elem);
      } else {
        if (elem.data.discrete) {
          lineShapes.push(elem);
        } else {
          lines.push(elem);
        }
      }
    }

    offsetX += SVG.offsetX * 96;
    offsetY += SVG.offsetY * 96;

    if (lines.length) {
      linePaths += SVG.linesToPaths(lines, bb, margin, SVG.strokeWidth, offsetX, offsetY, scale);
    }
    if (curves.length) {
      linePaths += SVG.curvesToPaths(curves, bb, margin, SVG.strokeWidth, offsetX, offsetY, scale);
    }
    if (lineShapes.length) {
      linePaths += SVG.shapesToPaths(lineShapes, bb, margin, SVG.strokeWidth, offsetX, offsetY, scale);
    }
    shapePaths += SVG.shapesToPaths(shapes, bb, margin, SVG.strokeWidth * 1.5, offsetX, offsetY, scale);

    lineGroups.forEach((lineGroup) => {
      groupPaths += SVG.linesToPaths([lineGroup], bb, margin, 1.5, offsetX, offsetY, scale, groupColor);
    });

    let svgStr = svgMarkup;
    svgStr = svgStr.split("{{bgcolor}}").join(SVG.backgroundColor);

    if (SVG.documentSize.w > 0 && SVG.documentSize.h > 0) {

      let w = SVG.documentSize.w * 96;
      let h = SVG.documentSize.h * 96;

      svgStr = svgStr.split("{{w}}").join(`${w}`);
      svgStr = svgStr.split("{{h}}").join(`${h}`);

    } else {

      svgStr = svgStr.split("{{w}}").join(`${bb.maxX - bb.minX + margin * 2}`);
      svgStr = svgStr.split("{{h}}").join(`${bb.maxY - bb.minY + margin * 2}`);

    }

    let out = svgStr;

    if (SVG.drawSkirt && SVG.documentSize.w > 0 && SVG.documentSize.h > 0) {
      let w = SVG.documentSize.w * 96 - 10;
      let h = SVG.documentSize.h * 96 - 10;
      out = out.split("<!--skirt-->").join(`<path d="M ${w - 80} 8 L ${w - 80} 10 L ${w} 10 L ${w} 90 L ${w + 2} 90"  fill="none" stroke="red" stroke-width="2" />`);
    }

    out = out.split("<!--paths-->").join(linePaths);
    out = out.split("<!--groups-->").join(groupPaths);
    out = out.split("<!--shapes-->").join(shapePaths);

    let debug = "";

    if (SVG.debugMode) {
      mixed.forEach((line) => {
        let pts = line.toPoints();
        pts.forEach((pt) => {
          debug += `<circle cx="${lop(pt.x - bb.minX) * scale + offsetX + margin}" cy="${lop(pt.y - bb.minY) * scale + offsetY + margin}" r="2" fill="#336699" />\n`;
        });
      });
      debug += `<circle cx="${lop(0 - bb.minX) * scale + offsetX + margin}" cy="${lop(0 - bb.minY)* scale + offsetY + margin}" r="4" fill="#cc3300" />\n`;
    }

    if (SVG.debugGrid) {
      out = out.split("<!--grid-->").join(SVG.getDebugGrid(margin));
    }

    return out.split("<!--debug-->").join(debug);
  }
}

// add debug points
SVG.debugMode = false;

// add debug grid
SVG.debugGrid = 0;

// draw each pen-down line group in both directions
SVG.drawLinesBackAndForth = false;
SVG.noPenUp = false;
SVG.equalScale = 1;

SVG.drawSkirt = false;
SVG.title = "";
SVG.titleMargin = 20;
SVG.documentSize = { w: 0, h: 0 };

SVG.backgroundColor = "#ccc";
SVG.foregroundColor = "#000";
SVG.strokeWidth = 1;
SVG.offsetX = 0;
SVG.offsetY = 0;

module.exports = SVG;
