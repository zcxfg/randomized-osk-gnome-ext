"use strict";
const { Gio, GObject } = imports.gi;
const Keyboard = imports.ui.keyboard;
const KeyboardModel = Keyboard.KeyboardModel;

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
      let mappings = level['rows'].flatMap((row) =>
        row.filter((btn) =>
          ((btn['strings'] || btn['action'] || btn).indexOf(' ') < 0)));
      random.shuffle(mappings);
      let rows_new = JSON.parse(JSON.stringify(level['rows']));
      let cursor = 0;
      level['rows'] = rows_new.map(row =>
        row.map((btn) =>
          ((btn['strings'] || btn['action'] || btn).indexOf(' ') < 0) ?
            mappings[cursor++] : btn));
    });
  },

  apply: function (_loadModel, thiz, args) {
    let groupName = args[0];
    let model = _loadModel(groupName);
    this.rearrange(model);
    return model;
  },
}

const backup_KeyboardModel__loadModel = KeyboardModel.prototype["_loadModel"];
const override_KeyboardModel__loadModel = 
  new Proxy(backup_KeyboardModel__loadModel, KeyboardModel_loadModel_Handler);

var enable = function() {
  KeyboardModel.prototype["_loadModel"] = override_KeyboardModel__loadModel;
}

var disable = function() {
  KeyboardModel.prototype["_loadModel"] = backup_KeyboardModel__loadModel;
}

var Randomizer = {
  enable,
  disable
}
