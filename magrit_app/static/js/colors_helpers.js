/**
* Helper function in order to have a colorbrewer color ramp with
* non-supported number of value using interpolation between the colorbrewer color
* to fit the requested number of classes.
* If the number of class fit the size of a colorbrewer ramp (3 < nb_class < 9)
* the genuine colorbrewer array is directly returned.
*
* @param {interger} nbClass - The number of classes/colors wanted.
* @param {integer} name - The name of the colorBrewer palette to use
* @return {array} - An array of color with the desired length
*/
const getColorBrewerArray = function getColorBrewerArray(nbClass, name) {
  if (nbClass < 10 && nbClass >= 3) {
    const colors = colorbrewer[name][nbClass];
    return colors;
  } else if (nbClass < 3) {
    const colors = colorbrewer[name][3];
    return [
      rgb2hex(interpolateColor(hexToRgb(colors[0]), hexToRgb(colors[1]))),
      rgb2hex(interpolateColor(hexToRgb(colors[1]), hexToRgb(colors[2]))),
    ];
  } else if (nbClass > 9 && nbClass < 18) {
    const colors = colorbrewer[name][9];
    const diff = nbClass - 9;
    return interp_n(colors, diff, 9);
  } else if (nbClass >= 18) {
    let colors = colorbrewer[name][9];
    colors = interp_n(colors, 8, 9);
    return interp_n(colors, nbClass - colors.length, nbClass);
  }
};

/**
* Function to make color interpolation from "colors" (an array of n colors)
* to a larger array of "k" colors (using same start and stop than the original)
*
* @param {array} colors - An array of colors
* @param {integer} diff -
* @param {number} k - The length of the targeted color palette
* @return {array} - An array of k colors.
*/
const interp_n = function interp_n(colors, diff, k) {
  const tmp = [];
  const new_colors = [];
  for (let i = 0; i < diff; ++i) {
    tmp.push(rgb2hex(interpolateColor(hexToRgb(colors[i]), hexToRgb(colors[i + 1]))));
  }
  for (let i = 0; i < k; ++i) {
    new_colors.push(colors[i]);
    if (tmp[i]) new_colors.push(tmp[i]);
  }
  return new_colors;
};

/**
* Convert rgb color to hexcode.
*
* @param {string} rgb - The RGB color.
* @return {string} - The color as an hexcode.
*
*/
function rgb2hex(rgb) {
// Originally from  http://jsfiddle.net/mushigh/myoskaos/
  if (typeof rgb === 'string') {
    if (rgb.indexOf('#') > -1 || rgb.indexOf('rgb') < 0) {
      return rgb;
    }
    const _rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (_rgb && _rgb.length === 4) ? `#${
      (`0${parseInt(_rgb[1], 10).toString(16)}`).slice(-2)
      }${(`0${parseInt(_rgb[2], 10).toString(16)}`).slice(-2)
      }${(`0${parseInt(_rgb[3], 10).toString(16)}`).slice(-2)}` : '';
  }
  return (rgb && rgb.length === 3) ? `#${
      (`0${parseInt(rgb[0], 10).toString(16)}`).slice(-2)
      }${(`0${parseInt(rgb[1], 10).toString(16)}`).slice(-2)
      }${(`0${parseInt(rgb[2], 10).toString(16)}`).slice(-2)}` : '';
}

/**
* Convert color hexcode to RGB code.
*
* @param {string} hex - The input hexcode.
* @param {string} out - The output format between "string" and "array"
* @return {string|array} - the rgb color as a string or as an array.
*
*/
function hexToRgb(hex, out) {
    // Originally from http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (out === 'string') {
    return res ? `rgb(${parseInt(res[1], 16)},${parseInt(res[2], 16)},${parseInt(res[3], 16)})` : null;
  }
  return res ? [parseInt(res[1], 16), parseInt(res[2], 16), parseInt(res[3], 16)] : null;
}

// Return the interpolated value at "factor" (0<factor<1) between color1 and color2
// (if no factor is provided the default value of 0.5 is used,
// corresponding to the middle between the two colors).
// Args :
//    - color1 : array of 3 integer for rgb color as [R, G, B]
//    - color2 : array of 3 integer for rgb color as [R, G, B]
const interpolateColor = (color1, color2, factor = 0.5) => {
  const result = color1.slice();
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return result;
};

// Just a "Colors" object with a convenience "random" method
// ... when a random color is needed (they aren't specialy pretty colors though!)
const Colors = {
  names: {
    aqua: '#00ffff',
    azure: '#f0ffff',
    beige: '#f5f5dc',
    black: '#000000',
    blue: '#0000ff',
    brown: '#a52a2a',
    cyan: '#00ffff',
    darkblue: '#00008b',
    darkcyan: '#008b8b',
    darkgrey: '#a9a9a9',
    darkgreen: '#006400',
    darkkhaki: '#bdb76b',
    darkmagenta: '#8b008b',
    darkolivegreen: '#556b2f',
    darkorange: '#ff8c00',
    darkorchid: '#9932cc',
    darkred: '#8b0000',
    darksalmon: '#e9967a',
    darkviolet: '#9400d3',
    fuchsia: '#ff00ff',
    gold: '#ffd700',
    green: '#008000',
    indigo: '#4b0082',
    khaki: '#f0e68c',
    lightblue: '#add8e6',
    lightcyan: '#e0ffff',
    lightgreen: '#90ee90',
    lightgrey: '#d3d3d3',
    lightpink: '#ffb6c1',
    lightyellow: '#ffffe0',
    lime: '#00ff00',
    magenta: '#ff00ff',
    maroon: '#800000',
    navy: '#000080',
    olive: '#808000',
    orange: '#ffa500',
    pink: '#ffc0cb',
    purple: '#800080',
    violet: '#800080',
    red: '#ff0000',
    silver: '#c0c0c0',
    white: '#ffffff',
    yellow: '#ffff00',
  },
  random() {
    const keys = Object.keys(this.names);
    const n = keys.length;
    let result = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const prop = keys[i];
      count += 1;
      if (Math.random() < 1 / count) {
        result = prop;
      }
    }
    return result;
  },
};

const ColorsSelected = {
    // These colors came from "Pastel1" and "Pastel2" coloramps from ColorBrewer
  colorCodes: ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc',
    '#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
  // In order to avoid randomly returning the same color
  // as the last one, at least for the first layers
  seen: new Set(),
  random(to_rgb = false) {
    const nb_color = this.colorCodes.length;
    let seen = this.seen;
    let result_color = this.colorCodes[0],
      attempts = 40; // To avoid a while(true) if it went wrong for any reason
    if (seen.size === nb_color) { seen = new Set(); }
    while (attempts > 0) {
      const ix = Math.round(Math.random() * (nb_color - 1));
      result_color = this.colorCodes[ix];
      if (!(seen.has(result_color))) {
        seen.add(result_color);
        break;
      } else {
        attempts -= 1;
      }
    }
    return to_rgb ? hexToRgb(result_color) : result_color;
  },
};

// Copy-paste from https://gist.github.com/jdarling/06019d16cb5fd6795edf
//   itself adapted from http://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
const randomColor = (function () {
  const golden_ratio_conjugate = 0.618033988749895;
  let _h = Math.random();

  const hslToRgb = function (h, s, l) {
    let r,
      g,
      b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return `#${Math.round(r * 255).toString(16)}${Math.round(g * 255).toString(16)}${Math.round(b * 255).toString(16)}`;
  };

  return function () {
    _h += golden_ratio_conjugate;
    _h %= 1;
    return hslToRgb(_h, 0.5, 0.60);
  };
}());

const addNewCustomPalette = function addNewCustomPalette(palette_name, colors) {
  _app.custom_palettes.set(palette_name, colors);
}
