"use strict";

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _inherits = require("babel-runtime/helpers/inherits")["default"];

var _get = require("babel-runtime/helpers/get")["default"];

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _core = require("babel-runtime/core-js")["default"];

var events = require("events");
var ns = require("./namespace");
var TimeContext = require("./time-context");
var Surface = require("../interactions/surface");
var Keyboard = require("../interactions/keyboard");
var Layer = require("./layer");
var d3Scale = require("d3-scale");

/**
 *  @class Timeline
 */

var Timeline = (function (_events$EventEmitter) {
  /**
   *  Creates a new Timeline
   *  @param params {Object} an object to override defaults parameters
   */

  function Timeline() {
    var params = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Timeline);

    _get(_core.Object.getPrototypeOf(Timeline.prototype), "constructor", this).call(this);

    this._defaults = {
      width: 1000,
      duration: 60
    };

    // public attributes
    this.params = _core.Object.assign({}, this._defaults, params);
    this.timeContext = null;
    this.layers = [];
    this.containers = {};
    // @NOTE realy needed ?
    this.groupedLayers = {}; // group layer by categories
    // private attributes
    this._state = null;
    this._layerContainerMap = new _core.Map();
    this._handleEvent = this._handleEvent.bind(this);

    this._createTimeContext();
    this._createInteraction(Keyboard, "body");
  }

  _inherits(Timeline, _events$EventEmitter);

  _createClass(Timeline, {
    width: {

      // parameters modifiers

      set: function (value) {
        this.params.width = value;

        if (this.timeContext) {
          this.timeContext.xScaleRange = [0, this.params.width];
        }
      }
    },
    duration: {
      set: function (value) {}
    },
    setState: {

      /**
       *  Change the state of the timeline, `States` are the main entry point between
       *  application logic, interactions, ..., and the library
       *  @param state {BaseState} the state in which the timeline must be setted
       */

      value: function setState(state) {
        if (this._state) {
          this._state.exit();
        }
        this._state = state;
        this._state.enter();
      }
    },
    _handleEvent: {

      /**
       *  @private
       *  The callback that is used to listen to interactions modules
       *  @params e {Event} a custom event generated by interaction modules
       */

      value: function _handleEvent(e) {
        if (!this._state) {
          return;
        }
        this._state.handleEvent(e);
      }
    },
    _createInteraction: {

      /**
       *  Factory method to add interaction modules the timeline should listen to
       *  by default, the timeline listen to Keyboard, and instance a Surface on each
       *  container
       *  @param ctor {EventSource} the contructor of the interaction module to instanciate
       *  @param el {DOMElement} the DOM element to bind to the EventSource module
       */

      value: function _createInteraction(ctor, el) {
        var options = arguments[2] === undefined ? {} : arguments[2];

        var interaction = new ctor(el, options);
        interaction.on("event", this._handleEvent);
      }
    },
    _createTimeContext: {

      /**
       *  Creates a new TimeContext for the visualisation, this `TimeContext`
       *  will be at the top of the `TimeContext` tree
       */

      value: function _createTimeContext() {
        var duration = this.params.duration;
        var width = this.params.width;

        var xScale = d3Scale.linear().domain([0, duration]).range([0, width]);

        this.timeContext = new TimeContext();
        this.timeContext.duration = duration;
        this.timeContext.xScale = xScale;
      }
    },
    addLayer: {

      /**
       *  Adds a `Layer` to the Timeline
       *  @param layer {Layer} the layer to register
       *  @param containerId {String} a valid id of a previsouly registered container
       *  @param group {String} insert the layer into some user defined group of layers
       *  @param timeContext {TimeContext} a `TimeContext` the layer is associated with
       *      if null given, a new `TimeContext` will be created for the layer
       */

      value: function addLayer(layer, containerId) {
        var group = arguments[2] === undefined ? "default" : arguments[2];

        this._layerContainerMap.set(layer, this.containers[containerId]);
        this.layers.push(layer);

        if (!this.groupedLayers[group]) {
          this.groupedLayers[group] = [];
        }

        this.groupedLayers[group].push(layer);
      }
    },
    removeLayer: {

      /**
       *  Remove a layer from the timeline
       *  @param layer {Layer} the layer to remove
       */

      value: function removeLayer(layer) {}
    },
    getGroup: {

      // @NOTE bad API => method name
      /**
       *  Returns an array of layers given some group
       *  @param group {String} name of the group
       *  @return {Array} an array of layers which belongs to the group
       */

      value: function getGroup() {
        var group = arguments[0] === undefined ? "default" : arguments[0];

        return this.groupedLayers[group] || [];
      }
    },
    registerContainer: {

      /**
       *  Register a container and prepare the DOM svg element for the timeline's layers
       *  @param id {String} a user defined id for the container
       *  @param el {DOMElement} the DOMElement to use as a container
       *  @param options {Object} the options to apply to the container
       */

      value: function registerContainer(id, el) {
        var options = arguments[2] === undefined ? {} : arguments[2];

        var height = options.height || 120;
        var width = this.params.width;
        var svg = document.createElementNS(ns, "svg");

        svg.setAttributeNS(null, "height", height);
        svg.setAttributeNS(null, "shape-rendering", "optimizeSpeed");
        svg.setAttribute("xmlns:xhtml", "http://www.w3.org/1999/xhtml");
        svg.setAttributeNS(null, "width", width);
        svg.setAttributeNS(null, "viewbox", "0 0 " + width + " " + height);

        var defs = document.createElementNS(ns, "defs");

        var offsetGroup = document.createElementNS(ns, "g");
        offsetGroup.classList.add("offset");

        var layoutGroup = document.createElementNS(ns, "g");
        layoutGroup.classList.add("layout");

        var interactionsGroup = document.createElementNS(ns, "g");
        interactionsGroup.classList.add("interactions");

        svg.appendChild(defs);
        offsetGroup.appendChild(layoutGroup);
        svg.appendChild(offsetGroup);
        svg.appendChild(interactionsGroup);

        el.appendChild(svg);
        el.style.fontSize = 0; // removes additionnal height added who knows why...
        el.style.transform = "translateZ(0)"; // fixes one of the weird canvas rendering bugs in chrome

        // store all informations about this container
        var container = {
          id: id,
          height: height,
          layoutElement: layoutGroup,
          offsetElement: offsetGroup,
          interactionsElement: interactionsGroup,
          svgElement: svg,
          DOMElement: el,
          brushElement: null
        };

        this.containers[id] = container;
        this._createInteraction(Surface, el);
      }
    },
    getContainerPerElement: {

      // -----------------------------------------------
      // @NOTE remove those helpers ?
      // -----------------------------------------------

      // @NOTE change to `getContainer(el || id || layer)` ?

      value: function getContainerPerElement(el) {
        for (var id in this.containers) {
          var container = this.containers[id];
          if (container.DOMElement === el) {
            return container;
          }
        }

        return null;
      }
    },
    getLayerContainer: {
      value: function getLayerContainer(layer) {
        return this._layerContainerMap.get(layer);
      }
    },
    _getLayers: {

      // getContainerPerId(id) {
      //   return this.containers[id];
      // }

      // -----------------------------------------------

      /**
       *  @param LayerOrGroup{mixed} defaults null
       *  @return an array of layers
       */

      value: function _getLayers() {
        var layerOrGroup = arguments[0] === undefined ? null : arguments[0];

        var layers = null;

        if (typeof layerOrGroup === "string") {
          layers = this.getLayers(layerOrGroup);
        } else if (layerOrGroup instanceof Layer) {
          layers = [layerOrGroup];
        } else {
          layers = this.layers;
        }

        return layers;
      }
    },
    updateContainers: {

      /**
       *  Update all the containers according to `this.timeContext`
       */

      value: function updateContainers() {
        var timeContext = this.timeContext;
        var width = this.params.width;

        for (var id in this.containers) {
          var container = this.containers[id];
          var $offset = container.offsetElement;
          var $svg = container.svgElement;
          var height = container.height;
          var translate = "translate(" + timeContext.xScale(timeContext.offset) + ", 0)";

          $svg.setAttributeNS(null, "width", width);
          $svg.setAttributeNS(null, "viewbox", "0 0 " + width + " " + height);
          $offset.setAttributeNS(null, "transform", translate);
        }
      }
    },
    render: {

      /**
       *  Render all the layers in the timeline
       */

      value: function render() {
        var _this = this;

        this.layers.forEach(function (layer) {
          var container = _this._layerContainerMap.get(layer);
          container.layoutElement.appendChild(layer.render());
        });
      }
    },
    draw: {

      /**
       *  Draw all the layers in the timeline
       */

      value: function draw() {
        var layerOrGroup = arguments[0] === undefined ? null : arguments[0];

        var layers = this._getLayers(layerOrGroup);
        layers.forEach(function (layer) {
          return layer.draw();
        });
      }
    },
    update: {

      /**
       *  Update all the layers in the timeline
       *  @TODO accept several `layers` or `categories` as arguments ?
       */

      value: function update() {
        var layerOrGroup = arguments[0] === undefined ? null : arguments[0];

        var layers = this._getLayers(layerOrGroup);

        this.updateContainers();
        layers.forEach(function (layer) {
          return layer.update();
        });

        this.emit("update", layers);
      }
    }
  });

  return Timeline;
})(events.EventEmitter);

module.exports = Timeline;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImVzNi9jb3JlL3RpbWVsaW5lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxJQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDbEMsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDOUMsSUFBTSxPQUFPLEdBQUksT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFDcEQsSUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDckQsSUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2pDLElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzs7Ozs7O0lBSzlCLFFBQVE7Ozs7OztBQUtELFdBTFAsUUFBUSxHQUthO1FBQWIsTUFBTSxnQ0FBRyxFQUFFOzswQkFMbkIsUUFBUTs7QUFNVixxQ0FORSxRQUFRLDZDQU1GOztBQUVSLFFBQUksQ0FBQyxTQUFTLEdBQUc7QUFDZixXQUFLLEVBQUUsSUFBSTtBQUNYLGNBQVEsRUFBRSxFQUFFO0tBQ2IsQ0FBQzs7O0FBR0YsUUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFBLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDeEQsUUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFDeEIsUUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDakIsUUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7O0FBRXJCLFFBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDOztBQUV4QixRQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztBQUNuQixRQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNwQyxRQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVqRCxRQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztBQUMxQixRQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0dBQzNDOztZQTNCRyxRQUFROztlQUFSLFFBQVE7QUE4QlIsU0FBSzs7OztXQUFBLFVBQUMsS0FBSyxFQUFFO0FBQ2YsWUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDOztBQUUxQixZQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDcEIsY0FBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN2RDtPQUNGOztBQUVHLFlBQVE7V0FBQSxVQUFDLEtBQUssRUFBRSxFQUVuQjs7QUFPRCxZQUFROzs7Ozs7OzthQUFBLGtCQUFDLEtBQUssRUFBRTtBQUNkLFlBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtBQUFFLGNBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7U0FBRTtBQUN4QyxZQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztBQUNwQixZQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO09BQ3JCOztBQU9ELGdCQUFZOzs7Ozs7OzthQUFBLHNCQUFDLENBQUMsRUFBRTtBQUNkLFlBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQUUsaUJBQU87U0FBRTtBQUM3QixZQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztPQUM1Qjs7QUFTRCxzQkFBa0I7Ozs7Ozs7Ozs7YUFBQSw0QkFBQyxJQUFJLEVBQUUsRUFBRSxFQUFnQjtZQUFkLE9BQU8sZ0NBQUcsRUFBRTs7QUFDdkMsWUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLG1CQUFXLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7T0FDNUM7O0FBTUQsc0JBQWtCOzs7Ozs7O2FBQUEsOEJBQUc7QUFDbkIsWUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDdEMsWUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7O0FBRWhDLFlBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FDNUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQ3JCLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDOztBQUVyQixZQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7QUFDckMsWUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEdBQUksUUFBUSxDQUFDO0FBQ3RDLFlBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztPQUNsQzs7QUFVRCxZQUFROzs7Ozs7Ozs7OzthQUFBLGtCQUFDLEtBQUssRUFBRSxXQUFXLEVBQXFCO1lBQW5CLEtBQUssZ0NBQUcsU0FBUzs7QUFDNUMsWUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLFlBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUV4QixZQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUM5QixjQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztTQUNoQzs7QUFFRCxZQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztPQUN2Qzs7QUFNRCxlQUFXOzs7Ozs7O2FBQUEscUJBQUMsS0FBSyxFQUFFLEVBRWxCOztBQVFELFlBQVE7Ozs7Ozs7OzthQUFBLG9CQUFvQjtZQUFuQixLQUFLLGdDQUFHLFNBQVM7O0FBQ3hCLGVBQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7T0FDeEM7O0FBUUQscUJBQWlCOzs7Ozs7Ozs7YUFBQSwyQkFBQyxFQUFFLEVBQUUsRUFBRSxFQUFnQjtZQUFkLE9BQU8sZ0NBQUcsRUFBRTs7QUFDcEMsWUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUM7QUFDckMsWUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDaEMsWUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7O0FBRWhELFdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUMzQyxXQUFHLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUM3RCxXQUFHLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO0FBQ2hFLFdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN6QyxXQUFHLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLFdBQVMsS0FBSyxTQUFJLE1BQU0sQ0FBRyxDQUFDOztBQUU5RCxZQUFNLElBQUksR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQzs7QUFFbEQsWUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdEQsbUJBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDOztBQUVwQyxZQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN0RCxtQkFBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7O0FBRXBDLFlBQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUQseUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQzs7QUFFaEQsV0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QixtQkFBVyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNyQyxXQUFHLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzdCLFdBQUcsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs7QUFFbkMsVUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixVQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFDdEIsVUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDOzs7QUFHckMsWUFBTSxTQUFTLEdBQUc7QUFDaEIsWUFBRSxFQUFFLEVBQUU7QUFDTixnQkFBTSxFQUFFLE1BQU07QUFDZCx1QkFBYSxFQUFFLFdBQVc7QUFDMUIsdUJBQWEsRUFBRSxXQUFXO0FBQzFCLDZCQUFtQixFQUFFLGlCQUFpQjtBQUN0QyxvQkFBVSxFQUFFLEdBQUc7QUFDZixvQkFBVSxFQUFFLEVBQUU7QUFDZCxzQkFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQzs7QUFFRixZQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQztBQUNoQyxZQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO09BQ3RDOztBQU9ELDBCQUFzQjs7Ozs7Ozs7YUFBQSxnQ0FBQyxFQUFFLEVBQUU7QUFDekIsYUFBSyxJQUFJLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO0FBQzlCLGNBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsY0FBSSxTQUFTLENBQUMsVUFBVSxLQUFLLEVBQUUsRUFBRTtBQUFFLG1CQUFPLFNBQVMsQ0FBQztXQUFFO1NBQ3ZEOztBQUVELGVBQU8sSUFBSSxDQUFDO09BQ2I7O0FBRUQscUJBQWlCO2FBQUEsMkJBQUMsS0FBSyxFQUFFO0FBQ3ZCLGVBQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztPQUMzQzs7QUFZRCxjQUFVOzs7Ozs7Ozs7Ozs7O2FBQUEsc0JBQXNCO1lBQXJCLFlBQVksZ0NBQUcsSUFBSTs7QUFDNUIsWUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDOztBQUVsQixZQUFJLE9BQU8sWUFBWSxLQUFLLFFBQVEsRUFBRTtBQUNwQyxnQkFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDdkMsTUFBTSxJQUFJLFlBQVksWUFBWSxLQUFLLEVBQUU7QUFDeEMsZ0JBQU0sR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQ3pCLE1BQU07QUFDTCxnQkFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7U0FDdEI7O0FBRUQsZUFBTyxNQUFNLENBQUM7T0FDZjs7QUFLRCxvQkFBZ0I7Ozs7OzthQUFBLDRCQUFHO0FBQ2pCLFlBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDckMsWUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7O0FBRWhDLGFBQUssSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtBQUM5QixjQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3RDLGNBQU0sT0FBTyxHQUFLLFNBQVMsQ0FBQyxhQUFhLENBQUM7QUFDMUMsY0FBTSxJQUFJLEdBQVEsU0FBUyxDQUFDLFVBQVUsQ0FBQztBQUN2QyxjQUFNLE1BQU0sR0FBTSxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQ25DLGNBQU0sU0FBUyxrQkFBZ0IsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQU0sQ0FBQzs7QUFFNUUsY0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFDLGNBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsV0FBUyxLQUFLLFNBQUksTUFBTSxDQUFHLENBQUM7QUFDL0QsaUJBQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztTQUN0RDtPQUNGOztBQUtELFVBQU07Ozs7OzthQUFBLGtCQUFHOzs7QUFDUCxZQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBSztBQUM3QixjQUFNLFNBQVMsR0FBRyxNQUFLLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNyRCxtQkFBUyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7U0FDckQsQ0FBQyxDQUFDO09BQ0o7O0FBS0QsUUFBSTs7Ozs7O2FBQUEsZ0JBQXNCO1lBQXJCLFlBQVksZ0NBQUcsSUFBSTs7QUFDdEIsWUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM3QyxjQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSztpQkFBSyxLQUFLLENBQUMsSUFBSSxFQUFFO1NBQUEsQ0FBQyxDQUFDO09BQ3pDOztBQU1ELFVBQU07Ozs7Ozs7YUFBQSxrQkFBc0I7WUFBckIsWUFBWSxnQ0FBRyxJQUFJOztBQUN4QixZQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDOztBQUU3QyxZQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUN4QixjQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSztpQkFBSyxLQUFLLENBQUMsTUFBTSxFQUFFO1NBQUEsQ0FBQyxDQUFDOztBQUUxQyxZQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztPQUM3Qjs7OztTQWpSRyxRQUFRO0dBQVMsTUFBTSxDQUFDLFlBQVk7O0FBb1IxQyxNQUFNLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyIsImZpbGUiOiJlczYvY29yZS90aW1lbGluZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGV2ZW50cyA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuY29uc3QgbnMgPSByZXF1aXJlKCcuL25hbWVzcGFjZScpO1xuY29uc3QgVGltZUNvbnRleHQgPSByZXF1aXJlKCcuL3RpbWUtY29udGV4dCcpO1xuY29uc3QgU3VyZmFjZSAgPSByZXF1aXJlKCcuLi9pbnRlcmFjdGlvbnMvc3VyZmFjZScpO1xuY29uc3QgS2V5Ym9hcmQgPSByZXF1aXJlKCcuLi9pbnRlcmFjdGlvbnMva2V5Ym9hcmQnKTtcbmNvbnN0IExheWVyID0gcmVxdWlyZSgnLi9sYXllcicpO1xuY29uc3QgZDNTY2FsZSA9IHJlcXVpcmUoJ2QzLXNjYWxlJyk7XG5cbi8qKlxuICogIEBjbGFzcyBUaW1lbGluZVxuICovXG5jbGFzcyBUaW1lbGluZSBleHRlbmRzIGV2ZW50cy5FdmVudEVtaXR0ZXIge1xuICAvKipcbiAgICogIENyZWF0ZXMgYSBuZXcgVGltZWxpbmVcbiAgICogIEBwYXJhbSBwYXJhbXMge09iamVjdH0gYW4gb2JqZWN0IHRvIG92ZXJyaWRlIGRlZmF1bHRzIHBhcmFtZXRlcnNcbiAgICovXG4gIGNvbnN0cnVjdG9yKHBhcmFtcyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuX2RlZmF1bHRzID0ge1xuICAgICAgd2lkdGg6IDEwMDAsXG4gICAgICBkdXJhdGlvbjogNjBcbiAgICB9O1xuXG4gICAgLy8gcHVibGljIGF0dHJpYnV0ZXNcbiAgICB0aGlzLnBhcmFtcyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX2RlZmF1bHRzLCBwYXJhbXMpO1xuICAgIHRoaXMudGltZUNvbnRleHQgPSBudWxsO1xuICAgIHRoaXMubGF5ZXJzID0gW107XG4gICAgdGhpcy5jb250YWluZXJzID0ge307XG4gICAgLy8gQE5PVEUgcmVhbHkgbmVlZGVkID9cbiAgICB0aGlzLmdyb3VwZWRMYXllcnMgPSB7fTsgLy8gZ3JvdXAgbGF5ZXIgYnkgY2F0ZWdvcmllc1xuICAgIC8vIHByaXZhdGUgYXR0cmlidXRlc1xuICAgIHRoaXMuX3N0YXRlID0gbnVsbDtcbiAgICB0aGlzLl9sYXllckNvbnRhaW5lck1hcCA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLl9oYW5kbGVFdmVudCA9IHRoaXMuX2hhbmRsZUV2ZW50LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLl9jcmVhdGVUaW1lQ29udGV4dCgpO1xuICAgIHRoaXMuX2NyZWF0ZUludGVyYWN0aW9uKEtleWJvYXJkLCAnYm9keScpO1xuICB9XG5cbiAgLy8gcGFyYW1ldGVycyBtb2RpZmllcnNcbiAgc2V0IHdpZHRoKHZhbHVlKSB7XG4gICAgdGhpcy5wYXJhbXMud2lkdGggPSB2YWx1ZTtcblxuICAgIGlmICh0aGlzLnRpbWVDb250ZXh0KSB7XG4gICAgICB0aGlzLnRpbWVDb250ZXh0LnhTY2FsZVJhbmdlID0gWzAsIHRoaXMucGFyYW1zLndpZHRoXTtcbiAgICB9XG4gIH1cblxuICBzZXQgZHVyYXRpb24odmFsdWUpIHtcblxuICB9XG5cbiAgLyoqXG4gICAqICBDaGFuZ2UgdGhlIHN0YXRlIG9mIHRoZSB0aW1lbGluZSwgYFN0YXRlc2AgYXJlIHRoZSBtYWluIGVudHJ5IHBvaW50IGJldHdlZW5cbiAgICogIGFwcGxpY2F0aW9uIGxvZ2ljLCBpbnRlcmFjdGlvbnMsIC4uLiwgYW5kIHRoZSBsaWJyYXJ5XG4gICAqICBAcGFyYW0gc3RhdGUge0Jhc2VTdGF0ZX0gdGhlIHN0YXRlIGluIHdoaWNoIHRoZSB0aW1lbGluZSBtdXN0IGJlIHNldHRlZFxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGUpIHtcbiAgICBpZiAodGhpcy5fc3RhdGUpIHsgdGhpcy5fc3RhdGUuZXhpdCgpOyB9XG4gICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcbiAgICB0aGlzLl9zdGF0ZS5lbnRlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqICBAcHJpdmF0ZVxuICAgKiAgVGhlIGNhbGxiYWNrIHRoYXQgaXMgdXNlZCB0byBsaXN0ZW4gdG8gaW50ZXJhY3Rpb25zIG1vZHVsZXNcbiAgICogIEBwYXJhbXMgZSB7RXZlbnR9IGEgY3VzdG9tIGV2ZW50IGdlbmVyYXRlZCBieSBpbnRlcmFjdGlvbiBtb2R1bGVzXG4gICAqL1xuICBfaGFuZGxlRXZlbnQoZSkge1xuICAgIGlmICghdGhpcy5fc3RhdGUpIHsgcmV0dXJuOyB9XG4gICAgdGhpcy5fc3RhdGUuaGFuZGxlRXZlbnQoZSk7XG4gIH1cblxuICAvKipcbiAgICogIEZhY3RvcnkgbWV0aG9kIHRvIGFkZCBpbnRlcmFjdGlvbiBtb2R1bGVzIHRoZSB0aW1lbGluZSBzaG91bGQgbGlzdGVuIHRvXG4gICAqICBieSBkZWZhdWx0LCB0aGUgdGltZWxpbmUgbGlzdGVuIHRvIEtleWJvYXJkLCBhbmQgaW5zdGFuY2UgYSBTdXJmYWNlIG9uIGVhY2hcbiAgICogIGNvbnRhaW5lclxuICAgKiAgQHBhcmFtIGN0b3Ige0V2ZW50U291cmNlfSB0aGUgY29udHJ1Y3RvciBvZiB0aGUgaW50ZXJhY3Rpb24gbW9kdWxlIHRvIGluc3RhbmNpYXRlXG4gICAqICBAcGFyYW0gZWwge0RPTUVsZW1lbnR9IHRoZSBET00gZWxlbWVudCB0byBiaW5kIHRvIHRoZSBFdmVudFNvdXJjZSBtb2R1bGVcbiAgICovXG4gIF9jcmVhdGVJbnRlcmFjdGlvbihjdG9yLCBlbCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgaW50ZXJhY3Rpb24gPSBuZXcgY3RvcihlbCwgb3B0aW9ucyk7XG4gICAgaW50ZXJhY3Rpb24ub24oJ2V2ZW50JywgdGhpcy5faGFuZGxlRXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqICBDcmVhdGVzIGEgbmV3IFRpbWVDb250ZXh0IGZvciB0aGUgdmlzdWFsaXNhdGlvbiwgdGhpcyBgVGltZUNvbnRleHRgXG4gICAqICB3aWxsIGJlIGF0IHRoZSB0b3Agb2YgdGhlIGBUaW1lQ29udGV4dGAgdHJlZVxuICAgKi9cbiAgX2NyZWF0ZVRpbWVDb250ZXh0KCkge1xuICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5wYXJhbXMuZHVyYXRpb247XG4gICAgY29uc3Qgd2lkdGggPSB0aGlzLnBhcmFtcy53aWR0aDtcblxuICAgIGNvbnN0IHhTY2FsZSA9IGQzU2NhbGUubGluZWFyKClcbiAgICAgIC5kb21haW4oWzAsIGR1cmF0aW9uXSlcbiAgICAgIC5yYW5nZShbMCwgd2lkdGhdKTtcblxuICAgIHRoaXMudGltZUNvbnRleHQgPSBuZXcgVGltZUNvbnRleHQoKTtcbiAgICB0aGlzLnRpbWVDb250ZXh0LmR1cmF0aW9uID0gIGR1cmF0aW9uO1xuICAgIHRoaXMudGltZUNvbnRleHQueFNjYWxlID0geFNjYWxlO1xuICB9XG5cbiAgLyoqXG4gICAqICBBZGRzIGEgYExheWVyYCB0byB0aGUgVGltZWxpbmVcbiAgICogIEBwYXJhbSBsYXllciB7TGF5ZXJ9IHRoZSBsYXllciB0byByZWdpc3RlclxuICAgKiAgQHBhcmFtIGNvbnRhaW5lcklkIHtTdHJpbmd9IGEgdmFsaWQgaWQgb2YgYSBwcmV2aXNvdWx5IHJlZ2lzdGVyZWQgY29udGFpbmVyXG4gICAqICBAcGFyYW0gZ3JvdXAge1N0cmluZ30gaW5zZXJ0IHRoZSBsYXllciBpbnRvIHNvbWUgdXNlciBkZWZpbmVkIGdyb3VwIG9mIGxheWVyc1xuICAgKiAgQHBhcmFtIHRpbWVDb250ZXh0IHtUaW1lQ29udGV4dH0gYSBgVGltZUNvbnRleHRgIHRoZSBsYXllciBpcyBhc3NvY2lhdGVkIHdpdGhcbiAgICogICAgICBpZiBudWxsIGdpdmVuLCBhIG5ldyBgVGltZUNvbnRleHRgIHdpbGwgYmUgY3JlYXRlZCBmb3IgdGhlIGxheWVyXG4gICAqL1xuICBhZGRMYXllcihsYXllciwgY29udGFpbmVySWQsIGdyb3VwID0gJ2RlZmF1bHQnKSB7XG4gICAgdGhpcy5fbGF5ZXJDb250YWluZXJNYXAuc2V0KGxheWVyLCB0aGlzLmNvbnRhaW5lcnNbY29udGFpbmVySWRdKTtcbiAgICB0aGlzLmxheWVycy5wdXNoKGxheWVyKTtcblxuICAgIGlmICghdGhpcy5ncm91cGVkTGF5ZXJzW2dyb3VwXSkge1xuICAgICAgdGhpcy5ncm91cGVkTGF5ZXJzW2dyb3VwXSA9IFtdO1xuICAgIH1cblxuICAgIHRoaXMuZ3JvdXBlZExheWVyc1tncm91cF0ucHVzaChsYXllcik7XG4gIH1cblxuICAvKipcbiAgICogIFJlbW92ZSBhIGxheWVyIGZyb20gdGhlIHRpbWVsaW5lXG4gICAqICBAcGFyYW0gbGF5ZXIge0xheWVyfSB0aGUgbGF5ZXIgdG8gcmVtb3ZlXG4gICAqL1xuICByZW1vdmVMYXllcihsYXllcikge1xuXG4gIH1cblxuICAvLyBATk9URSBiYWQgQVBJID0+IG1ldGhvZCBuYW1lXG4gIC8qKlxuICAgKiAgUmV0dXJucyBhbiBhcnJheSBvZiBsYXllcnMgZ2l2ZW4gc29tZSBncm91cFxuICAgKiAgQHBhcmFtIGdyb3VwIHtTdHJpbmd9IG5hbWUgb2YgdGhlIGdyb3VwXG4gICAqICBAcmV0dXJuIHtBcnJheX0gYW4gYXJyYXkgb2YgbGF5ZXJzIHdoaWNoIGJlbG9uZ3MgdG8gdGhlIGdyb3VwXG4gICAqL1xuICBnZXRHcm91cChncm91cCA9ICdkZWZhdWx0Jykge1xuICAgIHJldHVybiB0aGlzLmdyb3VwZWRMYXllcnNbZ3JvdXBdIHx8wqBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiAgUmVnaXN0ZXIgYSBjb250YWluZXIgYW5kIHByZXBhcmUgdGhlIERPTSBzdmcgZWxlbWVudCBmb3IgdGhlIHRpbWVsaW5lJ3MgbGF5ZXJzXG4gICAqICBAcGFyYW0gaWQge1N0cmluZ30gYSB1c2VyIGRlZmluZWQgaWQgZm9yIHRoZSBjb250YWluZXJcbiAgICogIEBwYXJhbSBlbCB7RE9NRWxlbWVudH0gdGhlIERPTUVsZW1lbnQgdG8gdXNlIGFzIGEgY29udGFpbmVyXG4gICAqICBAcGFyYW0gb3B0aW9ucyB7T2JqZWN0fSB0aGUgb3B0aW9ucyB0byBhcHBseSB0byB0aGUgY29udGFpbmVyXG4gICAqL1xuICByZWdpc3RlckNvbnRhaW5lcihpZCwgZWwsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDEyMDtcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMucGFyYW1zLndpZHRoO1xuICAgIGNvbnN0IHN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ3N2ZycpO1xuXG4gICAgc3ZnLnNldEF0dHJpYnV0ZU5TKG51bGwsICdoZWlnaHQnLCBoZWlnaHQpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGVOUyhudWxsLCAnc2hhcGUtcmVuZGVyaW5nJywgJ29wdGltaXplU3BlZWQnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd4bWxuczp4aHRtbCcsICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sJyk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZU5TKG51bGwsICd3aWR0aCcsIHdpZHRoKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlTlMobnVsbCwgJ3ZpZXdib3gnLCBgMCAwICR7d2lkdGh9ICR7aGVpZ2h0fWApO1xuXG4gICAgY29uc3QgZGVmcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ2RlZnMnKTtcblxuICAgIGNvbnN0IG9mZnNldEdyb3VwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKG5zLCAnZycpO1xuICAgIG9mZnNldEdyb3VwLmNsYXNzTGlzdC5hZGQoJ29mZnNldCcpO1xuXG4gICAgY29uc3QgbGF5b3V0R3JvdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsICdnJyk7XG4gICAgbGF5b3V0R3JvdXAuY2xhc3NMaXN0LmFkZCgnbGF5b3V0Jyk7XG5cbiAgICBjb25zdCBpbnRlcmFjdGlvbnNHcm91cCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgJ2cnKTtcbiAgICBpbnRlcmFjdGlvbnNHcm91cC5jbGFzc0xpc3QuYWRkKCdpbnRlcmFjdGlvbnMnKTtcblxuICAgIHN2Zy5hcHBlbmRDaGlsZChkZWZzKTtcbiAgICBvZmZzZXRHcm91cC5hcHBlbmRDaGlsZChsYXlvdXRHcm91cCk7XG4gICAgc3ZnLmFwcGVuZENoaWxkKG9mZnNldEdyb3VwKTtcbiAgICBzdmcuYXBwZW5kQ2hpbGQoaW50ZXJhY3Rpb25zR3JvdXApO1xuXG4gICAgZWwuYXBwZW5kQ2hpbGQoc3ZnKTtcbiAgICBlbC5zdHlsZS5mb250U2l6ZSA9IDA7IC8vIHJlbW92ZXMgYWRkaXRpb25uYWwgaGVpZ2h0IGFkZGVkIHdobyBrbm93cyB3aHkuLi5cbiAgICBlbC5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlWigwKSc7IC8vIGZpeGVzIG9uZSBvZiB0aGUgd2VpcmQgY2FudmFzIHJlbmRlcmluZyBidWdzIGluIGNocm9tZVxuXG4gICAgLy8gc3RvcmUgYWxsIGluZm9ybWF0aW9ucyBhYm91dCB0aGlzIGNvbnRhaW5lclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIGhlaWdodDogaGVpZ2h0LFxuICAgICAgbGF5b3V0RWxlbWVudDogbGF5b3V0R3JvdXAsXG4gICAgICBvZmZzZXRFbGVtZW50OiBvZmZzZXRHcm91cCxcbiAgICAgIGludGVyYWN0aW9uc0VsZW1lbnQ6IGludGVyYWN0aW9uc0dyb3VwLFxuICAgICAgc3ZnRWxlbWVudDogc3ZnLFxuICAgICAgRE9NRWxlbWVudDogZWwsXG4gICAgICBicnVzaEVsZW1lbnQ6IG51bGxcbiAgICB9O1xuXG4gICAgdGhpcy5jb250YWluZXJzW2lkXSA9IGNvbnRhaW5lcjtcbiAgICB0aGlzLl9jcmVhdGVJbnRlcmFjdGlvbihTdXJmYWNlLCBlbCk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBATk9URSByZW1vdmUgdGhvc2UgaGVscGVycyA/XG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gQE5PVEUgY2hhbmdlIHRvIGBnZXRDb250YWluZXIoZWwgfHwgaWQgfHwgbGF5ZXIpYCA/XG4gIGdldENvbnRhaW5lclBlckVsZW1lbnQoZWwpIHtcbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLmNvbnRhaW5lcnMpIHtcbiAgICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyc1tpZF07XG4gICAgICBpZiAoY29udGFpbmVyLkRPTUVsZW1lbnQgPT09IGVsKSB7IHJldHVybiBjb250YWluZXI7IH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGdldExheWVyQ29udGFpbmVyKGxheWVyKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xheWVyQ29udGFpbmVyTWFwLmdldChsYXllcik7XG4gIH1cblxuICAvLyBnZXRDb250YWluZXJQZXJJZChpZCkge1xuICAvLyAgIHJldHVybiB0aGlzLmNvbnRhaW5lcnNbaWRdO1xuICAvLyB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvKipcbiAgICogIEBwYXJhbSBMYXllck9yR3JvdXB7bWl4ZWR9IGRlZmF1bHRzIG51bGxcbiAgICogIEByZXR1cm4gYW4gYXJyYXkgb2YgbGF5ZXJzXG4gICAqL1xuICBfZ2V0TGF5ZXJzKGxheWVyT3JHcm91cCA9IG51bGwpIHtcbiAgICBsZXQgbGF5ZXJzID0gbnVsbDtcblxuICAgIGlmICh0eXBlb2YgbGF5ZXJPckdyb3VwID09PSAnc3RyaW5nJykge1xuICAgICAgbGF5ZXJzID0gdGhpcy5nZXRMYXllcnMobGF5ZXJPckdyb3VwKTtcbiAgICB9IGVsc2UgaWYgKGxheWVyT3JHcm91cCBpbnN0YW5jZW9mIExheWVyKSB7XG4gICAgICBsYXllcnMgPSBbbGF5ZXJPckdyb3VwXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGF5ZXJzID0gdGhpcy5sYXllcnM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxheWVycztcbiAgfVxuXG4gIC8qKlxuICAgKiAgVXBkYXRlIGFsbCB0aGUgY29udGFpbmVycyBhY2NvcmRpbmcgdG8gYHRoaXMudGltZUNvbnRleHRgXG4gICAqL1xuICB1cGRhdGVDb250YWluZXJzKCkge1xuICAgIGNvbnN0IHRpbWVDb250ZXh0ID0gdGhpcy50aW1lQ29udGV4dDtcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMucGFyYW1zLndpZHRoO1xuXG4gICAgZm9yIChsZXQgaWQgaW4gdGhpcy5jb250YWluZXJzKSB7XG4gICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRhaW5lcnNbaWRdO1xuICAgICAgY29uc3QgJG9mZnNldCAgID0gY29udGFpbmVyLm9mZnNldEVsZW1lbnQ7XG4gICAgICBjb25zdCAkc3ZnICAgICAgPSBjb250YWluZXIuc3ZnRWxlbWVudDtcbiAgICAgIGNvbnN0IGhlaWdodCAgICA9IGNvbnRhaW5lci5oZWlnaHQ7XG4gICAgICBjb25zdCB0cmFuc2xhdGUgPSBgdHJhbnNsYXRlKCR7dGltZUNvbnRleHQueFNjYWxlKHRpbWVDb250ZXh0Lm9mZnNldCl9LCAwKWA7XG5cbiAgICAgICRzdmcuc2V0QXR0cmlidXRlTlMobnVsbCwgJ3dpZHRoJywgd2lkdGgpO1xuICAgICAgJHN2Zy5zZXRBdHRyaWJ1dGVOUyhudWxsLCAndmlld2JveCcsIGAwIDAgJHt3aWR0aH0gJHtoZWlnaHR9YCk7XG4gICAgICAkb2Zmc2V0LnNldEF0dHJpYnV0ZU5TKG51bGwsICd0cmFuc2Zvcm0nLCB0cmFuc2xhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiAgUmVuZGVyIGFsbCB0aGUgbGF5ZXJzIGluIHRoZSB0aW1lbGluZVxuICAgKi9cbiAgcmVuZGVyKCkge1xuICAgIHRoaXMubGF5ZXJzLmZvckVhY2goKGxheWVyKSA9PiB7XG4gICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLl9sYXllckNvbnRhaW5lck1hcC5nZXQobGF5ZXIpO1xuICAgICAgY29udGFpbmVyLmxheW91dEVsZW1lbnQuYXBwZW5kQ2hpbGQobGF5ZXIucmVuZGVyKCkpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqICBEcmF3IGFsbCB0aGUgbGF5ZXJzIGluIHRoZSB0aW1lbGluZVxuICAgKi9cbiAgZHJhdyhsYXllck9yR3JvdXAgPSBudWxsKSB7XG4gICAgY29uc3QgbGF5ZXJzID0gdGhpcy5fZ2V0TGF5ZXJzKGxheWVyT3JHcm91cCk7XG4gICAgbGF5ZXJzLmZvckVhY2goKGxheWVyKSA9PiBsYXllci5kcmF3KCkpO1xuICB9XG5cbiAgLyoqXG4gICAqICBVcGRhdGUgYWxsIHRoZSBsYXllcnMgaW4gdGhlIHRpbWVsaW5lXG4gICAqICBAVE9ETyBhY2NlcHQgc2V2ZXJhbCBgbGF5ZXJzYCBvciBgY2F0ZWdvcmllc2AgYXMgYXJndW1lbnRzID9cbiAgICovXG4gIHVwZGF0ZShsYXllck9yR3JvdXAgPSBudWxsKSB7XG4gICAgY29uc3QgbGF5ZXJzID0gdGhpcy5fZ2V0TGF5ZXJzKGxheWVyT3JHcm91cCk7XG5cbiAgICB0aGlzLnVwZGF0ZUNvbnRhaW5lcnMoKTtcbiAgICBsYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IGxheWVyLnVwZGF0ZSgpKTtcblxuICAgIHRoaXMuZW1pdCgndXBkYXRlJywgbGF5ZXJzKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVsaW5lO1xuIl19