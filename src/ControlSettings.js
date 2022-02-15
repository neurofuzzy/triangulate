/* Control Settings

Set `id` as **state** object to manipulate */
const ControlSettings = [{
    id: 'image-header',
    type: 'header',
    label: "Image Options"
}, {
    id: 'shape',
    type: 'select',
    label: "Shape",
    options: [{
        id: "circles",
        label: "Circles"
    }, {
        id: "rectangles",
        label: "Rectangles"
    }, {
        id: "triangles",
        label: "Triangles"
    }, {
        id: "polygons",
        label: "Polygons"
    }]
}, {
    id: 'numPoints',
    type: 'slider',
    getLabel: (num) => "# of Points: " + num,
    min: 100,
    max: 5000,
    step: 100
},
{
    id: 'fitToScreen',
    label: "Fit image To screen",
    type: 'checkbox'
}, {
    id: 'blend',
    type: 'slider',
    getLabel: (num) => "Blend Original Image: " + num + "%",
    min: 0,
    max: 100,
    step: 1
}, {
    id: 'color-header',
    type: 'header',
    label: "Color Options"
}, {
    id: 'fill',
    label: "Fill with Color",
    type: 'checkbox'
}, {
    id: 'swirl',
    label: "Make Swirly Paths",
    type: 'checkbox',
    group: 'paths'
}, {
    id: 'keepVertical',
    label: "Make Vertical Paths",
    type: 'checkbox',
    group: 'paths'
}, {
    id: 'keepHorizontal',
    label: "Make Horizontal Paths",
    type: 'checkbox',
    group: 'paths'
}, {
    id: 'backgroundColor',
    type: 'color-input',
    label: "Background Color: ",
    getDisabled: (d) => d,
}, {
    id: 'showLines',
    label: "Show Polygon Overlay",
    type: 'checkbox',
    getDisabled: (d) => d
}, {
    id: "fillColor",
    type: 'radio',
    options: [{
        id: "centroid",
        label: "Center Color"
    }, {
        id: "average",
        label: "Average Color"
    }]
}, {
    id: 'blackWhite',
    label: "Black and White",
    type: 'toggle'
}, {
    id: 'angleThreshold',
    type: 'slider',
    getLabel: (num) => "Path Angle Threshold: " + num + " deg",
    min: 0,
    max: 60,
    step: 3
}, {
    id: 'lengthThreshold',
    type: 'slider',
    getLabel: (num) => "Max Segment Length: " + num,
    min: 0,
    max: 200,
    step: 5
}, {
    id: 'pathLengthMinThreshold',
    type: 'slider',
    getLabel: (num) => "Path Length Min: " + num,
    min: 0,
    max: 10,
    step: 1
}, {
    id: 'pathLengthMaxThreshold',
    type: 'slider',
    getLabel: (num) => "Path Length Max: " + num,
    min: 0,
    max: 20,
    step: 1
}, {
    id: 'invert',
    label: "Invert Black and White",
    getDisabled: (d) => d,
    type: 'toggle'
}, {
    id: 'threshold',
    getLabel: (num) => "Black/White Threshold: " + num,
    type: 'slider',
    min: 50,
    max: 250,
    step: 1,
    getDisabled: (d) => d
}, {
    id: 'smoothing-header',
    type: 'header',
    label: "Smoothing Options"
}, {
    id: 'smoothType',
    type: 'select',
    label: "Smoothing Algorithm",
    options: [
        {
            id: "none",
            label: "None"
        },
        {
            id: "contrastWeighted",
            label: "Contrast Weighted"
        },
        {
            id: "lloyd",
            label: "Lloyd"
        },
        {
            id: "laplacian",
            label: "Laplacian"
        }, {
            id: "polygonVertex",
            label: "Polygon Vertex"
        }
    ]
}, {
    id: 'contrastIters',
    type: 'slider',
    getLabel: (num) => "Re-sample for Contrast: " + num + "%",
    min: 0,
    max: 300,
    step: 1,
    getDisabled: (d) => d
}, {
    id: 'smoothIters',
    type: 'slider',
    getLabel: (num) => "Re-sample to Distribute Points: " + num + " times",
    min: 0,
    max: 30,
    step: 1,
    getDisabled: (d) => d
}, {
    id: 'blur',
    type: 'Slider',
    getLabel: (num) => "Blur is " + num,
    min: 0,
    max: 100,
    step: 1
},
{
    id: 'circleSpacing',
    type: 'slider',
    getLabel: (num) => "Circle Spacing Factor: " + num,
    min: .8,
    max: 7,
    step: .1,
    getDisabled: (d) => d
},
];

export default ControlSettings;