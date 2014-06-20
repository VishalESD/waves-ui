# TimeLine

This module is a layer/layout manager for time based visualisations written on top of [d3.js](http://d3js.org/).  
The module by itself doesn't accomplish much as long as you don't pass it in some visualisation layer or component.  
This illustrates how you could use with a [segment visualiser](https://github.com/ircam-rnd/segment-vis).

## Status

This library is under heavy development and subject to change.  
Evert new API breaking change we will be adding snapshots to the repository so you can always fetch a working copy.

For an in depth  explanation on the philosophy and usage of this library please refer to [this blog post](http://wave.ircam.fr/publications/visual-tools/).

## Usage

### Data
Will be passed to a timeLine.
```js
var data = 
  [{
      "start": 37,
      "duration": 4,
      "color": "#414FBA" },
    { "start": …},
    { "start": …}
  ];
```

### Creating the timeLine layout
```js
var graph = timeLine()
  .width(800)
  .height(150)
  .xDomain([0, 100]);

```


### Creating the Visualiser layer
```js
var seg = segmentVis()
  .data(data)
  .name('segments')
  .opacity(0.5);
```

### Adding the Visualiser layer and drawing everything
```js
// we add layers like this
graph.layer(seg);
// we pass in the drawing method from our timeline object
d3.select('.timeline').call(graph.draw);

```