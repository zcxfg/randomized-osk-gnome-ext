"use strict";
const { Gio, GObject } = imports.gi;
const Main = imports.ui.main;
const Keyboard = imports.ui.keyboard;
const KeyboardModel = Keyboard.KeyboardModel;
const KeyboardController = Keyboard.KeyboardController;

let updateOnReopen = false;
let updateOnType = false;

const SecureRandom = GObject.registerClass({
  GTypeName: "SecureRandom"
},
  class SecureRandom extends GObject.Object {
    _init() {
      super._init();
      this._pass = 3;
      this._randomSource = Gio.File.new_for_path("/dev/random");
      this._randomIStream = this._randomSource.read(null); // FileIStream
    }

    rand_uint8(from, until) {
      if (!this._randomIStream) {
        throw new Error("Fail to open the random source.");
      }
      let bytes = this._randomIStream.read_bytes(1, null); // GLib.Bytes
      let byte_array = bytes.unref_to_array(); // GLib.ByteArray
      let number = (Number)(byte_array[0]);
      return number % (until - from) + from;
    }

    shuffle(arr) {
      if (!arr instanceof Array) {
        throw new Error("shuffle() is only apply to arrays");
      }
      for (let i = 0; i < (this._pass * arr.length); ++i) {
        let x = this.rand_uint8(0, arr.length);
        let y = this.rand_uint8(0, arr.length);
        if (x != y) {
          let tmp = arr[x];
          arr[x] = arr[y];
          arr[y] = tmp;
        }
      }
    }
  }
)

const KeyboardModel_loadModel_Handler = {

  rearrange(keyboardModel) {
    let levels = keyboardModel['levels'];
    let random = new SecureRandom();
    levels.forEach(level => {
      // This nullity check is for solving incompatible json
      // format of keyboard layout accross multiple major versions.
      let mappings = level['rows'].flatMap(row => row.filter(btn =>
        (!btn['keyval']) &&
        (!btn['action']) &&
        (btn['strings'] || btn).indexOf(' ') < 0));
      random.shuffle(mappings);
      let rows_new = JSON.parse(JSON.stringify(level['rows']));
      let cursor = 0;
      level['rows'] = rows_new.map(row => row.map(btn =>
        (btn['keyval'] ||
          btn['action'] ||
          (btn['strings'] || btn).indexOf(' ') >= 0
        ) ? btn : mappings[cursor++]));
      });
  },

  apply: function (_loadModel, it, args) {
    let model = _loadModel.apply(it, args);
    this.rearrange(model);
    // log(JSON.stringify(model));
    return model;
  },
}

const KeyboardController_commitString_Handler = {
  apply: function (commitString, it, args) {
    let res = commitString.apply(it, args);
    // start of post-execution
    (async function() {
      let _keyboard = Main.keyboard?._keyboard;
      if (!_keyboard) {
        return false;
      }
      let latched = _keyboard._latched;
      let level = _keyboard._activeLayer;
      // log(`latched: ${latched}, level: ${level}`);
      // notify redraw
      it._onSourcesModified();
      // restore page level and latch state
      _keyboard._setActiveLayer(level);
      _keyboard._latched = latched;
      _keyboard._setCurrentLevelLatched(_keyboard._currentPage, latched);
    })();
    return res;
  }
}

const Keyboard__setActiveLayer_Handler = {
  apply: function (_setActiveLayer, it, args) {
    it._activeLayer = args[0];
    // end of pre-execution
    _setActiveLayer.apply(it, args);
  }
}

const Keyboard_open_Handler = {
  apply: function (open, it, args) {
    // end of pre-execution
    open.apply(it, args);
    (async function() {
      it._keyboardController._onSourcesModified();
    })();
  }
}

const backup_KeyboardModel__loadModel = KeyboardModel.prototype["_loadModel"];
const override_KeyboardModel__loadModel =
  new Proxy(backup_KeyboardModel__loadModel, KeyboardModel_loadModel_Handler);

const backup_Keyboard__setActiveLayer = Keyboard.Keyboard.prototype["_setActiveLayer"];
const override_Keyboard__setActiveLayer =
  new Proxy(backup_Keyboard__setActiveLayer, Keyboard__setActiveLayer_Handler);

const backup_Keyboard_open = Keyboard.Keyboard.prototype["open"];
const override_Keyboard_open =
  new Proxy(backup_Keyboard_open, Keyboard_open_Handler);

const backup_KeyboardController_commitString = KeyboardController.prototype["commitString"];
const override_KeyboardController_commitString =
  new Proxy(backup_KeyboardController_commitString, KeyboardController_commitString_Handler);

var setEnable = function (enable = false, updateOnReopen = false, updateOnType = false) {
  KeyboardModel.prototype["_loadModel"] = backup_KeyboardModel__loadModel;
  Keyboard.Keyboard.prototype["_setActiveLayer"] = backup_Keyboard__setActiveLayer;
  Keyboard.Keyboard.prototype["open"] = backup_Keyboard_open;
  KeyboardController.prototype["commitString"] = backup_KeyboardController_commitString;
  if (enable) {
    KeyboardModel.prototype["_loadModel"] = override_KeyboardModel__loadModel;
    Keyboard.Keyboard.prototype["_setActiveLayer"] = override_Keyboard__setActiveLayer;
    if (updateOnReopen) {
      Keyboard.Keyboard.prototype["open"] = override_Keyboard_open;
    }
    if (updateOnType) {
      KeyboardController.prototype["commitString"] = override_KeyboardController_commitString;
    }
  }
}

var Randomizer = { setEnable }
