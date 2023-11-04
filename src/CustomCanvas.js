// CustomCanvas
import React, { Component } from 'react';
import ColorUtils from './ColorUtils';
import PolyProcess from './lib/polyprocess.class';
import * as SVG from './lib/svg';
import { Point } from './lib/geom';
import { PolygonShape } from './lib/shapes';

class CustomCanvas extends Component {
    // Draw polygons on update
    updateCanvas() {
        // Reset color utils
        this.colorUtils = ColorUtils()
            .height(this.props.colorSettings.height)
            .width(this.props.colorSettings.width)
            .fillColor(this.props.colorSettings.fillColor)
            .threshold(this.props.colorSettings.threshold)
            .blackWhite(this.props.colorSettings.blackWhite)
            .invert(this.props.colorSettings.invert);

        if (this.props.srcCanvas === null) return;
        this.colorUtils.setSrcCanvas(this.props.srcCanvas);

        let ctx = this.refs.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.props.width, this.props.height);
        ctx.fillStyle = this.props.colorSettings.backgroundColor;
        ctx.fillRect(0, 0, this.props.width, this.props.height)

        // draw polygons
        if (this.props.shape !== "circles") {
            this.drawPolygons(ctx);
            this.drawLines(ctx);
        } else {
            this.drawCircles(ctx);
        }

        // Blend image
        this.blendOriginalImage(ctx);

        // Do whatever `props` says should happen on update
        this.props.onUpdate();
    }
    drawPolygons(ctx) {
        const polys = [];
        for (var i = 0, n = this.props.polygons.length; i < n; ++i) {
            this.drawCell(this.props.polygons[i], ctx);
            var color = this.colorUtils.getColor(this.props.polygons[i]);
            if (color.indexOf("rgba") === 0 && parseInt(color.split("(")[1].split(",")[0]) < 210) {
                const polyPoints = [];
                for (var j = 0, m = this.props.polygons[i].length; j < m; ++j) {
                    polyPoints.push(new Point(this.props.polygons[i][j][0], this.props.polygons[i][j][1]));
                }
                polys.push(new PolygonShape(polyPoints));
            }
        }
        window.polygons = JSON.stringify(polys);
        window.svg = SVG.mixedToSVG(0, polys);
    }
    drawLines(ctx) {
        const processor = new PolyProcess(this.props.polygons);
        const paths = processor.findPaths(this.props.angleThreshold, this.props.lengthThreshold, this.props.pathLengthMinThreshold, this.props.pathLengthMaxThreshold, this.props.swirl, this.props.keepVertical, this.props.keepHorizontal);
        for (var i = 0, n = paths.length; i < n; ++i) {
            this.drawPath(paths[i], ctx);
        }
    }
    // Issue: this.props.polygons doesn't currently have the radius....
    drawCircles(ctx) {
        if (this.props.polygons === null) return;

        let model = [];
        for (var i = 0, n = this.props.polygons.length; i < n; ++i) {
            var c = this.props.polygons[i];
            var color = this.colorUtils.getDotColor(c, c.radius);
            console.log(color);
            if (color.indexOf("rgba") === 0 && parseInt(color.split("(")[1].split(",")[0]) < 50) {
                model.push(c);
            } else if (color === "black") {
                model.push(c);
            }
        }
        window.circles = JSON.stringify(model.map(c => { return { x: c[0], y: c[1], r: c.radius } }));

        for (var i = 0, n = this.props.polygons.length; i < n; ++i) {
            this.drawDot(this.props.polygons[i], this.props.polygons[i].radius, ctx);
        }
    }
    // Function to draw a cell
    drawDot(site, radius, con) {
        var color = this.colorUtils.getDotColor(site, radius);

        con.beginPath();
        con.arc(site[0], site[1], radius, 0, 2 * Math.PI);
        con.closePath();
        con.fillStyle = color;
        con.strokeStyle = color;
        con.lineWidth = 1;
        if (!this.props.fill) con.stroke()
        if (this.props.fill) con.fill();

    }
    blendOriginalImage(context) {
        if (this.props.numBlend === 0 || this.props.srcCanvas === null)
            return;
        let imageData = context.getImageData(0, 0, this.props.width, this.props.height);
        for (let i = 0; i < imageData.data.length; i += 1) {
            imageData.data[i] = ((100 - this.props.numBlend) * imageData.data[i] + this.props.numBlend * this.colorUtils.imageBuffer8[i]) / 100;
        }
        context.putImageData(imageData, 0, 0);
    }

    componentDidMount() {
        this.updateCanvas();
    }

    componentDidUpdate() {
        this.updateCanvas();
    }
    // Function to draw cell
    drawCell(cell, con) {
        if (!cell || !con)
            return false;

        // Draw path
        con.beginPath();
        con.moveTo(cell[0][0], cell[0][1]);
        for (var j = 1, m = cell.length; j < m; ++j) {
            con.lineTo(cell[j][0], cell[j][1]);
        }

        // Fill path var color = getColor(cell);
        var color = this.colorUtils.getColor(cell);
        con.strokeStyle = this.props.showLines === true ? 'white' : color;
        con.fillStyle = color;
        con.lineWidth = 0;
        if (this.props.fill) con.fill();
        if (con.fillStyle !== '#ffffff') {
            con.stroke();
        }
        con.closePath();

        return true;
    }
    // Function to draw path
    drawPath(path, con) {
        if (!path || !con)
            return false;

        // Draw path
        con.beginPath();
        con.moveTo(path[0].x, path[0].y);
        for (var j = 1, m = path.length; j < m; ++j) {
            con.lineTo(path[j].x, path[j].y);
        }

        // Fill path var color = getColor(cell);
        var color = this.colorUtils.getColor(path);
        con.strokeStyle = "cyan";
        con.fillStyle = color;
        con.lineWidth = 0;
        con.stroke();
        //con.closePath();

        return true;
    }
    render() {
        return (
            <canvas id={ this.props.canvasId } ref="canvas" width={ this.props.width } height={ this.props.height } />
            );
    }
}

export default CustomCanvas;