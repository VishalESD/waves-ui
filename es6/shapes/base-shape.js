const ns = require('../core/namespace');

// @NOTE what about an `EntityShape` and a `CollectionShape`

class BaseShape {
  /*
    remove all references in constructor
    add all necessary arguments todraw and create
    rename:
      _getAccessorList
      create => render
      draw => update
  */
  /**
   *
   */
  constructor(options = {}) {
    this.shape = null;
    this.ns = ns;
    this.params = Object.assign({}, this._getDefaults(), options);

    const accessors = this._getAccessorList();
    this._createAccessors(accessors);
    this._setDefaultAccessors(accessors);
  }

  _getDefaults() {
    return {};
  }

  /**
   *  clean references, is called from the `layer
   */
  destroy() {
    // this.group = null;
    this.shape = null;
  }

  /**
   * @return <String> the name of the shape, used as a class in the element group
   */
  getClassName() { return 'shape'; }

  // should only be called once
  // setSvgDefinition(defs) {}

  /**
   * @TODO rename
   * @return <Object>
   *    keys are the accessors methods names to create
   *    values are the default values for each given accessor
   */
  _getAccessorList() { return {}; }


  /**
   *  install the given accessors on the shape
   */
  install(accessors) {
    for (let key in accessors) { this[key] = accessors[key]; }
  }

  /**
   * generic method to create accessors
   * adds accessor to the prototype if not already present
   */
  _createAccessors(names) {
    this._accessors = {};
    // add it to the prototype
    const proto = Object.getPrototypeOf(this);
    // create a getter / setter for each accessors
    // setter : `this.x = callback`
    // getter : `this.x(datum)`
    Object.keys(names).forEach((name) => {
      if (proto.hasOwnProperty(name)) { return; }

      Object.defineProperty(proto, name, {
        get: function() { return this._accessors[name]; },
        set: function(func) {
          this._accessors[name] = func;
        }
      });
    });
  }

  /**
   * create a function to be used as a default
   * accessor for each accesors
   */
  _setDefaultAccessors(names) {
    Object.keys(names).forEach((name) => {
      const defaultValue = names[name];
      let accessor = function(d, v = null) {
        if (v === null) { return d[name] || defaultValue; }
        d[name] = v;
      }
      // set accessor as the default one
      this[name] = accessor;
    });
  }

  /**
   * // @param  context <Context> the context the layer which owns this item
   * @return  <DOMElement> the DOM element to insert in the item's group
   */
  render() {}

  /**
   * @param  group <DOMElement> group of the item in which the shape is drawn
   * @param  context <Context> the context the layer which owns this item
   * @param
   *    simpleShape : datum <Object> the datum related to this item's group
   *    commonShape : datum <Array> the associated to the Layer
   * @param
   *    simpleShape : index <Number> the current index of the datum
   *    commonShape : undefined
   * @return  void
   */
  update(context, group, datum, index) {}

  // move(dx, dy, datum, context) {}

  /**
   *  define if the shape is considered to be the given area
   *  arguments are passed in domain unit (time, whatever)
   *  @return <Boolean>
   */
  inArea(context, datum, x1, y1, x2, y2) {}
}

module.exports = BaseShape;
